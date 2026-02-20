import { useState, useRef } from 'react'

export default function TaskItem({ task, isCompleted, onComplete, onUncomplete, onEdit, onDelete, users, isToday, presentationMode }) {
  const assignee = task.is_both 
    ? 'Samen' 
    : users.find(u => u.id === task.assigned_to)?.name || 'Niemand'

  const assigneeConfig = {
    'Samen': { bg: 'bg-pastel-lavender', border: 'border-pastel-lavenderDark', text: 'text-pastel-lavenderDark', dot: 'bg-pastel-lavenderDark' },
    'Bijan': { bg: 'bg-brand-bijan/20', border: 'border-brand-bijan', text: 'text-brand-bijan', dot: 'bg-brand-bijan' },
    'Esther': { bg: 'bg-brand-esther/20', border: 'border-brand-esther', text: 'text-brand-esther', dot: 'bg-brand-esther' },
  }

  const config = assigneeConfig[assignee] || { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', dot: 'bg-gray-400' }

  if (presentationMode) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-lg ${isCompleted ? 'opacity-50' : 'opacity-100'}`}>
        <div className={`flex-1 min-w-0`}>
          <p className={`font-medium text-sm leading-tight whitespace-normal ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {task.title}
          </p>
        </div>

        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dot}`} title={assignee} />
      </div>
    )
  }

  const [swipeX, setSwipeX] = useState(0)
  const touchStartX = useRef(null)

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchMove(e) {
    if (!touchStartX.current) return
    const diff = e.touches[0].clientX - touchStartX.current
    if (diff < 0) {
      setSwipeX(Math.max(diff, -80))
    }
  }

  function handleTouchEnd() {
    if (swipeX < -60 && onDelete) {
      onDelete()
    }
    setSwipeX(0)
    touchStartX.current = null
  }

  return (
    <div
      onClick={() => onEdit && onEdit(task)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`task-card group ${isCompleted ? 'opacity-60' : ''}`}
      style={{ 
        borderLeftWidth: '3px', 
        borderLeftColor: config.border.replace('border-', ''),
        transform: `translateX(${swipeX}px)`,
        transition: swipeX === 0 ? 'transform 0.2s' : 'none'
      }}
    >
      {swipeX < -20 && (
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center rounded-r-xl">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
      )}
      <div className="flex items-start gap-3 relative z-10 bg-white p-4 mb-3 rounded-xl">
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
            {assignee}
          </span>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
      </div>
    </div>
  )
}
