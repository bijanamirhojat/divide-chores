import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import TaskItem from './TaskItem'
import TaskModal from './TaskModal'

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const DAY_NAMES = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

export default function WeekView({ currentUser, users, onComplete, presentationMode, onTogglePresentation, onOpenMenu }) {
  const [tasks, setTasks] = useState([])
  const [completedTasks, setCompletedTasks] = useState([])
  const [meals, setMeals] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [filter, setFilter] = useState('all')
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const swipeStart = useRef(null)

  const today = new Date()
  const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1
  const [activeDay, setActiveDay] = useState(currentDayIndex)
  
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

  useEffect(() => {
    loadTasks()
    loadCompletedTasks()
    loadMeals()
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
    const weekDates = getWeekDates(currentWeekOffset)
    const startDate = weekDates[0].toISOString().split('T')[0]
    const endDate = weekDates[6].toISOString().split('T')[0]
    
    const { data } = await supabase
      .from('completed_tasks')
      .select('*')
      .gte('completed_at', startDate)
      .lte('completed_at', endDate + 'T23:59:59')
    
    if (data) setCompletedTasks(data)
  }

  function getTasksForDay(dayIndex) {
    return tasks.filter(task => {
      const taskDay = task.day_of_week
      if (taskDay !== dayIndex) return false
      
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
    return completedTasks.some(ct => ct.task_id === taskId && ct.user_id === currentUser?.id)
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
    if (!currentUser) return
    
    const { error } = await supabase
      .from('completed_tasks')
      .delete()
      .eq('task_id', task.id)
      .eq('user_id', currentUser.id)
    
    if (!error) {
      loadCompletedTasks()
    }
  }

  async function handleDeleteTask(task) {
    if (!confirm('Weet je zeker dat je deze taak wilt verwijderen?')) return
    
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

  function handleSwipeStart(e) {
    swipeStart.current = e.touches[0].clientX
  }

  function handleSwipeEnd(e) {
    if (!swipeStart.current) return
    const diff = e.changedTouches[0].clientX - swipeStart.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setActiveDay(prev => prev > 0 ? prev - 1 : 6)
      } else {
        setActiveDay(prev => prev < 6 ? prev + 1 : 0)
      }
    }
    swipeStart.current = null
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
      <div className="h-screen p-6 bg-gradient-to-br from-pastel-cream to-pastel-mint/20 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="w-10" />
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">Divide/Chores</h1>
            <div className="flex items-center justify-center gap-3 mt-2">
              <button 
                onClick={() => setCurrentWeekOffset(prev => prev - 1)}
                className="p-2 hover:bg-white/60 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <p className="text-gray-500 text-lg font-medium min-w-[180px] text-center">{getWeekRange()}</p>
              <button 
                onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                className="p-2 hover:bg-white/60 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            {currentWeekOffset === 0 && (
              <p className="text-accent-mint text-lg font-semibold mt-2">Vandaag: {DAY_NAMES[currentDayIndex]}</p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
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
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 flex gap-4 overflow-x-auto">
          {DAYS.map((day, i) => {
            const dayTasks = getTasksForDay(i)
            const dayMeals = getMealsForDay(i)
            const isToday = i === currentDayIndex && currentWeekOffset === 0
            const hasItems = dayTasks.length > 0 || dayMeals.length > 0

            return (
              <div key={i} className="flex-1 flex flex-col min-w-0 bg-white/60 rounded-2xl">
                <div className={`text-center p-4 transition-all duration-300 ${
                  isToday 
                    ? 'bg-gradient-to-br from-accent-mint to-pastel-mintDark text-white shadow-lg' 
                    : 'bg-white shadow-sm'
                }`}>
                  <p className={`font-medium ${isToday ? 'text-white/80' : 'text-gray-500'}`}>{DAYS[i]}</p>
                  <p className={`text-3xl font-bold mt-1 ${isToday ? 'text-white' : 'text-gray-800'}`}>{formatDate(weekDates[i])}</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {dayMeals.map(meal => (
                    <div key={meal.id} className="bg-pastel-peach/60 rounded px-2 py-1.5 text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <span>{meal.meal_type === 'lunch' ? '🍞' : '🍝'}</span>
                      <span className="whitespace-normal">{meal.meal_name}</span>
                    </div>
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
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-pastel-cream overflow-x-hidden"
      onTouchStart={handleSwipeStart}
      onTouchEnd={handleSwipeEnd}
    >
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
                className="p-1 hover:bg-white/50 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <p className="text-gray-400 text-xs">{getWeekRange()}</p>
              <button 
                onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                className="p-1 hover:bg-white/50 rounded"
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
          <div className="flex gap-1.5 bg-white/60 p-1.5 rounded-2xl">
            {['all', 'bijan', 'esther'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`filter-btn ${
                  filter === f 
                    ? 'bg-accent-mint text-white shadow-soft' 
                    : 'text-gray-500 hover:bg-white/50'
                }`}
              >
                {f === 'all' ? 'Alle' : f === 'bijan' ? 'Bijan' : 'Esther'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-3 py-4">
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
          {DAYS.map((day, i) => {
            const dayTasks = getTasksForDay(i)
            const isActive = i === activeDay
            const isToday = i === currentDayIndex && currentWeekOffset === 0
            const hasTasks = dayTasks.length > 0

            return (
              <button
                key={i}
                onClick={() => setActiveDay(i)}
                className={`day-tab min-w-[48px] ${
                  isActive 
                    ? 'bg-gradient-to-br from-accent-mint to-pastel-mintDark text-white shadow-soft' 
                    : isToday 
                      ? 'bg-white shadow-card text-gray-700'
                      : 'bg-white/50 text-gray-500 hover:bg-white'
                }`}
              >
                <p className="text-xs opacity-70">{day}</p>
                <p className="text-lg font-semibold mt-0.5">{formatDate(weekDates[i])}</p>
                {hasTasks && !isActive && (
                  <span className="w-1.5 h-1.5 bg-accent-mint rounded-full mx-auto mt-1.5"></span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4 pb-24">
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
                <div key={meal.id} className="flex items-center justify-between bg-pastel-peach/30 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{meal.meal_type === 'lunch' ? '🍞' : '🍝'}</span>
                    <span className="text-gray-700">{meal.meal_name}</span>
                  </div>
                  <button 
                    onClick={() => deleteMeal(meal.id)}
                    className="text-gray-400 hover:text-red-400 p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-3">
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
              users={users}
              isToday={activeDay === currentDayIndex && currentWeekOffset === 0}
              presentationMode={false}
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
          dayIndex={editTask?.day_of_week ?? selectedDay ?? activeDay}
          dayName={DAY_NAMES[editTask?.day_of_week ?? selectedDay ?? activeDay]}
          onClose={() => {
            setShowModal(false)
            setSelectedDay(null)
            setEditTask(null)
          }}
          users={users}
          currentUser={currentUser}
          onTaskCreated={loadTasks}
          editTask={editTask}
          onMealAdded={(name, type) => addMeal(editTask?.day_of_week ?? selectedDay ?? activeDay, name, type)}
        />
      )}
    </div>
  )
}
