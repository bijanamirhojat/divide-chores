import { useEffect, useMemo, useState } from 'react'
import { WheelPicker, WheelPickerWrapper } from '@ncdai/react-wheel-picker'
import '@ncdai/react-wheel-picker/style.css'

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
  const parsed = parseDate(value)
  const [pickerValue, setPickerValue] = useState(() => ({
    day: parsed.day,
    month: parsed.month,
    year: parsed.year,
  }))

  useEffect(() => {
    setPickerValue({
      day: parsed.day,
      month: parsed.month,
      year: parsed.year,
    })
  }, [value])

  const selectedYear = pickerValue.year
  const selectedMonth = pickerValue.month
  const selectedDay = pickerValue.day

  const yearNow = new Date().getFullYear()
  const yearStart = Math.min(yearNow - 2, selectedYear - 5)
  const yearEnd = Math.max(yearNow + 5, selectedYear + 5)

  const monthDays = daysInMonth(selectedYear, selectedMonth)

  const monthOptions = useMemo(() => MONTH_NAMES.map((month, idx) => ({ value: idx + 1, label: month })), [])

  const dayOptions = useMemo(
    () => Array.from({ length: monthDays }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
    [monthDays]
  )

  const yearOptions = useMemo(
    () => Array.from({ length: yearEnd - yearStart + 1 }, (_, i) => ({ value: yearStart + i, label: String(yearStart + i) })),
    [yearEnd, yearStart]
  )

  function commitNext(next) {
    const clampedDay = Math.min(next.day, daysInMonth(next.year, next.month))
    const normalized = {
      day: clampedDay,
      month: next.month,
      year: next.year,
    }
    setPickerValue(normalized)
    onChange(`${normalized.year}-${pad2(normalized.month)}-${pad2(normalized.day)}`)
  }

  useEffect(() => {
    if (selectedDay > monthDays) {
      commitNext({
        day: monthDays,
        month: selectedMonth,
        year: selectedYear,
      })
    }
  }, [monthDays, selectedDay, selectedMonth, selectedYear])

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
        <div className="rounded-2xl border border-pastel-creamDark bg-white px-2 py-2" style={{ overscrollBehavior: 'contain' }}>
          <div className="flex items-stretch gap-2">
            <div className="w-12 flex-shrink-0 flex items-center justify-center rounded-lg bg-gradient-to-br from-accent-mint to-pastel-mintDark text-sm font-bold text-white shadow-soft uppercase tracking-wide">
              {liveWeekdayShort}
            </div>
            <div className="relative flex-1" style={{ overscrollBehavior: 'contain' }}>
              <WheelPickerWrapper className="h-[180px]">
                <WheelPicker
                  options={dayOptions}
                  value={selectedDay}
                  onValueChange={(day) => commitNext({ day, month: selectedMonth, year: selectedYear })}
                  infinite={false}
                  optionItemHeight={36}
                  visibleCount={20}
                  dragSensitivity={4}
                  scrollSensitivity={4}
                  classNames={{
                    optionItem: 'text-gray-400 text-base transition-colors',
                    highlightItem: 'text-gray-800 font-semibold text-base',
                    highlightWrapper: 'h-9 bg-pastel-mint/20 border-y border-l border-accent-mint/30 rounded-l-lg',
                  }}
                />
                <WheelPicker
                  options={monthOptions}
                  value={selectedMonth}
                  onValueChange={(month) => commitNext({ day: selectedDay, month, year: selectedYear })}
                  infinite={false}
                  optionItemHeight={36}
                  visibleCount={20}
                  dragSensitivity={4}
                  scrollSensitivity={4}
                  classNames={{
                    optionItem: 'text-gray-400 text-sm transition-colors',
                    highlightItem: 'text-gray-800 font-semibold text-sm',
                    highlightWrapper: 'h-9 bg-pastel-mint/20 border-y border-accent-mint/30',
                  }}
                />
                <WheelPicker
                  options={yearOptions}
                  value={selectedYear}
                  onValueChange={(year) => commitNext({ day: selectedDay, month: selectedMonth, year })}
                  infinite={false}
                  optionItemHeight={36}
                  visibleCount={20}
                  dragSensitivity={4}
                  scrollSensitivity={4}
                  classNames={{
                    optionItem: 'text-gray-400 text-base transition-colors',
                    highlightItem: 'text-gray-800 font-semibold text-base',
                    highlightWrapper: 'h-9 bg-pastel-mint/20 border-y border-r border-accent-mint/30 rounded-r-lg',
                  }}
                />
              </WheelPickerWrapper>
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
