export const DEFAULT_SYNC_PAST_DAYS = 30
export const DEFAULT_SYNC_FUTURE_DAYS = 180

export function toDateString(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : fallback
}

export function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'boolean') return value
  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes'].includes(normalized)) return true
  if (['0', 'false', 'no'].includes(normalized)) return false
  return fallback
}

export function startOfDay(date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

export function addDays(date, amount) {
  const value = new Date(date)
  value.setDate(value.getDate() + amount)
  return value
}

export function formatOccurrenceInstance(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function readSecret(secretName) {
  if (!secretName) return null
  return process.env[secretName] || null
}

export function calendarEventSortValue(event) {
  return event.start_at || event.start_date || ''
}

export function isEventOnDate(event, dateStr) {
  if (event.all_day) {
    const start = event.start_date
    const end = event.end_date || event.start_date
    return !!start && start <= dateStr && dateStr <= end
  }

  const start = toDateString(event.start_at)
  const end = toDateString(event.end_at || event.start_at)
  return !!start && start <= dateStr && dateStr <= end
}
