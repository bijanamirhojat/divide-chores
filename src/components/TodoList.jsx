import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import AnimatedOverlay from './AnimatedOverlay'

function TodoItem({ item, onComplete, onEdit, onDelete, onDeleteAttempt }) {
  const [swipeX, setSwipeX] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const touchStartRef = useRef(null)
  const gestureRef = useRef(null)
  const startSwipeRef = useRef(0)
  const currentSwipeRef = useRef(0)

  const SNAP_OPEN = -80
  const AUTO_DELETE = -140
  const RESISTANCE = 0.3

  useEffect(() => {
    currentSwipeRef.current = swipeX
  }, [swipeX])

  const handleTouchStart = useCallback((e) => {
    if (isDismissing) return
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    gestureRef.current = null
    startSwipeRef.current = isOpen ? SNAP_OPEN : 0
  }, [isDismissing, isOpen])

  const handleTouchMove = useCallback((e) => {
    if (!touchStartRef.current || isDismissing) return
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y

    if (gestureRef.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      gestureRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
      if (gestureRef.current === 'horizontal') onDeleteAttempt?.()
    }

    if (gestureRef.current !== 'horizontal') return
    e.preventDefault()

    let raw = startSwipeRef.current + dx
    if (raw > 0) raw = 0
    if (raw < SNAP_OPEN) {
      raw = SNAP_OPEN + (raw - SNAP_OPEN) * RESISTANCE
    }
    setSwipeX(raw)
  }, [isDismissing, onDeleteAttempt])

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current || isDismissing) return
    touchStartRef.current = null

    if (gestureRef.current !== 'horizontal') {
      gestureRef.current = null
      return
    }
    gestureRef.current = null

    const x = currentSwipeRef.current
    if (x < AUTO_DELETE * 0.75) {
      setIsDismissing(true)
      setSwipeX(-window.innerWidth)
      setTimeout(() => onDelete?.(), 300)
      return
    }
    if (x < SNAP_OPEN * 0.5) {
      setSwipeX(SNAP_OPEN)
      setIsOpen(true)
    } else {
      setSwipeX(0)
      setIsOpen(false)
    }
  }, [isDismissing, onDelete])

  const handleDeleteClick = useCallback((e) => {
    e.stopPropagation()
    setIsDismissing(true)
    setSwipeX(-window.innerWidth)
    setTimeout(() => onDelete?.(), 300)
  }, [onDelete])

  const isActivelyDragging = gestureRef.current === 'horizontal'
  const transition = isActivelyDragging
    ? 'none'
    : isDismissing
      ? 'transform 0.3s ease-in'
      : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)'

  const revealProgress = Math.min(1, Math.abs(swipeX) / Math.abs(SNAP_OPEN))

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        marginBottom: '0.75rem',
        opacity: isDismissing ? 0 : 1,
        maxHeight: isDismissing ? 0 : 500,
        transition: isDismissing
          ? 'opacity 0.2s ease-out, max-height 0.3s 0.05s ease-out, margin-bottom 0.3s 0.05s ease-out'
          : 'none',
        ...(isDismissing ? { marginBottom: 0 } : {}),
      }}
    >
      <div
        className="absolute inset-0 bg-red-500 flex items-center justify-end rounded-2xl"
        onClick={handleDeleteClick}
        style={{ paddingRight: '1.25rem' }}
      >
        <div
          className="flex items-center gap-2 text-white font-medium"
          style={{
            opacity: revealProgress,
            transform: `scale(${0.6 + revealProgress * 0.4})`,
            transition: isActivelyDragging ? 'none' : 'opacity 0.15s, transform 0.15s',
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-sm">Verwijder</span>
        </div>
      </div>

      <div
        className="task-card group relative"
        onClick={() => {
          if (isOpen) {
            setSwipeX(0)
            setIsOpen(false)
            return
          }
          onEdit?.(item)
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          borderLeftWidth: '3px',
          borderLeftColor: '#7BC4A8',
          transform: `translateX(${swipeX}px)`,
          transition,
          marginBottom: 0,
        }}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onComplete(item)
            }}
            className="mt-0.5 w-6 h-6 rounded-full border-2 border-gray-300 hover:border-accent-mint bg-white group-hover:shadow-soft flex-shrink-0 flex items-center justify-center transition-all duration-200"
            aria-label={`Rond ${item.title} af`}
          />

          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-700 text-sm truncate">{item.title}</p>
            {item.description && (
              <p className="text-gray-400 truncate mt-0.5 text-xs">{item.description}</p>
            )}
            <span className="inline-flex items-center mt-2 text-xs px-2.5 py-1 rounded-lg font-medium bg-pastel-mint/30 text-accent-mint">
              Van mij
            </span>
          </div>

          <div className="opacity-40 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TodoList({ show, onClose, currentUser, onTaskCompleted }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (show && currentUser?.id) {
      loadItems()
    }
  }, [show, currentUser?.id])

  async function loadItems() {
    setLoading(true)
    setErrorMessage('')

    const { data, error } = await supabase
      .from('todo_items')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMessage('Kon de to-do lijst niet laden')
    } else if (data) {
      setItems(data)
    }

    setLoading(false)
  }

  async function handleDelete(item) {
    const { error } = await supabase
      .from('todo_items')
      .delete()
      .eq('id', item.id)

    if (!error) {
      setItems(prev => prev.filter(entry => entry.id !== item.id))
    }
  }

  async function handleSave(itemData) {
    setSaving(true)
    setErrorMessage('')

    if (itemData.id) {
      const { id, ...updates } = itemData
      const { data, error } = await supabase
        .from('todo_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        setErrorMessage('Opslaan is niet gelukt')
      } else if (data) {
        setItems(prev => prev.map(entry => entry.id === id ? data : entry))
        setEditingItem(null)
        setShowAddModal(false)
      }
    } else {
      const { data, error } = await supabase
        .from('todo_items')
        .insert({
          ...itemData,
          user_id: currentUser.id,
        })
        .select()
        .single()

      if (error) {
        setErrorMessage('Toevoegen is niet gelukt')
      } else if (data) {
        setItems(prev => [data, ...prev])
        setEditingItem(null)
        setShowAddModal(false)
      }
    }

    setSaving(false)
  }

  async function handleComplete(item) {
    if (saving) return

    setSaving(true)
    setErrorMessage('')

    const today = new Date()
    const scheduledDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const weekNumber = getWeekNumber(today)
    const year = today.getFullYear()

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: item.title,
        description: item.description || null,
        scheduled_date: scheduledDate,
        recurrence: null,
        assigned_to: currentUser.id,
        is_both: false,
        created_by: currentUser.id,
      })
      .select()
      .single()

    if (taskError || !task) {
      setErrorMessage('Afronden is niet gelukt')
      setSaving(false)
      return
    }

    const { error: completedError } = await supabase
      .from('completed_tasks')
      .insert({
        task_id: task.id,
        user_id: currentUser.id,
        week_number: weekNumber,
        year,
      })

    if (completedError) {
      await supabase.from('tasks').delete().eq('id', task.id)
      setErrorMessage('Afronden is niet gelukt')
      setSaving(false)
      return
    }

    const { error: deleteError } = await supabase
      .from('todo_items')
      .delete()
      .eq('id', item.id)

    if (deleteError) {
      setErrorMessage('Taak is afgerond, maar staat nog in je to-do lijst')
      setSaving(false)
      if (onTaskCompleted) onTaskCompleted()
      return
    }

    setItems(prev => prev.filter(entry => entry.id !== item.id))
    setSaving(false)
    if (onTaskCompleted) onTaskCompleted()
  }

  return (
    <AnimatedOverlay show={show} onClose={onClose} direction="up" className="w-full h-full">
      <div
        className="bg-white w-full h-full overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">To-do lijst</h2>
            <p className="text-sm text-gray-400 mt-0.5">Alleen voor {currentUser?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 pb-24">
          {errorMessage && (
            <div className="mb-4 rounded-2xl bg-red-50 text-red-500 text-sm px-4 py-3">
              {errorMessage}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin w-6 h-6 text-accent-mint" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-pastel-mint/30 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-accent-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">Je to-do lijst is leeg</p>
              <p className="text-gray-300 text-xs mt-1">Tik op + om iets toe te voegen</p>
            </div>
          ) : (
            <div>
              {items.map(item => (
                <TodoItem
                  key={item.id}
                  item={item}
                  onComplete={handleComplete}
                  onEdit={(entry) => setEditingItem(entry)}
                  onDelete={() => handleDelete(item)}
                  onDeleteAttempt={() => {}}
                />
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-accent-mint text-white rounded-2xl shadow-soft-lg flex items-center justify-center active:scale-95 transition-transform z-20"
          disabled={saving}
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {(showAddModal || editingItem) && (
          <TodoItemModal
            item={editingItem}
            saving={saving}
            onSave={handleSave}
            onClose={() => {
              setShowAddModal(false)
              setEditingItem(null)
            }}
            onDelete={editingItem ? () => {
              handleDelete(editingItem)
              setEditingItem(null)
            } : null}
          />
        )}
      </div>
    </AnimatedOverlay>
  )
}

function TodoItemModal({ item, saving, onSave, onClose, onDelete }) {
  const [title, setTitle] = useState(item?.title || '')
  const [description, setDescription] = useState(item?.description || '')
  const [modalMaxHeight, setModalMaxHeight] = useState(null)
  const activeFieldRef = useRef(null)

  const isEditing = !!item

  useEffect(() => {
    function updateViewportLayout() {
      const viewport = window.visualViewport
      const viewportHeight = viewport?.height ?? window.innerHeight
      setModalMaxHeight(Math.max(320, Math.floor(viewportHeight - 12)))

      if (activeFieldRef.current) {
        window.setTimeout(() => {
          activeFieldRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }, 60)
      }
    }

    updateViewportLayout()

    const viewport = window.visualViewport
    viewport?.addEventListener('resize', updateViewportLayout)
    viewport?.addEventListener('scroll', updateViewportLayout)
    window.addEventListener('resize', updateViewportLayout)

    return () => {
      viewport?.removeEventListener('resize', updateViewportLayout)
      viewport?.removeEventListener('scroll', updateViewportLayout)
      window.removeEventListener('resize', updateViewportLayout)
    }
  }, [])

  function handleFieldFocus(e) {
    activeFieldRef.current = e.target
    window.setTimeout(() => {
      e.target.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 250)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return

    await onSave({
      id: item?.id,
      title: title.trim(),
      description: description.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-end z-[60] animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto shadow-soft-lg animate-slide-up"
        style={{ maxHeight: modalMaxHeight ? `${modalMaxHeight}px` : undefined }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {isEditing ? 'To-do wijzigen' : 'To-do toevoegen'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-5"
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Taak</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onFocus={handleFieldFocus}
              placeholder="Bijv. Lamp vervangen"
              className="input-field"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Opmerking</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              onFocus={handleFieldFocus}
              placeholder="Extra informatie..."
              className="input-field resize-none"
              rows={2}
            />
          </div>

          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
          >
            {saving ? (
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : isEditing ? 'Wijzigingen opslaan' : 'To-do toevoegen'}
          </button>

          {isEditing && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Weet je zeker dat je deze to-do wilt verwijderen?')) {
                  onDelete()
                }
              }}
              disabled={saving}
              className="w-full py-3 text-red-500 font-medium text-sm hover:bg-red-50 rounded-xl transition-colors"
            >
              To-do verwijderen
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

function getWeekNumber(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}
