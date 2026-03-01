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

  // === iPhone-style swipe-to-delete ===
  const [swipeX, setSwipeX] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  const touchStartRef = useRef({ x: 0, y: 0 })
  const currentSwipeRef = useRef(0)
  const containerRef = useRef(null)
  const animFrameRef = useRef(null)

  const OPEN_THRESHOLD = 80   // Snap to open at this distance
  const DELETE_THRESHOLD = 160 // Auto-delete if swiped this far
  const SNAP_POSITION = -80    // Open position shows delete button
  const RESISTANCE = 0.3       // Rubber band resistance past snap position

  // Reset when resetKey changes (another item opened)
  useEffect(() => {
    if (isOpen) {
      setSwipeX(0)
      setIsOpen(false)
      currentSwipeRef.current = 0
    }
  }, [resetKey])

  // Animate delete with slide-out
  const performDelete = useCallback(() => {
    if (isDeleting) return
    setIsDeleting(true)
    // Slide out fully, then call delete
    setSwipeX(-window.innerWidth)
    setTimeout(() => {
      onDelete?.()
    }, 250)
  }, [onDelete, isDeleting])

  // Use imperative touch listeners so we can use { passive: false }
  // This allows us to preventDefault on horizontal swipes to stop the carousel
  const gestureRef = useRef({ decided: false, horizontal: false })
  
  useEffect(() => {
    const el = containerRef.current
    if (!el || presentationMode) return

    function onTouchStart(e) {
      if (isDeleting) return
      const touch = e.touches[0]
      touchStartRef.current = { x: touch.clientX, y: touch.clientY }
      gestureRef.current = { decided: false, horizontal: false }
      setIsDragging(false)
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }

    function onTouchMove(e) {
      if (isDeleting) return
      const touch = e.touches[0]
      const dx = touch.clientX - touchStartRef.current.x
      const dy = touch.clientY - touchStartRef.current.y

      // First 8px of movement decides direction
      if (!gestureRef.current.decided) {
        const totalMove = Math.abs(dx) + Math.abs(dy)
        if (totalMove < 8) return

        if (Math.abs(dx) > Math.abs(dy)) {
          gestureRef.current = { decided: true, horizontal: true }
          setIsDragging(true)
          e.preventDefault() // Stop carousel from scrolling
        } else {
          gestureRef.current = { decided: true, horizontal: false }
          return
        }
      }

      if (!gestureRef.current.horizontal) return
      e.preventDefault()

      // Calculate swipe position
      const startOffset = currentSwipeRef.current === SNAP_POSITION ? SNAP_POSITION : 0
      let newX = startOffset + dx

      // Only allow left swipe
      if (newX > 0) {
        newX = newX * RESISTANCE
      } else if (newX < SNAP_POSITION) {
        const extra = newX - SNAP_POSITION
        newX = SNAP_POSITION + extra * RESISTANCE
      }

      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
      animFrameRef.current = requestAnimationFrame(() => {
        setSwipeX(newX)
      })
      // Store for touchEnd
      touchStartRef.current._lastX = newX
    }

    function onTouchEnd() {
      if (isDeleting || !gestureRef.current.horizontal) {
        gestureRef.current = { decided: false, horizontal: false }
        setIsDragging(false)
        return
      }

      setIsDragging(false)
      const currentX = touchStartRef.current._lastX ?? 0

      if (currentX < -DELETE_THRESHOLD) {
        performDelete()
      } else if (currentX < -(OPEN_THRESHOLD / 2)) {
        setSwipeX(SNAP_POSITION)
        currentSwipeRef.current = SNAP_POSITION
        setIsOpen(true)
        onDeleteAttempt?.()
      } else {
        setSwipeX(0)
        currentSwipeRef.current = 0
        setIsOpen(false)
      }

      gestureRef.current = { decided: false, horizontal: false }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false }) // non-passive!
    el.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [isDeleting, isOpen, performDelete, onDeleteAttempt, presentationMode])

  // Compute delete button reveal (0 to 1)
  const revealProgress = Math.min(1, Math.abs(swipeX) / Math.abs(SNAP_POSITION))

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
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl"
      style={{
        opacity: isDeleting ? 0 : 1,
        maxHeight: isDeleting ? 0 : 200,
        marginBottom: isDeleting ? 0 : undefined,
        transition: isDeleting 
          ? 'opacity 0.25s ease-out, max-height 0.3s ease-out 0.1s, margin-bottom 0.3s ease-out 0.1s' 
          : undefined,
      }}
    >
      {/* Delete button background - fixed behind the card */}
      <div 
        className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6 rounded-2xl"
        style={{ 
          opacity: revealProgress,
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (isOpen) performDelete()
        }}
      >
        <div 
          className="flex flex-col items-center gap-1 text-white"
          style={{
            transform: `scale(${0.5 + revealProgress * 0.5})`,
            opacity: revealProgress,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out',
          }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-xs font-medium">Verwijder</span>
        </div>
      </div>

      {/* Swipeable card */}
      <div 
        className={`task-card group relative ${isCompleted ? 'opacity-60' : ''}`}
        onClick={() => {
          if (isOpen) {
            // Close if open
            setSwipeX(0)
            currentSwipeRef.current = 0
            setIsOpen(false)
            return
          }
          onEdit && onEdit(task)
        }}
        style={{ 
          borderLeftWidth: '3px', 
          borderLeftColor: config.borderColor,
          transform: `translateX(${swipeX}px)`,
          transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          willChange: isDragging ? 'transform' : 'auto',
        }}
      >
        <div className="flex items-start gap-3">
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
            <p className={`font-medium truncate transition-all ${isCompleted ? 'line-through text-gray-400' : 'text-gray-700'} ${presentationMode ? 'text-base' : 'text-sm'}`}>
              {task.title}
            </p>
            {task.description && (
              <p className={`text-gray-400 truncate mt-0.5 ${presentationMode ? 'text-sm' : 'text-xs'}`}>
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
