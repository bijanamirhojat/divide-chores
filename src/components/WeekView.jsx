import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import TaskItem from './TaskItem'
import TaskModal from './TaskModal'

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const DAY_NAMES = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

export default function WeekView({ currentUser, users, onComplete, presentationMode, onTogglePresentation, onOpenMenu }) {
  const [tasks, setTasks] = useState([])
  const [completedTasks, setCompletedTasks] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [showModal, setShowModal] = useState(false)
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
  }, [currentWeekOffset])

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
      return dayTasks.length > 0 && i !== currentDayIndex
    })
  }

  const indicators = getIndicators()

  if (presentationMode) {
    return (
      <div className="min-h-screen p-8">
        <div className="flex items-center justify-between mb-8">
          <button onClick={onOpenMenu} className="p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold">Divide/Chores</h1>
            <p className="text-gray-500 text-sm">{getWeekRange()}</p>
          </div>
          
          <button onClick={onTogglePresentation} className="p-2" title="Presentatie modus">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        <div className="flex gap-1">
          {DAYS.map((day, i) => {
            const dayTasks = getTasksForDay(i)
            const isToday = i === currentDayIndex && currentWeekOffset === 0

            return (
              <div key={i} className="flex-1 p-4">
                <div className={`text-center mb-2 ${isToday ? 'bg-emerald-500 text-white rounded-lg py-1' : ''}`}>
                  <p className="text-lg font-medium">{day}</p>
                  <p className="text-2xl">{formatDate(weekDates[i])}</p>
                </div>
                
                <div className="space-y-3">
                  {dayTasks.slice(0, 10).map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isCompleted={isTaskCompleted(task.id)}
                      onComplete={() => handleCompleteTask(task)}
                      onUncomplete={() => handleUncompleteTask(task)}
                      users={users}
                      isToday={isToday}
                      presentationMode={true}
                    />
                  ))}
                  {dayTasks.length > 10 && (
                    <p className="text-xs text-gray-400 text-center">
                      +{dayTasks.length - 10} meer
                    </p>
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
      className="min-h-screen"
      onTouchStart={handleSwipeStart}
      onTouchEnd={handleSwipeEnd}
    >
      <div className="flex items-center justify-between p-4">
        <button onClick={onOpenMenu} className="p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <div className="text-center">
          <h1 className="text-xl font-bold">Divide/Chores</h1>
          <p className="text-gray-500 text-sm">{getWeekRange()}</p>
        </div>
        
        <button onClick={onTogglePresentation} className="p-2" title="Presentatie modus">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      <div className="px-4 mb-4">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          {['all', 'bijan', 'esther'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                filter === f 
                  ? 'bg-white shadow text-emerald-600' 
                  : 'text-gray-500'
              }`}
            >
              {f === 'all' ? 'Alle' : f === 'bijan' ? '👤 Bijan' : '👤 Esther'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-2 mb-4">
        <button 
          onClick={() => {
            setActiveDay(prev => prev > 0 ? prev - 1 : 6)
          }}
          className="p-2 text-gray-500"
        >
          ←
        </button>
        <span className="text-sm text-gray-400">
          {currentWeekOffset === 0 ? 'Deze week' : currentWeekOffset > 0 ? 'Volgende weken' : 'Vorige weken'}
        </span>
        <button 
          onClick={() => {
            setActiveDay(prev => prev < 6 ? prev + 1 : 0)
          }}
          className="p-2 text-gray-500"
        >
          →
        </button>
      </div>

      <div className="flex gap-1 px-2 overflow-x-auto mb-4">
        {DAYS.map((day, i) => {
          const dayTasks = getTasksForDay(i)
          const isActive = i === activeDay
          const isToday = i === currentDayIndex && currentWeekOffset === 0

          return (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              className={`flex-1 min-w-[50px] py-2 rounded-lg text-center ${
                isActive ? 'bg-emerald-500 text-white' : 'bg-gray-100'
              }`}
            >
              <p className="text-xs font-medium">{day}</p>
              <p className="text-lg">{formatDate(weekDates[i])}</p>
              {indicators[i] && !isToday && (
                <span className="text-orange-400 text-xs">🔔</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="px-2">
        <h2 className="text-lg font-semibold mb-3">
          {DAY_NAMES[activeDay]}
          {activeDay === currentDayIndex && currentWeekOffset === 0 && (
            <span className="ml-2 text-emerald-500 text-sm">(vandaag)</span>
          )}
        </h2>
        
        <div className="space-y-2">
          {getTasksForDay(activeDay).map(task => (
            <TaskItem
              key={task.id}
              task={task}
              isCompleted={isTaskCompleted(task.id)}
              onComplete={() => handleCompleteTask(task)}
              onUncomplete={() => handleUncompleteTask(task)}
              users={users}
              isToday={activeDay === currentDayIndex && currentWeekOffset === 0}
              presentationMode={false}
            />
          ))}
          {getTasksForDay(activeDay).length === 0 && (
            <p className="text-gray-400 text-center py-8">
              Geen taken voor deze dag
            </p>
          )}
        </div>
      </div>

      <button
        onClick={() => {
          setSelectedDay(activeDay)
          setShowModal(true)
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl active:scale-95 transition-all"
      >
        +
      </button>

      {showModal && (
        <TaskModal
          dayIndex={selectedDay !== null ? selectedDay : activeDay}
          dayName={DAY_NAMES[selectedDay !== null ? selectedDay : activeDay]}
          onClose={() => {
            setShowModal(false)
            setSelectedDay(null)
          }}
          users={users}
          currentUser={currentUser}
          onTaskCreated={loadTasks}
        />
      )}
    </div>
  )
}
