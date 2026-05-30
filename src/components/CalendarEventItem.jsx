export default function CalendarEventItem({ event, compact = false }) {
  const timeLabel = event.all_day
    ? 'Hele dag'
    : formatTimeRange(event.start_at, event.end_at)

  const classes = compact
    ? 'w-full bg-sky-50/90 rounded px-2 py-1.5 text-sm text-left border border-sky-100'
    : 'w-full bg-sky-50/80 rounded-xl px-3 py-2.5 text-left border border-sky-100'

  return (
    <div className={classes}>
      <div className="flex items-start gap-2">
        <span className={compact ? 'text-sm' : 'text-lg'}>📅</span>
        <div className="min-w-0 flex-1">
          <span className={`block whitespace-normal ${compact ? 'font-medium text-gray-700' : 'text-gray-700 font-medium'}`}>
            {event.title}
          </span>
          <span className="text-xs text-sky-700 block mt-0.5">{timeLabel}</span>
          {event.location && <span className="text-xs text-gray-500 block mt-0.5">{event.location}</span>}
        </div>
      </div>
    </div>
  )
}

function formatTimeRange(startAt, endAt) {
  if (!startAt) return 'Tijd onbekend'
  const start = new Date(startAt)
  const end = endAt ? new Date(endAt) : null
  const startLabel = start.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  if (!end) return startLabel
  const endLabel = end.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  return `${startLabel} - ${endLabel}`
}
