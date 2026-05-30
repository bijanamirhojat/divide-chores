import { getCalendarProvider } from './providers/index.js'
import {
  DEFAULT_SYNC_FUTURE_DAYS,
  DEFAULT_SYNC_PAST_DAYS,
} from './utils.js'
import {
  listCalendarSources,
  markMissingCalendarEventsDeleted,
  markSourceSyncResult,
  markSourceSyncStart,
  upsertCalendarEvents,
} from './store.js'

function sanitizeError(error) {
  return error?.message ? String(error.message) : 'Unknown sync error'
}

export async function syncCalendarSources(db, options = {}) {
  const sourceFilters = { syncEnabled: true }
  if (options.provider) sourceFilters.provider = options.provider

  const { data: sources, error } = await listCalendarSources(db, sourceFilters)
  if (error) throw error

  const filteredSources = (sources || []).filter((source) => !options.sourceId || source.id === options.sourceId)
  const results = []

  for (const source of filteredSources) {
    await markSourceSyncStart(db, source.id)

    try {
      const provider = getCalendarProvider(source)
      const fetchedEvents = await provider.fetchEvents({
        pastDays: options.pastDays ?? source.sync_past_days ?? DEFAULT_SYNC_PAST_DAYS,
        futureDays: options.futureDays ?? source.sync_future_days ?? DEFAULT_SYNC_FUTURE_DAYS,
      })

      const syncedAt = new Date().toISOString()
      const eventsToUpsert = fetchedEvents.map((event) => ({
        ...event,
        last_synced_at: syncedAt,
        updated_at: syncedAt,
      }))

      const { error: upsertError } = await upsertCalendarEvents(db, eventsToUpsert)
      if (upsertError) throw upsertError

      const deletionResult = await markMissingCalendarEventsDeleted(db, source.id, fetchedEvents)
      if (deletionResult.error) throw deletionResult.error

      const status = deletionResult.count > 0 ? 'partial' : 'success'
      await markSourceSyncResult(db, source.id, { status, error: null })

      results.push({
        source_id: source.id,
        display_name: source.display_name,
        provider: source.provider,
        fetched_count: fetchedEvents.length,
        deleted_count: deletionResult.count,
        status,
      })
    } catch (syncError) {
      const errorMessage = sanitizeError(syncError)
      await markSourceSyncResult(db, source.id, { status: 'error', error: errorMessage })
      results.push({
        source_id: source.id,
        display_name: source.display_name,
        provider: source.provider,
        fetched_count: 0,
        deleted_count: 0,
        status: 'error',
        error: errorMessage,
      })
    }
  }

  return {
    source_count: filteredSources.length,
    synced_count: results.filter((result) => result.status !== 'error').length,
    error_count: results.filter((result) => result.status === 'error').length,
    results,
  }
}
