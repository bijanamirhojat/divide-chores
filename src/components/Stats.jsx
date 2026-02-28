import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AnimatedOverlay from './AnimatedOverlay'

const PERIODS = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Maand' },
  { key: 'year', label: 'Jaar' },
  { key: 'all', label: 'Alle' },
]

export default function Stats({ show, onClose, users }) {
  const [period, setPeriod] = useState('week')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [weeklyHistory, setWeeklyHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    if (show) loadStats()
  }, [period, show])

  useEffect(() => {
    if (show) loadWeeklyHistory()
  }, [show])

  async function loadStats() {
    setLoading(true)
    const now = new Date()
    let query = supabase
      .from('completed_tasks')
      .select('*, tasks(title, day_of_week), users(name, avatar_url)')

    if (period === 'week') {
      const weekNum = getWeekNumber(now)
      const year = now.getFullYear()
      query = query.eq('week_number', weekNum).eq('year', year)
    } else if (period === 'month') {
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const startOfMonth = new Date(year, now.getMonth(), 1)
      const endOfMonth = new Date(year, now.getMonth() + 1, 0)
      const startWeek = getWeekNumber(startOfMonth)
      const endWeek = getWeekNumber(endOfMonth)
      
      if (startWeek <= endWeek) {
        query = query.eq('year', year).gte('week_number', startWeek).lte('week_number', endWeek)
      } else {
        query = query.eq('year', year).gte('week_number', startWeek)
          .or(`week_number.lte.${endWeek},year.lt.${year}`)
      }
    } else if (period === 'year') {
      query = query.eq('year', now.getFullYear())
    }

    const { data } = await query.order('completed_at', { ascending: false })

    if (data) {
      const totalTasks = data.length
      const tasksByUser = {}
      const taskCounts = {}

      users.forEach(u => {
        tasksByUser[u.id] = { name: u.name, avatar_url: u.avatar_url, count: 0 }
      })

      data.forEach(ct => {
        if (ct.user_id && tasksByUser[ct.user_id]) {
          tasksByUser[ct.user_id].count++
        }

        if (ct.tasks?.title) {
          taskCounts[ct.tasks.title] = (taskCounts[ct.tasks.title] || 0) + 1
        }
      })

      const topTasks = Object.entries(taskCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([title, count]) => ({ title, count }))

      let winner = null
      let maxCount = 0
      users.forEach(u => {
        const count = tasksByUser[u.id]?.count || 0
        if (count > maxCount) {
          maxCount = count
          winner = { ...tasksByUser[u.id], id: u.id }
        }
      })

      const userStats = users.map(u => ({
        id: u.id,
        name: u.name,
        avatar_url: tasksByUser[u.id]?.avatar_url || u.avatar_url,
        count: tasksByUser[u.id]?.count || 0,
        percentage: totalTasks > 0 ? Math.round((tasksByUser[u.id]?.count || 0) / totalTasks * 100) : 0,
      })).sort((a, b) => b.count - a.count)

      setStats({
        total: totalTasks,
        winner,
        userStats,
        topTasks,
      })
    }

    setLoading(false)
  }

  function getWeekNumber(date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  }

  function getWeekDateRange(weekNum, year) {
    // Get Monday of ISO week
    const jan4 = new Date(year, 0, 4)
    const dayOfWeek = jan4.getDay() || 7
    const monday = new Date(jan4)
    monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNum - 1) * 7)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    
    const fmt = (d) => d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
    return `${fmt(monday)} - ${fmt(sunday)}`
  }

  async function loadWeeklyHistory() {
    setLoadingHistory(true)
    
    const { data } = await supabase
      .from('completed_tasks')
      .select('user_id, week_number, year')
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })

    if (!data || data.length === 0) {
      setWeeklyHistory([])
      setLoadingHistory(false)
      return
    }

    // Group by week_number + year
    const weekMap = new Map()
    for (const row of data) {
      const key = `${row.year}-${row.week_number}`
      if (!weekMap.has(key)) {
        weekMap.set(key, { week: row.week_number, year: row.year, counts: {} })
      }
      const entry = weekMap.get(key)
      entry.counts[row.user_id] = (entry.counts[row.user_id] || 0) + 1
    }

    // Convert to sorted array (most recent first)
    const currentWeek = getWeekNumber(new Date())
    const currentYear = new Date().getFullYear()

    const weeks = Array.from(weekMap.values()).map(w => {
      const userScores = users.map(u => ({
        id: u.id,
        name: u.name,
        count: w.counts[u.id] || 0,
      })).sort((a, b) => b.count - a.count)

      const total = userScores.reduce((s, u) => s + u.count, 0)
      const isCurrent = w.week === currentWeek && w.year === currentYear

      let winner = null
      if (userScores.length >= 2 && total > 0) {
        if (userScores[0].count > userScores[1].count) {
          winner = userScores[0].name
        } else if (userScores[0].count === userScores[1].count) {
          winner = 'gelijk'
        }
      }

      return {
        week: w.week,
        year: w.year,
        dateRange: getWeekDateRange(w.week, w.year),
        userScores,
        total,
        winner,
        isCurrent,
      }
    })

    setWeeklyHistory(weeks)
    setLoadingHistory(false)
  }

  return (
    <AnimatedOverlay show={show} onClose={onClose} direction="up" className="w-full h-full">
      <div 
        className="bg-white w-full h-full overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-800">Statistieken</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl mb-6">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  period === p.key
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin w-6 h-6 text-accent-mint" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : stats && (
            <>
              <div className="bg-gradient-to-br from-pastel-mint/30 to-pastel-lavender/30 rounded-2xl p-5 mb-4">
                <p className="text-sm text-gray-500 mb-1">Totaal voltooid</p>
                <p className="text-3xl font-bold text-gray-800">{stats.total} taken</p>
                {stats.winner && stats.total > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-2xl">🏆</span>
                    <span className="font-medium text-gray-700">
                      {stats.winner.name} wint deze periode!
                    </span>
                  </div>
                )}
                {stats.total === 0 && (
                  <p className="text-gray-400 text-sm mt-2">Nog geen taken voltooid in deze periode</p>
                )}
              </div>

              <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4">Per persoon</h3>
                {stats.userStats.map((user, index) => (
                  <div key={user.id} className="mb-4 last:mb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            user.name === 'Bijan' ? 'bg-brand-bijan text-white' : 'bg-brand-esther text-white'
                          }`}>
                            {user.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-gray-700">{user.name}</span>
                        {index === 0 && stats.total > 0 && (
                          <span className="text-sm" title="1e plaats">🥇</span>
                        )}
                        {index === 1 && stats.total > 0 && (
                          <span className="text-sm" title="2e plaats">🥈</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{user.count}</span>
                        <span className="text-xs text-gray-400">({user.percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          user.name === 'Bijan' ? 'bg-brand-bijan' : 'bg-brand-esther'
                        }`}
                        style={{ width: `${user.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4">Meest voltooid</h3>
                {stats.topTasks.length === 0 ? (
                  <p className="text-gray-400 text-sm">Nog geen data</p>
                ) : (
                  <div className="space-y-3">
                    {stats.topTasks.map((task, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium w-5 ${
                            i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-300'
                          }`}>
                            {i + 1}.
                          </span>
                          <span className="text-gray-700">{task.title}</span>
                        </div>
                        <span className="text-sm text-gray-500">{task.count}x</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Weekly history */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mt-4">
                <h3 className="font-semibold text-gray-800 mb-4">Geschiedenis</h3>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <svg className="animate-spin w-5 h-5 text-accent-mint" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                ) : weeklyHistory.length === 0 ? (
                  <p className="text-gray-400 text-sm">Nog geen wekelijkse data</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto -mx-1 px-1">
                    {weeklyHistory.map((w) => (
                      <div 
                        key={`${w.year}-${w.week}`}
                        className={`p-3.5 rounded-xl border transition-colors ${
                          w.isCurrent 
                            ? 'border-accent-mint/40 bg-pastel-mint/10' 
                            : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-400">
                              Week {w.week}
                            </span>
                            {w.isCurrent && (
                              <span className="text-[10px] bg-accent-mint/20 text-accent-mint px-1.5 py-0.5 rounded font-medium">
                                NU
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">{w.dateRange}</span>
                        </div>

                        <div className="space-y-1.5">
                          {w.userScores.map((u) => (
                            <div key={u.id} className="flex items-center gap-2">
                              <span className={`text-xs font-medium w-14 truncate ${
                                u.name === 'Bijan' ? 'text-brand-bijan' : 'text-brand-esther'
                              }`}>
                                {u.name}
                              </span>
                              <div className="flex-1 h-1.5 bg-gray-200/60 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    u.name === 'Bijan' ? 'bg-brand-bijan' : 'bg-brand-esther'
                                  }`}
                                  style={{ width: w.total > 0 ? `${Math.round(u.count / w.total * 100)}%` : '0%' }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 w-6 text-right">{u.count}</span>
                            </div>
                          ))}
                        </div>

                        {w.winner && w.total > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-100/80">
                            <span className="text-xs text-gray-400">
                              {w.winner === 'gelijk' 
                                ? '🤝 Gelijkspel' 
                                : `🏆 ${w.winner}`
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AnimatedOverlay>
  )
}
