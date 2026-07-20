import ical from 'node-ical'
import { addDays, formatOccurrenceInstance, readSecret, startOfDay } from '../utils.js'

function normalizeSyncUrl(syncUrl) {
  if (!syncUrl) return null
  if (syncUrl.startsWith('webcal://')) {
    return `https://${syncUrl.slice('webcal://'.length)}`
  }
  return syncUrl
}

function isPublicWebCalUrl(syncUrl) {
  return typeof syncUrl === 'string' && syncUrl.startsWith('webcal://')
}

function normalizeAttendees(attendees) {
  if (!attendees) return []
  const list = Array.isArray(attendees) ? attendees : Object.values(attendees)
  return list
    .map((attendee) => {
      if (!attendee) return null
      return {
        name: attendee.params?.CN || attendee.name || null,
        email: attendee.val || attendee.email || null,
        role: attendee.params?.ROLE || null,
        status: attendee.params?.PARTSTAT || null,
      }
    })
    .filter(Boolean)
}

function formatDateOnlyValue(value) {
  if (!value) return null
  // node-ical maakt date-only (all-day) waardes aan op LOKALE middernacht van de
  // bedoelde kalenderdag. Lees de datum daarom uit met lokale getters: dat geeft
  // exact de ICS-datum terug, ongeacht de timezone van de server. (Met getUTC* of
  // een +1-dag-correctie klopt het maar op één specifieke server-timezone en staat
  // het op andere timezones een dag verkeerd.)
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function subtractOneDayFromDateString(dateStr) {
  if (!dateStr) return null
  const date = new Date(`${dateStr}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeEvent(item, source) {
  const isAllDay = item.datetype === 'date'
  const startAt = !isAllDay && item.start ? item.start.toISOString() : null
  const endAt = !isAllDay && item.end ? item.end.toISOString() : null
  const startDate = isAllDay && item.start ? formatDateOnlyValue(item.start) : null
  const endDate = isAllDay && item.end
    ? (() => {
        const rawEndExclusiveDate = formatDateOnlyValue(item.end)
        return rawEndExclusiveDate === startDate ? rawEndExclusiveDate : subtractOneDayFromDateString(rawEndExclusiveDate)
      })()
    : startDate
  const safeEndDate = isAllDay && startDate && endDate && endDate < startDate ? startDate : endDate
  const recurrenceInstanceId = formatOccurrenceInstance(item.recurrenceid) || ''
  const externalEventId = recurrenceInstanceId ? `${item.uid}:${recurrenceInstanceId}` : item.uid

  return {
    source_id: source.id,
    provider: source.provider,
    external_event_id: externalEventId,
    external_uid: item.uid || externalEventId,
    recurrence_instance_id: recurrenceInstanceId,
    calendar_name: source.display_name,
    title: item.summary || '(Zonder titel)',
    description: item.description || null,
    location: item.location || null,
    start_at: startAt,
    end_at: endAt,
    start_date: startDate,
    end_date: safeEndDate,
    all_day: isAllDay,
    timezone: item.timezone || item.start?.tz || null,
    attendees: normalizeAttendees(item.attendee),
    status: item.status ? String(item.status).trim().toLowerCase() : 'confirmed',
    is_cancelled: String(item.status || '').toUpperCase() === 'CANCELLED',
    is_deleted: false,
    raw_payload: item,
  }
}

function expandRecurringEvent(item, windowStart, windowEnd) {
  if (!item.rrule) return [item]

  const between = item.rrule.between(windowStart, windowEnd, true)
  if (!between.length) return []

  return between.map((occurrenceStart) => {
    const durationMs = item.end instanceof Date && item.start instanceof Date
      ? item.end.getTime() - item.start.getTime()
      : 0
    if (item.datetype === 'date') {
      occurrenceStart.dateOnly = true
    }
    const occurrenceEnd = durationMs > 0 ? new Date(occurrenceStart.getTime() + durationMs) : occurrenceStart
    if (item.datetype === 'date') {
      occurrenceEnd.dateOnly = true
    }
    const occurrence = {
      ...item,
      start: occurrenceStart,
      end: occurrenceEnd,
      recurrenceid: occurrenceStart,
    }
    return occurrence
  })
}

export async function fetchCalDavEvents(source, options = {}) {
  const password = readSecret(source.secret_name)
  const syncUrl = normalizeSyncUrl(source.sync_url)
  const isPublicFeed = isPublicWebCalUrl(source.sync_url)
  if (!source.sync_url) {
    throw new Error(`Calendar source ${source.display_name} is missing sync_url`)
  }
  if (!isPublicFeed && !source.username) {
    throw new Error(`Calendar source ${source.display_name} is missing username`)
  }
  if (!isPublicFeed && source.secret_name && !password) {
    throw new Error(`Calendar source ${source.display_name} is missing secret ${source.secret_name}`)
  }

  const today = startOfDay(new Date())
  const windowStart = addDays(today, -(options.pastDays ?? source.sync_past_days ?? 30))
  const windowEnd = addDays(today, options.futureDays ?? source.sync_future_days ?? 180)
  const requestOptions = !isPublicFeed && source.username && password
    ? { username: source.username, password }
    : {}
  const items = await ical.async.fromURL(syncUrl, requestOptions)

  return Object.values(items)
    .filter((item) => item?.type === 'VEVENT')
    .flatMap((item) => expandRecurringEvent(item, windowStart, windowEnd))
    .filter((item) => {
      const start = item.start instanceof Date ? item.start : null
      const end = item.end instanceof Date ? item.end : start
      if (!start) return false
      return end >= windowStart && start <= windowEnd
    })
    .map((item) => normalizeEvent(item, source))
}
