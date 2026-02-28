import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const DAY_NAMES = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

/**
 * Fire-and-forget: send push notification for a new task via Edge Function.
 */
function sendNewTaskPush({ creatorName, taskTitle, dayName, targetUserIds }) {
  if (!targetUserIds.length) return
  fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      type: 'new-task',
      creator_name: creatorName,
      task_title: taskTitle,
      day_name: dayName,
      target_user_ids: targetUserIds,
    }),
  }).catch(() => {}) // Silent fail — don't block the user
}

export default function TaskModal({ dayIndex, dayName, onClose, users, currentUser, onTaskCreated, editTask, onMealAdded, editMeal, onMealUpdated, onMealDeleted }) {
  const [mode, setMode] = useState(editMeal ? 'meal' : 'task')
  
  const [title, setTitle] = useState(editTask?.title || '')
  const [description, setDescription] = useState(editTask?.description || '')
  const [dayOfWeek, setDayOfWeek] = useState(editMeal?.day_of_week ?? editTask?.day_of_week ?? dayIndex)
  const [assignedTo, setAssignedTo] = useState(() => {
    if (editTask?.is_both) return 'both'
    if (editTask?.assigned_to) {
      const assignedUser = users.find(u => u.id === editTask.assigned_to)
      return assignedUser?.name?.toLowerCase() || 'both'
    }
    return 'both'
  })
  const [isRecurring, setIsRecurring] = useState(editTask?.is_recurring ?? false)
  const [loading, setLoading] = useState(false)
  
  const [mealName, setMealName] = useState(editMeal?.meal_name || '')
  const [mealType, setMealType] = useState(editMeal?.meal_type || 'dinner')

  // Fluid pill for assignee selector
  const assigneeContainerRef = useRef(null)
  const assigneeBtnRefs = useRef({})
  const [assigneePillStyle, setAssigneePillStyle] = useState(null)

  const assigneeColorMap = { both: '#B89DD4', bijan: '#8BB8E8', esther: '#F5A8C0' }

  const updateAssigneePill = useCallback(() => {
    const container = assigneeContainerRef.current
    const btn = assigneeBtnRefs.current[assignedTo]
    if (!container || !btn) return
    const containerRect = container.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    setAssigneePillStyle({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
    })
  }, [assignedTo])

  useLayoutEffect(() => {
    updateAssigneePill()
  }, [updateAssigneePill])

  // Recalculate after first paint + after modal slide-up animation settles
  useEffect(() => {
    requestAnimationFrame(updateAssigneePill)
    const timer = setTimeout(updateAssigneePill, 350)
    return () => clearTimeout(timer)
  }, [updateAssigneePill])

  const isEditing = !!editTask
  const isEditingMeal = !!editMeal

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (mode === 'task') {
      if (!title.trim()) return
      
      setLoading(true)
  
      const bijan = users.find(u => u.name === 'Bijan')
      const esther = users.find(u => u.name === 'Esther')
  
      let taskAssignedTo = null
      let taskIsBoth = false
  
      if (assignedTo === 'both') {
        taskIsBoth = true
      } else if (assignedTo === 'bijan' && bijan) {
        taskAssignedTo = bijan.id
      } else if (assignedTo === 'esther' && esther) {
        taskAssignedTo = esther.id
      }
  
      if (isEditing) {
        const { error } = await supabase
          .from('tasks')
          .update({
            title: title.trim(),
            description: description.trim() || null,
            day_of_week: dayOfWeek,
            assigned_to: taskAssignedTo,
            is_both: taskIsBoth,
            is_recurring: isRecurring
          })
          .eq('id', editTask.id)
  
        setLoading(false)
  
        if (!error) {
          onTaskCreated()
          onClose()
        }
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert({
            title: title.trim(),
            description: description.trim() || null,
            day_of_week: dayOfWeek,
            assigned_to: taskAssignedTo,
            is_both: taskIsBoth,
            is_recurring: isRecurring,
            created_by: currentUser.id
          })
  
        setLoading(false)
  
        if (!error) {
          // Send push notification for new task (fire-and-forget)
          const targetUserIds = []
          if (taskIsBoth) {
            // Notify everyone except the creator
            users.filter(u => u.id !== currentUser.id).forEach(u => targetUserIds.push(u.id))
          } else if (taskAssignedTo && taskAssignedTo !== currentUser.id) {
            // Notify the assigned person (only if it's not the creator)
            targetUserIds.push(taskAssignedTo)
          }
          sendNewTaskPush({
            creatorName: currentUser.name,
            taskTitle: title.trim(),
            dayName: DAY_NAMES[dayOfWeek],
            targetUserIds,
          })

          onTaskCreated()
          onClose()
        }
      }
    } else {
      if (!mealName.trim()) return
      
      setLoading(true)
      
      if (isEditingMeal) {
        const { error } = await supabase
          .from('meals')
          .update({
            meal_name: mealName.trim(),
            meal_type: mealType,
            day_of_week: dayOfWeek
          })
          .eq('id', editMeal.id)
        
        setLoading(false)
        
        if (!error) {
          if (onMealUpdated) onMealUpdated()
          onClose()
        }
      } else {
        if (onMealAdded) {
          onMealAdded(dayOfWeek, mealName.trim(), mealType)
        }
        
        setLoading(false)
        onClose()
      }
    }
  }

  async function handleDelete(e) {
    e.preventDefault()
    if (!confirm('Weet je zeker dat je deze taak wilt verwijderen?')) return

    setLoading(true)

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', editTask.id)

    setLoading(false)

    if (!error) {
      onTaskCreated()
      onClose()
    }
  }

  async function handleDeleteMeal(e) {
    e.preventDefault()
    if (!confirm('Weet je zeker dat je dit eten wilt verwijderen?')) return

    setLoading(true)

    if (onMealDeleted) {
      await onMealDeleted(editMeal.id)
    }

    setLoading(false)
    onClose()
  }

  const assigneeOptions = [
    { value: 'both', label: 'Samen', bg: 'bg-pastel-lavender/30', activeBg: 'bg-pastel-lavenderDark', ring: 'ring-pastel-lavenderDark' },
    { value: 'bijan', label: 'Bijan', bg: 'bg-brand-bijan/10', activeBg: 'bg-brand-bijan', ring: 'ring-brand-bijan' },
    { value: 'esther', label: 'Esther', bg: 'bg-brand-esther/10', activeBg: 'bg-brand-esther', ring: 'ring-brand-esther' },
  ]

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-end z-50 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto shadow-soft-lg animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {isEditing ? 'Taak wijzigen' : isEditingMeal ? 'Eten wijzigen' : 'Toevoegen'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {!isEditing && !isEditingMeal && (
          <div className="px-5 pt-2">
            <div className="flex bg-gray-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setMode('task')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  mode === 'task' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-500'
                }`}
              >
                Taak
              </button>
              <button
                type="button"
                onClick={() => setMode('meal')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  mode === 'meal' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-500'
                }`}
              >
                Eten
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {mode === 'task' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Taak</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Bijv. Stofzuigen"
                  className="input-field"
                  required={mode === 'task'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Opmerking</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Extra informatie..."
                  className="input-field resize-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Dag</label>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map((day, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDayOfWeek(i)}
                      className={`py-2 rounded-xl text-xs font-medium transition-all ${
                        dayOfWeek === i
                          ? 'bg-accent-mint text-white shadow-soft'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Toewijzen aan</label>
                <div ref={assigneeContainerRef} className="relative flex gap-2">
                  {/* Fluid pill indicator */}
                  {assigneePillStyle && (
                    <div
                      className="absolute top-0 bottom-0 rounded-xl shadow-soft pointer-events-none transition-all duration-300 ease-out ring-2 ring-offset-2"
                      style={{
                        left: assigneePillStyle.left,
                        width: assigneePillStyle.width,
                        backgroundColor: assigneeColorMap[assignedTo],
                        '--tw-ring-color': assigneeColorMap[assignedTo],
                      }}
                    />
                  )}
                  {assigneeOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      ref={el => { assigneeBtnRefs.current[opt.value] = el }}
                      onClick={() => setAssignedTo(opt.value)}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors duration-300 flex items-center justify-center gap-1.5 relative z-10 ${
                        assignedTo === opt.value
                          ? 'text-white'
                          : `${opt.bg} text-gray-500 hover:opacity-80`
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={`w-12 h-7 rounded-full transition-all duration-300 ${
                    isRecurring ? 'bg-accent-mint' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${
                    isRecurring ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
                <span className="text-sm text-gray-600">Elke week herhalen</span>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Maaltijd</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMealType('lunch')}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                      mealType === 'lunch'
                        ? 'bg-accent-peach text-white shadow-soft'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    🍞 Lunch
                  </button>
                  <button
                    type="button"
                    onClick={() => setMealType('dinner')}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                      mealType === 'dinner'
                        ? 'bg-accent-peach text-white shadow-soft'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    🍝 Diner
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Wat gaan we eten?</label>
                <input
                  type="text"
                  value={mealName}
                  onChange={e => setMealName(e.target.value)}
                  placeholder="Bijv. Pasta, Stamppot, Pizza..."
                  className="input-field"
                  required={mode === 'meal'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Dag</label>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map((day, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDayOfWeek(i)}
                      className={`py-2 rounded-xl text-xs font-medium transition-all ${
                        dayOfWeek === i
                          ? 'bg-accent-peach text-white shadow-soft'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'task' ? !title.trim() : !mealName.trim())}
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : isEditing ? 'Wijzigingen opslaan' : isEditingMeal ? 'Wijzigingen opslaan' : mode === 'task' ? 'Taak toevoegen' : 'Eten toevoegen'}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="w-full py-3 text-red-500 font-medium text-sm hover:bg-red-50 rounded-xl transition-colors"
            >
              Taak verwijderen
            </button>
          )}

          {isEditingMeal && (
            <button
              type="button"
              onClick={handleDeleteMeal}
              disabled={loading}
              className="w-full py-3 text-red-500 font-medium text-sm hover:bg-red-50 rounded-xl transition-colors"
            >
              Eten verwijderen
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
