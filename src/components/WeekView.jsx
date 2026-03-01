import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import TaskItem from './TaskItem'
import TaskModal from './TaskModal'

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const DAY_NAMES = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

export default function WeekView({ currentUser, users, onComplete, presentationMode, onTogglePresentation, onOpenMenu }) {
  const [tasks, setTasks] = useState([])
  const [completedTasks, setCompletedTasks] = useState(null)  // Start with null, not []
  const [meals, setMeals] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [editMeal, setEditMeal] = useState(null)
  const [filter, setFilter] = useState('all')
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const [resetKey, setResetKey] = useState(0)

  // Week scroller (snap-based)
  const weekScrollRef = useRef(null)
  const isRecycling = useRef(false)
  const BUFFER_WEEKS = 5 // 2 before + current + 2 after
  const CENTER_WEEK = 2  // index of the "current" week in the buffer

  const isLoading = completedTasks === null
  
  // Fluid pill refs for filter bar
  const filterContainerRef = useRef(null)
  const filterBtnRefs = useRef({})
  const [filterPillStyle, setFilterPillStyle] = useState(null)

  const updateFilterPill = useCallback(() => {
    const container = filterContainerRef.current
    const btn = filterBtnRefs.current[filter]
    if (!container || !btn) return
    const containerRect = container.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    setFilterPillStyle({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
    })
  }, [filter])

  useLayoutEffect(() => {
    updateFilterPill()
  }, [updateFilterPill, isLoading])

  // Also measure after first paint in case layout isn't settled
  useEffect(() => {
    requestAnimationFrame(updateFilterPill)
  }, [updateFilterPill, isLoading])

  const today = new Date()
  const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1
  const [activeDay, setActiveDay] = useState(currentDayIndex)

  // Content transition
  const [slideDirection, setSlideDirection] = useState(null)
  const prevActiveDayRef = useRef(activeDay)
  const prevWeekOffsetRef = useRef(currentWeekOffset)
  const contentRef = useRef(null)

  useEffect(() => {
    const prevDay = prevActiveDayRef.current
    const prevWeek = prevWeekOffsetRef.current
    if (currentWeekOffset !== prevWeek) {
      setSlideDirection(currentWeekOffset > prevWeek ? 'left' : 'right')
    } else if (activeDay !== prevDay) {
      setSlideDirection(activeDay > prevDay ? 'left' : 'right')
    }
    prevActiveDayRef.current = activeDay
    prevWeekOffsetRef.current = currentWeekOffset
    // Reset slide direction after animation completes
    const t = setTimeout(() => setSlideDirection(null), 280)
    return () => clearTimeout(t)
  }, [activeDay, currentWeekOffset])

  function getWeekDates(offset = 0) {
    const start = new Date(today)
    start.setDate(today.getDate() - currentDayIndex + (offset * 7))
    return DAYS.map((_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }

  const weekDates = getWeekDates(currentWeekOffset)

  // Generate 5 weeks of dates for the snap scroller
  const bufferWeeks = []
  for (let w = 0; w < BUFFER_WEEKS; w++) {
    const weekOffset = currentWeekOffset + (w - CENTER_WEEK)
    bufferWeeks.push({
      offset: weekOffset,
      dates: getWeekDates(weekOffset),
    })
  }

  // Center scroll on the CENTER_WEEK (instant, no animation)
  const centerWeekScroll = useCallback(() => {
    const el = weekScrollRef.current
    if (!el) return
    const weekWidth = el.clientWidth
    if (weekWidth === 0) return
    isRecycling.current = true
    // Temporarily disable snap so we can reposition instantly
    el.style.scrollSnapType = 'none'
    el.scrollLeft = CENTER_WEEK * weekWidth
    // Re-enable snap after browser applies the position
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.scrollSnapType = 'x mandatory'
        isRecycling.current = false
      })
    })
  }, [])

  // Center on mount and when week offset changes
  useEffect(() => {
    centerWeekScroll()
  }, [currentWeekOffset, isLoading, centerWeekScroll])

  // Re-center after layout settles and on resize
  useEffect(() => {
    const t = setTimeout(centerWeekScroll, 50)
    const el = weekScrollRef.current
    if (!el) return () => clearTimeout(t)
    const ro = new ResizeObserver(() => centerWeekScroll())
    ro.observe(el)
    return () => { clearTimeout(t); ro.disconnect() }
  }, [currentWeekOffset, isLoading, centerWeekScroll])

  // Handle scroll-snap settling: detect which week snapped into view
  const handleWeekScrollEnd = useCallback(() => {
    if (isRecycling.current) return
    const el = weekScrollRef.current
    if (!el) return
    const weekWidth = el.clientWidth
    if (weekWidth === 0) return
    const snappedIndex = Math.round(el.scrollLeft / weekWidth)
    const drift = snappedIndex - CENTER_WEEK
    if (drift !== 0) {
      setCurrentWeekOffset(prev => prev + drift)
    }
  }, [])

  // Bind scrollend (or debounced scroll fallback) to detect week changes
  useEffect(() => {
    const el = weekScrollRef.current
    if (!el) return
    let scrollTimer = null
    const supportsScrollEnd = 'onscrollend' in el

    if (supportsScrollEnd) {
      const onScrollEnd = () => handleWeekScrollEnd()
      el.addEventListener('scrollend', onScrollEnd)
      return () => el.removeEventListener('scrollend', onScrollEnd)
    } else {
      const onScroll = () => {
        clearTimeout(scrollTimer)
        scrollTimer = setTimeout(handleWeekScrollEnd, 150)
      }
      el.addEventListener('scroll', onScroll, { passive: true })
      return () => {
        clearTimeout(scrollTimer)
        el.removeEventListener('scroll', onScroll)
      }
    }
  }, [handleWeekScrollEnd, isLoading])

  useEffect(() => {
    loadTasks()
    loadMeals()
    loadCompletedTasks()

    function handleVisibilityChange() {
      if (!document.hidden) {
        loadTasks()
        loadCompletedTasks()
        loadMeals()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [currentWeekOffset])

  async function loadMeals() {
    const weekDates = getWeekDates(currentWeekOffset)
    const weekNumber = getWeekNumber(weekDates[0])
    const year = weekDates[0].getFullYear()
    
    const { data } = await supabase
      .from('meals')
      .select('*')
      .eq('week_number', weekNumber)
      .eq('year', year)
      .order('day_of_week')
    
    if (data) setMeals(data)
  }

  async function loadTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setTasks(data)
  }

  async function loadCompletedTasks() {
    const weekNumber = getWeekNumber(weekDates[0])
    const year = weekDates[0].getFullYear()
    
    const { data } = await supabase
      .from('completed_tasks')
      .select('*')
      .eq('week_number', weekNumber)
      .eq('year', year)
    
    if (data) setCompletedTasks(data)
  }

  function getTasksForDay(dayIndex) {
    const weekDates = getWeekDates(currentWeekOffset)
    const weekStart = weekDates[0]
    const weekEnd = new Date(weekDates[6])
    weekEnd.setHours(23, 59, 59, 999)
    
    return tasks.filter(task => {
      const taskDay = task.day_of_week
      if (taskDay !== dayIndex) return false
      
      if (task.is_recurring) {
        // Recurring tasks show every week
      } else {
        // Non-recurring tasks only show in the week they were created
        const createdAt = new Date(task.created_at)
        if (createdAt < weekStart || createdAt > weekEnd) return false
      }
      
      if (filter === 'bijan') {
        return task.assigned_to === users.find(u => u.name === 'Bijan')?.id || task.is_both
      }
      if (filter === 'esther') {
        return task.assigned_to === users.find(u => u.name === 'Esther')?.id || task.is_both
      }
      return true
    })
  }

  function isTaskCompleted(taskId) {
    if (!completedTasks) return false
    return completedTasks.some(ct => ct.task_id === taskId)
  }

  async function handleCompleteTask(task) {
    if (!currentUser) return
    
    const weekNumber = getWeekNumber(weekDates[0])
    const year = weekDates[0].getFullYear()
    
    const { error } = await supabase
      .from('completed_tasks')
      .insert({
        task_id: task.id,
        user_id: currentUser.id,
        week_number: weekNumber,
        year: year
      })
    
    if (!error) {
      loadCompletedTasks()
      onComplete()
    }
  }

  async function handleUncompleteTask(task) {
    const weekNumber = getWeekNumber(weekDates[0])
    const year = weekDates[0].getFullYear()
    
    const { error } = await supabase
      .from('completed_tasks')
      .delete()
      .eq('task_id', task.id)
      .eq('week_number', weekNumber)
      .eq('year', year)
    
    if (!error) {
      loadCompletedTasks()
    }
  }

  async function handleDeleteTask(task) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id)
    
    if (!error) {
      loadTasks()
    }
  }

  function getWeekNumber(date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  }

  function formatDate(date) {
    return date.getDate()
  }

  function getWeekRange() {
    const start = weekDates[0]
    const end = weekDates[6]
    const startStr = `${start.getDate()}/${start.getMonth() + 1}`
    const endStr = `${end.getDate()}/${end.getMonth() + 1}`
    return `${startStr} - ${endStr}`
  }

  function getIndicators() {
    return DAYS.map((_, i) => {
      const dayTasks = tasks.filter(t => t.day_of_week === i)
      return dayTasks.length > 0
    })
  }

  function getMealsForDay(dayIndex) {
    return meals.filter(meal => meal.day_of_week === dayIndex)
  }

  async function addMeal(dayIndex, mealName, mealType) {
    const weekNumber = getWeekNumber(weekDates[0])
    const year = weekDates[0].getFullYear()
    
    const { error } = await supabase
      .from('meals')
      .insert({
        day_of_week: dayIndex,
        meal_name: mealName,
        meal_type: mealType,
        week_number: weekNumber,
        year: year
      })
    
    if (!error) {
      loadMeals()
    }
  }

  async function deleteMeal(mealId) {
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', mealId)
    
    if (!error) {
      loadMeals()
    }
  }

  const indicators = getIndicators()

  if (presentationMode) {
    return (
      <div className="h-screen p-4 md:p-6 bg-gradient-to-br from-pastel-cream to-pastel-mint/20 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="w-8 md:w-10" />
          
          <div className="text-center">
            <h1 className="text-xl md:text-3xl font-bold text-gray-800">Divide/Chores</h1>
            <div className="flex items-center justify-center gap-2 md:gap-3 mt-1 md:mt-2">
              <button 
                onClick={() => setCurrentWeekOffset(prev => prev - 1)}
                className="p-2.5 md:p-2 hover:bg-white/60 rounded-lg transition-colors"
              >
                <svg className="w-4 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <p className="text-sm md:text-lg text-gray-500 font-medium min-w-[140px] md:min-w-[180px] text-center">{getWeekRange()}</p>
              <button 
                onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                className="p-2.5 md:p-2 hover:bg-white/60 rounded-lg transition-colors"
              >
                <svg className="w-4 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            {currentWeekOffset === 0 && (
              <p className="text-accent-mint text-sm md:text-lg font-semibold mt-1 md:mt-2">Vandaag: {DAY_NAMES[currentDayIndex]}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-brand-bijan"></div>
                <span>Bijan</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-brand-esther"></div>
                <span>Esther</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-pastel-lavenderDark"></div>
                <span>Samen</span>
              </div>
            </div>
            <button onClick={onTogglePresentation} className="p-2 hover:bg-white/60 rounded-lg transition-colors" title="Presentatie modus afsluiten">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="md:flex-1 md:flex md:gap-4 md:overflow-x-auto hidden">
          {DAYS.map((day, i) => {
            const dayTasks = getTasksForDay(i)
            const dayMeals = getMealsForDay(i)
            const isToday = i === currentDayIndex && currentWeekOffset === 0
            const hasItems = dayTasks.length > 0 || dayMeals.length > 0

            return (
              <div key={i} className="flex-1 flex flex-col min-w-0 bg-white/60 rounded-2xl">
                <div className={`text-center p-3 md:p-4 transition-all duration-300 ${
                  isToday 
                    ? 'bg-gradient-to-br from-accent-mint to-pastel-mintDark text-white shadow-lg' 
                    : 'bg-white shadow-sm'
                }`}>
                  <p className={`font-medium ${isToday ? 'text-white/80' : 'text-gray-500'}`}>{DAYS[i]}</p>
                  <p className={`text-2xl md:text-3xl font-bold mt-1 ${isToday ? 'text-white' : 'text-gray-800'}`}>{formatDate(weekDates[i])}</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {dayMeals.map(meal => (
                    <button
                      key={meal.id}
                      onClick={() => {
                        setEditMeal(meal)
                        setShowModal(true)
                      }}
                      className="w-full bg-pastel-peach/60 rounded px-2 py-1.5 text-sm font-medium text-gray-700 flex items-center justify-between text-left hover:bg-pastel-peach/80 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{meal.meal_type === 'lunch' ? '🍞' : '🍝'}</span>
                        <span className="whitespace-normal">{meal.meal_name}</span>
                      </div>
                      <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  ))}
                  {dayTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isCompleted={isTaskCompleted(task.id)}
                      onComplete={() => handleCompleteTask(task)}
                      onUncomplete={() => handleUncompleteTask(task)}
                      onEdit={(t) => {
                        setEditTask(t)
                        setShowModal(true)
                      }}
                      users={users}
                      isToday={isToday}
                      presentationMode={true}
                    />
                  ))}
                  {!hasItems && (
                    <div className="text-center text-gray-400 py-8 text-sm">
                      Geen taken
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex-1 md:hidden flex flex-col overflow-hidden">
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 snap-x">
            {DAYS.map((day, i) => {
              const isToday = i === currentDayIndex && currentWeekOffset === 0
              return (
                <button
                  key={i}
                  onClick={() => setActiveDay(i)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all snap-start ${
                    activeDay === i
                      ? 'bg-gradient-to-br from-accent-mint to-pastel-mintDark text-white shadow-soft'
                      : isToday
                        ? 'bg-white shadow-card text-gray-700'
                        : 'bg-white/60 text-gray-500'
                  }`}
                >
                  <span className="block text-xs opacity-70">{day}</span>
                  <span className="block text-lg font-bold mt-0.5">{formatDate(weekDates[i])}</span>
                </button>
              )
            })}
          </div>
          
          <div className="flex-1 overflow-y-auto bg-white/60 rounded-2xl">
            <div className={`text-center p-3 transition-all duration-300 ${
              activeDay === currentDayIndex && currentWeekOffset === 0
                ? 'bg-gradient-to-br from-accent-mint to-pastel-mintDark text-white shadow-lg rounded-t-2xl' 
                : 'bg-white shadow-sm rounded-t-2xl'
            }`}>
              <p className={`font-medium ${activeDay === currentDayIndex && currentWeekOffset === 0 ? 'text-white/80' : 'text-gray-500'}`}>{DAY_NAMES[activeDay]}</p>
              <p className={`text-3xl font-bold mt-1 ${activeDay === currentDayIndex && currentWeekOffset === 0 ? 'text-white' : 'text-gray-800'}`}>{formatDate(weekDates[activeDay])}</p>
            </div>
            
            <div className="p-3 space-y-2">
              {getMealsForDay(activeDay).map(meal => (
                <button
                  key={meal.id}
                  onClick={() => {
                    setEditMeal(meal)
                    setShowModal(true)
                  }}
                  className="w-full bg-pastel-peach/60 rounded-xl px-3 py-2.5 text-base font-medium text-gray-700 flex items-center justify-between text-left hover:bg-pastel-peach/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>{meal.meal_type === 'lunch' ? '🍞' : '🍝'}</span>
                    <span className="whitespace-normal">{meal.meal_name}</span>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              ))}
              {getTasksForDay(activeDay).map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isCompleted={isTaskCompleted(task.id)}
                  onComplete={() => handleCompleteTask(task)}
                  onUncomplete={() => handleUncompleteTask(task)}
                  onEdit={(t) => {
                    setEditTask(t)
                    setShowModal(true)
                  }}
                  users={users}
                  isToday={activeDay === currentDayIndex && currentWeekOffset === 0}
                  presentationMode={true}
                />
              ))}
              {(getTasksForDay(activeDay).length === 0 && getMealsForDay(activeDay).length === 0) && (
                <div className="text-center text-gray-400 py-8">
                  Geen taken
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-pastel-cream flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-pastel-mint" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pastel-cream overflow-x-hidden">
      <div className="sticky top-0 z-40 glass border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onOpenMenu} className="p-2.5 rounded-xl hover:bg-white/60 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-800">Divide/Chores</h1>
            <div className="flex items-center justify-center gap-2 mt-0.5">
              <button 
                onClick={() => setCurrentWeekOffset(prev => prev - 1)}
                className="p-2.5 hover:bg-white/50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <p className="text-gray-400 text-xs">{getWeekRange()}</p>
              <button 
                onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                className="p-2.5 hover:bg-white/50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          
          <button onClick={onTogglePresentation} className="p-2.5 rounded-xl hover:bg-white/60 transition-colors" title="Presentatie modus">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        <div className="px-4 pb-3">
          <div ref={filterContainerRef} className="relative flex gap-1.5 bg-white/60 p-1.5 rounded-2xl">
            {/* Fluid pill indicator */}
            {filterPillStyle && (
              <div
                className="absolute top-1.5 bottom-1.5 rounded-xl shadow-soft pointer-events-none transition-all duration-300 ease-out"
                style={{
                  left: filterPillStyle.left,
                  width: filterPillStyle.width,
                  backgroundColor: filter === 'all' ? '#7BC4A8' : filter === 'bijan' ? '#8BB8E8' : '#F5A8C0',
                }}
              />
            )}
            {['all', 'bijan', 'esther'].map(f => {
              const user = f === 'all' ? null : users.find(u => u.name === f.charAt(0).toUpperCase() + f.slice(1))
              const avatar = user?.avatar_url
              return (
                <button
                  key={f}
                  ref={el => { filterBtnRefs.current[f] = el }}
                  onClick={() => setFilter(f)}
                  className={`filter-btn flex items-center justify-center gap-1.5 relative z-10 transition-colors duration-300 ${
                    filter === f 
                      ? 'text-white' 
                      : 'text-gray-500 hover:bg-white/50'
                  }`}
                >
                  {avatar && (
                    <img src={avatar} alt={f} className="w-5 h-5 rounded-full object-cover" />
                  )}
                  {f === 'all' ? 'Alle' : f === 'bijan' ? 'Bijan' : 'Esther'}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="px-3 py-4">
        <div 
          ref={weekScrollRef}
          className="flex overflow-x-auto pb-2 scrollbar-hide"
          style={{ 
            scrollSnapType: 'x mandatory', 
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {bufferWeeks.map((week) => {
            const isCurrentWeek = week.offset === currentWeekOffset
            return (
              <div
                key={`week-${week.offset}`}
                className="flex gap-1.5 flex-shrink-0 min-w-full"
                style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
              >
                {week.dates.map((date, dayIdx) => {
                  const isActive = isCurrentWeek && dayIdx === activeDay
                  const isToday = dayIdx === currentDayIndex && week.offset === 0
                  const dayTasks = isCurrentWeek ? getTasksForDay(dayIdx) : []
                  const hasTasks = dayTasks.length > 0

                  return (
                    <button
                      key={dayIdx}
                      onClick={() => {
                        if (!isCurrentWeek) {
                          setCurrentWeekOffset(week.offset)
                        }
                        setActiveDay(dayIdx)
                      }}
                      className={`day-tab flex-1 flex-shrink-0 ${
                        isActive 
                          ? 'bg-gradient-to-br from-accent-mint to-pastel-mintDark text-white shadow-soft' 
                          : isToday 
                            ? 'bg-white shadow-card text-gray-700'
                            : isCurrentWeek
                              ? 'bg-white/50 text-gray-500 active:bg-white/80'
                              : 'bg-white/30 text-gray-300'
                      }`}
                    >
                      <p className="text-xs opacity-70">{DAYS[dayIdx]}</p>
                      <p className="text-lg font-semibold mt-0.5">{date.getDate()}</p>
                      {hasTasks && !isActive && isCurrentWeek && (
                        <span className="w-1.5 h-1.5 bg-accent-mint rounded-full mx-auto mt-1.5"></span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <div className="px-4 pb-24 overflow-hidden">
        <div 
          ref={contentRef}
          className={`${
            slideDirection === 'left' 
              ? 'animate-slide-content-left' 
              : slideDirection === 'right' 
                ? 'animate-slide-content-right' 
                : ''
          }`}
          key={`day-${activeDay}-${currentWeekOffset}`}
        >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {DAY_NAMES[activeDay]}
          </h2>
          {activeDay === currentDayIndex && currentWeekOffset === 0 && (
            <span className="text-xs font-medium text-accent-mint bg-pastel-mint/30 px-3 py-1 rounded-full">
              Vandaag
            </span>
          )}
        </div>

        {getMealsForDay(activeDay).length > 0 && (
          <div className="mb-6">
            <div className="space-y-2">
              {getMealsForDay(activeDay).map(meal => (
                <button
                  key={meal.id}
                  onClick={() => {
                    setEditMeal(meal)
                    setShowModal(true)
                  }}
                  className="w-full flex items-center justify-between bg-pastel-peach/30 hover:bg-pastel-peach/50 active:scale-[0.99] rounded-xl p-3 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{meal.meal_type === 'lunch' ? '🍞' : '🍝'}</span>
                    <span className="text-gray-700">{meal.meal_name}</span>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div>
          {getTasksForDay(activeDay).map(task => (
            <TaskItem
              key={task.id}
              task={task}
              isCompleted={isTaskCompleted(task.id)}
              onComplete={() => handleCompleteTask(task)}
              onUncomplete={() => handleUncompleteTask(task)}
              onEdit={(t) => {
                setEditTask(t)
                setShowModal(true)
              }}
              onDelete={() => handleDeleteTask(task)}
              onDeleteAttempt={() => setResetKey(k => k + 1)}
              users={users}
              isToday={activeDay === currentDayIndex && currentWeekOffset === 0}
              presentationMode={false}
              resetKey={resetKey}
            />
          ))}
          {getTasksForDay(activeDay).length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-pastel-lavender/50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-pastel-lavenderDark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-400">Geen taken voor deze dag</p>
              <p className="text-gray-300 text-sm mt-1">Druk op + om een taak toe te voegen</p>
            </div>
          )}
        </div>
        </div>
      </div>

      <button
        onClick={() => {
          setSelectedDay(activeDay)
          setShowModal(true)
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-accent-mint to-pastel-mintDark text-white rounded-2xl shadow-soft-lg flex items-center justify-center text-2xl active:scale-95 transition-all hover:shadow-soft-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showModal && (
        <TaskModal
          dayIndex={editMeal?.day_of_week ?? editTask?.day_of_week ?? selectedDay ?? activeDay}
          dayName={DAY_NAMES[editMeal?.day_of_week ?? editTask?.day_of_week ?? selectedDay ?? activeDay]}
          onClose={() => {
            setShowModal(false)
            setSelectedDay(null)
            setEditTask(null)
            setEditMeal(null)
          }}
          users={users}
          currentUser={currentUser}
          onTaskCreated={loadTasks}
          editTask={editTask}
          editMeal={editMeal}
          onMealAdded={(dayIndex, name, type) => addMeal(dayIndex, name, type)}
          onMealUpdated={loadMeals}
          onMealDeleted={async (mealId) => {
            await deleteMeal(mealId)
          }}
        />
      )}
    </div>
  )
}
