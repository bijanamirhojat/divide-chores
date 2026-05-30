import { fetchCalDavEvents } from './caldav.js'

export function getCalendarProvider(source) {
  if (source.provider === 'icloud' || source.provider === 'caldav') {
    return {
      fetchEvents: (options) => fetchCalDavEvents(source, options),
    }
  }

  throw new Error(`Unsupported calendar provider: ${source.provider}`)
}
