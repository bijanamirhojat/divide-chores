import { useState, useRef, useEffect, useCallback } from 'react'

export default function TaskItem({ task, isCompleted, onComplete, onUncomplete, onEdit, onDelete, onDeleteAttempt, users, isToday, presentationMode, resetKey }) {
  const assignedUser = users.find(u => u.id === task.assigned_to)
  const assignee = task.is_both 
    ? 'Samen' 
    : assignedUser?.name || 'Niemand'

  const assigneeAvatar = task.is_both ? null : assignedUser?.avatar_url

  const assigneeConfig = {
    'Samen': { bg: 'bg-pastel-lavender', text: 'text-pastel-lavenderDark', dot: 'bg-pastel-lavenderDark', borderColor: '#B89DD4' },
    'Bijan': { bg: 'bg-brand-bijan/20', text: 'text-brand-bijan', dot: 'bg-brand-bijan', borderColor: '#8BB8E8' },
    'Esther': { bg: 'bg-brand-esther/20', text: 'text-brand-esther', dot: 'bg-brand-esther', borderColor: '#F5A8C0' },
  }

  const config = assigneeConfig[assignee] || { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400', borderColor: '#D1D5DB' }

  // Swipe-to-delete state
  const [swipeX, setSwipeX] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const touchStartRef = useRef(null)
  const gestureRef = useRef(null) // null | 'horizontal' | 'vertical'
  const startSwipeRef = useRef(0)
  const currentSwipeRef = useRef(0) // track current value for touchEnd

  const SNAP_OPEN = -80
  const AUTO_DELETE = -140
  const RESISTANCE = 0.3

  useEffect(() => {
    setSwipeX(0)
    setIsOpen(false)
    gestureRef.current = null
    currentSwipeRef.current = 0
  }, [resetKey])

  // Keep ref in sync with state
  useEffect(() => {
    currentSwipeRef.current = swipeX
  }, [swipeX])

  const handleTouchStart = useCallback((e) => {
    if (isDismissing) return
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    gestureRef.current = null
    startSwipeRef.current = isOpen ? SNAP_OPEN : 0
  }, [isOpen, isDismissing])

  const handleTouchMove = useCallback((e) => {
    if (!touchStartRef.current || isDismissing) return
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y

    // Determine gesture on first significant movement
    if (gestureRef.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      gestureRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
      if (gestureRef.current === 'horizontal') {
        onDeleteAttempt?.()
      }
    }

    if (gestureRef.current !== 'horizontal') return
    e.preventDefault()

    let raw = startSwipeRef.current + dx
    if (raw > 0) raw = 0

    // Rubber-band past snap point
    if (raw < SNAP_OPEN) {
      const overflow = raw - SNAP_OPEN
      raw = SNAP_OPEN + overflow * RESISTANCE
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

    // Auto-dismiss if swiped far enough
    if (x < AUTO_DELETE * 0.75) {
      setIsDismissing(true)
      setSwipeX(-window.innerWidth)
      setTimeout(() => onDelete?.(), 300)
      return
    }

    // Snap open or closed
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

  if (presentationMode) {
    return (
      <div
        onClick={() => onEdit && onEdit(task)}
        className={`flex items-center gap-3 p-2 rounded-lg bg-white/80 hover:bg-white transition-all cursor-pointer ${isCompleted ? 'opacity-50' : ''}`}
      >
        <div
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            if (isCompleted) {
              onUncomplete()
            } else {
              onComplete()
            }
          }}
          className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${isCompleted ? 'bg-accent-mint border-accent-mint' : 'border-gray-300 hover:border-accent-mint bg-white'}`}
        >
          {isCompleted && (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm leading-tight whitespace-normal ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {task.title}
          </p>
        </div>

        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dot}`} title={assignee}>
          {assigneeAvatar && (
            <img src={assigneeAvatar} alt={assignee} className="w-full h-full rounded-full object-cover" />
          )}
        </div>
      </div>
    )
  }

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
      {/* Red delete background */}
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

      {/* Foreground card */}
      <div 
        className="task-card group relative"
        onClick={() => {
          if (isOpen) {
            setSwipeX(0)
            setIsOpen(false)
            return
          }
          onEdit && onEdit(task)
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          borderLeftWidth: '3px', 
          borderLeftColor: config.borderColor,
          transform: `translateX(${swipeX}px)`,
          transition,
          marginBottom: 0,
        }}
      >
        <div className={`flex items-start gap-3 ${isCompleted ? 'opacity-60' : ''}`}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              if (isCompleted) {
                onUncomplete()
              } else {
                onComplete()
              }
            }}
            className={`mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
              isCompleted 
                ? 'bg-accent-mint border-accent-mint' 
                : 'border-gray-300 hover:border-accent-mint bg-white group-hover:shadow-soft'
            }`}
          >
            {isCompleted && (
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <p className={`font-medium truncate transition-all ${isCompleted ? 'line-through text-gray-400' : 'text-gray-700'} text-sm`}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-gray-400 truncate mt-0.5 text-xs">
                {task.description}
              </p>
            )}
            <span className={`inline-flex items-center mt-2 text-xs px-2.5 py-1 rounded-lg font-medium ${config.bg} ${config.text}`}>
              {assigneeAvatar ? (
                <img src={assigneeAvatar} alt={assignee} className="w-4 h-4 rounded-full object-cover mr-1.5" />
              ) : null}
              {assignee}
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
