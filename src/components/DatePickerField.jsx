import { useEffect, useMemo, useState } from 'react'
import Picker from 'react-mobile-picker'

const MONTH_NAMES = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']

function pad2(v) {
  return String(v).padStart(2, '0')
}

function parseDate(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    if (y >= 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d }
    }
  }

  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  }
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function formatDateLabel(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function DatePickerField({ value, onChange }) {
  const [mode, setMode] = useState('wheel')
  const [tickPulse, setTickPulse] = useState(0)
  const parsed = parseDate(value)
  const [pickerValue, setPickerValue] = useState(() => ({
    day: String(parsed.day),
    month: String(parsed.month),
    year: String(parsed.year),
  }))

  useEffect(() => {
    setPickerValue({
      day: String(parsed.day),
      month: String(parsed.month),
      year: String(parsed.year),
    })
  }, [value])

  const selectedYear = Number(pickerValue.year)
  const selectedMonth = Number(pickerValue.month)
  const selectedDay = Number(pickerValue.day)

  const yearNow = new Date().getFullYear()
  const yearStart = Math.min(yearNow - 2, selectedYear - 5)
  const yearEnd = Math.max(yearNow + 5, selectedYear + 5)

  const monthDays = daysInMonth(selectedYear, selectedMonth)

  function updateDate(nextYear, nextMonth, nextDay) {
    const validDay = Math.min(nextDay, daysInMonth(nextYear, nextMonth))
    onChange(`${nextYear}-${pad2(nextMonth)}-${pad2(validDay)}`)
  }

  const monthOptions = useMemo(
    () => MONTH_NAMES.map((month, idx) => ({ value: String(idx + 1), label: month })),
    []
  )

  const dayOptions = useMemo(
    () => Array.from({ length: monthDays }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
    [monthDays]
  )

  const yearOptions = useMemo(
    () => Array.from({ length: yearEnd - yearStart + 1 }, (_, i) => ({ value: String(yearStart + i), label: String(yearStart + i) })),
    [yearEnd, yearStart]
  )

  const liveLabel = useMemo(() => {
    const clampedDay = Math.min(selectedDay, daysInMonth(selectedYear, selectedMonth))
    const dateStr = `${selectedYear}-${pad2(selectedMonth)}-${pad2(clampedDay)}`
    return formatDateLabel(dateStr)
  }, [selectedDay, selectedMonth, selectedYear])

  const liveWeekdayShort = useMemo(() => {
    const clampedDay = Math.min(selectedDay, daysInMonth(selectedYear, selectedMonth))
    const d = new Date(`${selectedYear}-${pad2(selectedMonth)}-${pad2(clampedDay)}T12:00:00`)
    return d.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '').toLowerCase()
  }, [selectedDay, selectedMonth, selectedYear])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">{mode === 'wheel' ? 'Apple scroll' : 'Standaard datumkiezer'}</p>
        <button
          type="button"
          onClick={() => setMode(prev => prev === 'wheel' ? 'native' : 'wheel')}
          className="h-8 w-8 rounded-lg border border-pastel-creamDark bg-white text-gray-500 hover:bg-pastel-cream/60 transition-colors flex items-center justify-center"
          aria-label={mode === 'wheel' ? 'Schakel naar standaard datumkiezer' : 'Schakel naar Apple scroll picker'}
          title={mode === 'wheel' ? 'Standaard datumkiezer' : 'Apple scroll kiezen'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8 2v4M16 2v4M3 10h18" />
          </svg>
        </button>
      </div>

      {mode === 'wheel' ? (
        <div
          className="rounded-2xl border border-pastel-creamDark bg-white px-2 py-2"
          style={{ overscrollBehavior: 'contain' }}
          onTouchMove={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="flex items-stretch gap-2">
            <div className="w-12 flex-shrink-0 flex items-center justify-center rounded-lg bg-gradient-to-br from-accent-mint to-pastel-mintDark text-sm font-bold text-white shadow-soft uppercase tracking-wide">
              {liveWeekdayShort}
            </div>
            <div className="relative flex-1" style={{ overscrollBehavior: 'contain' }}>
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-9 -translate-y-1/2 rounded-lg border border-accent-mint/30 bg-pastel-mint/20" />
              <div key={tickPulse} className="pointer-events-none absolute inset-x-0 top-1/2 h-9 -translate-y-1/2 rounded-lg border border-accent-mint/40 animate-picker-tick" />
              <Picker
                value={pickerValue}
                onChange={(next) => {
                  const nextYear = Number(next.year)
                  const nextMonth = Number(next.month)
                  const nextDay = Number(next.day)
                  const clampedDay = Math.min(nextDay, daysInMonth(nextYear, nextMonth))
                  const nextState = {
                    day: String(clampedDay),
                    month: String(nextMonth),
                    year: String(nextYear),
                  }
                  setPickerValue(nextState)
                  updateDate(nextYear, nextMonth, clampedDay)
                  setTickPulse(v => v + 1)
                  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                    navigator.vibrate(8)
                  }
                }}
                height={180}
                itemHeight={36}
                wheelMode="natural"
                className="flex items-center"
              >
                <Picker.Column name="day" className="flex-1 text-center">
                  {dayOptions.map((opt) => (
                    <Picker.Item key={opt.value} value={opt.value} className="text-center text-gray-400">
                      {({ selected }) => (
                        <div className={`text-base transition-colors ${selected ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>
                          {opt.label}
                        </div>
                      )}
                    </Picker.Item>
                  ))}
                </Picker.Column>

                <Picker.Column name="month" className="flex-[1.4] text-center">
                  {monthOptions.map((opt) => (
                    <Picker.Item key={opt.value} value={opt.value} className="text-center text-gray-400">
                      {({ selected }) => (
                        <div className={`text-sm transition-colors ${selected ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>
                          {opt.label}
                        </div>
                      )}
                    </Picker.Item>
                  ))}
                </Picker.Column>

                <Picker.Column name="year" className="flex-1 text-center">
                  {yearOptions.map((opt) => (
                    <Picker.Item key={opt.value} value={opt.value} className="text-center text-gray-400">
                      {({ selected }) => (
                        <div className={`text-base transition-colors ${selected ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>
                          {opt.label}
                        </div>
                      )}
                    </Picker.Item>
                  ))}
                </Picker.Column>
              </Picker>
            </div>
          </div>
        </div>
      ) : (
        <input
          type="date"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="input-field w-full max-w-full min-w-0"
        />
      )}

      <p className="text-xs text-gray-400 capitalize">{mode === 'wheel' ? liveLabel : formatDateLabel(value)}</p>
    </div>
  )
}
