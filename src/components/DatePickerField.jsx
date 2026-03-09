import { useState } from 'react'

const MONTH_NAMES = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

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
  const selectedYear = parsed.year
  const selectedMonth = parsed.month
  const selectedDay = parsed.day

  const yearNow = new Date().getFullYear()
  const yearStart = Math.min(yearNow - 2, selectedYear - 5)
  const yearEnd = Math.max(yearNow + 5, selectedYear + 5)

  const monthDays = daysInMonth(selectedYear, selectedMonth)

  function updateDate(nextYear, nextMonth, nextDay) {
    const validDay = Math.min(nextDay, daysInMonth(nextYear, nextMonth))
    onChange(`${nextYear}-${pad2(nextMonth)}-${pad2(validDay)}`)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">{mode === 'wheel' ? 'Apple scroll' : 'Standaard datumkiezer'}</p>
        <button
          type="button"
          onClick={() => setMode(prev => prev === 'wheel' ? 'native' : 'wheel')}
          className="text-xs text-accent-mint font-medium hover:underline"
        >
          {mode === 'wheel' ? 'Standaard datumkiezer' : 'Apple scroll kiezen'}
        </button>
      </div>

      {mode === 'wheel' ? (
        <div className="grid grid-cols-3 gap-2">
          <select
            value={selectedDay}
            onChange={e => updateDate(selectedYear, selectedMonth, Number(e.target.value))}
            className="input-field py-3"
          >
            {Array.from({ length: monthDays }, (_, i) => i + 1).map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={e => updateDate(selectedYear, Number(e.target.value), selectedDay)}
            className="input-field py-3"
          >
            {MONTH_NAMES.map((month, idx) => (
              <option key={month} value={idx + 1}>{month}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={e => updateDate(Number(e.target.value), selectedMonth, selectedDay)}
            className="input-field py-3"
          >
            {Array.from({ length: yearEnd - yearStart + 1 }, (_, i) => yearStart + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      ) : (
        <input
          id="native-date-picker"
          type="date"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="input-field w-full max-w-full min-w-0"
        />
      )}

      <p className="text-xs text-gray-400 capitalize">{formatDateLabel(value)}</p>
    </div>
  )
}
