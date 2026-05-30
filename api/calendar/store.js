import { toDateString } from './utils.js'

function chunk(items, size) {
  const result = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

function buildIdentity(event) {
  return `${event.provider}::${event.source_id}::${event.external_event_id}::${event.recurrence_instance_id || ''}`
}

export async function listCalendarSources(db, filters = {}) {
  let query = db.from('calendar_sources').select('*').order('display_name')
  if (filters.provider) query = query.eq('provider', filters.provider)
  if (filters.syncEnabled !== undefined) query = query.eq('sync_enabled', filters.syncEnabled)
  return query
}

export async function markSourceSyncStart(db, sourceId) {
  return db
    .from('calendar_sources')
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: 'idle',
      last_sync_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sourceId)
}

export async function markSourceSyncResult(db, sourceId, result) {
  return db
    .from('calendar_sources')
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: result.status,
      last_sync_error: result.error || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sourceId)
}

export async function upsertCalendarEvents(db, events) {
  if (!events.length) return { data: [], error: null }
  return db
    .from('calendar_events')
    .upsert(events, {
      onConflict: 'provider,source_id,external_event_id,recurrence_instance_id',
    })
    .select('id, provider, source_id, external_event_id, recurrence_instance_id')
}

export async function markMissingCalendarEventsDeleted(db, sourceId, activeEvents) {
  const { data: existingRows, error } = await db
    .from('calendar_events')
    .select('id, provider, source_id, external_event_id, recurrence_instance_id')
    .eq('source_id', sourceId)
    .eq('is_deleted', false)

  if (error) return { count: 0, error }

  const activeKeys = new Set(activeEvents.map(buildIdentity))
  const toDelete = (existingRows || [])
    .filter((row) => !activeKeys.has(buildIdentity(row)))
    .map((row) => row.id)

  if (!toDelete.length) return { count: 0, error: null }

  let deletedCount = 0
  for (const group of chunk(toDelete, 100)) {
    const { error: updateError } = await db
      .from('calendar_events')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      })
      .in('id', group)

    if (updateError) {
      return { count: deletedCount, error: updateError }
    }
    deletedCount += group.length
  }

  return { count: deletedCount, error: null }
}

export async function listCalendarEvents(db, filters = {}) {
  let query = db
    .from('calendar_events')
    .select('*, calendar_sources(id, display_name, provider)')
    .order('start_at', { ascending: true })
    .order('start_date', { ascending: true })

  if (filters.provider) query = query.eq('provider', filters.provider)
  if (filters.sourceId) query = query.eq('source_id', filters.sourceId)
  if (filters.includeDeleted !== true) query = query.eq('is_deleted', false)

  const { data, error } = await query
  if (error) return { data: null, error }

  const filtered = (data || []).filter((event) => {
    const eventStartDate = event.all_day ? event.start_date : toDateString(event.start_at)
    if (!eventStartDate) return false
    if (filters.startDate && eventStartDate < filters.startDate) return false
    if (filters.endDate && eventStartDate > filters.endDate) return false
    return true
  })

  return { data: filtered, error: null }
}
