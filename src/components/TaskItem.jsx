export default function TaskItem({ task, isCompleted, onComplete, onUncomplete, users, isToday, presentationMode }) {
  const assignee = task.is_both 
    ? 'Samen' 
    : users.find(u => u.id === task.assigned_to)?.name || 'Niemand'

  const assigneeColor = task.is_both 
    ? 'bg-purple-100 border-purple-400'
    : assignee === 'Bijan' 
      ? 'bg-blue-100 border-bijan'
      : assignee === 'Esther'
        ? 'bg-pink-100 border-esther'
        : 'bg-gray-100 border-gray-400'

  return (
    <div
      className={`task-card ${isCompleted ? 'opacity-50' : ''} ${presentationMode ? 'p-4 mb-3' : 'p-2 mb-1'}`}
      style={{ borderLeftColor: assignee === 'Bijan' ? '#3b82f6' : assignee === 'Esther' ? '#f472b6' : task.is_both ? '#9333ea' : '#9ca3af' }}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (isCompleted) {
              onUncomplete()
            } else {
              onComplete()
            }
          }}
          className={`mt-1 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all ${
            isCompleted 
              ? 'bg-emerald-500 border-emerald-500' 
              : 'border-gray-300 hover:border-emerald-400'
          }`}
        >
          {isCompleted && (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <p className={`font-medium truncate ${isCompleted ? 'line-through text-gray-400' : ''} ${presentationMode ? 'text-base' : 'text-xs'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className={`text-gray-500 truncate ${presentationMode ? 'text-sm' : 'text-xs'}`}>
              {task.description}
            </p>
          )}
          {presentationMode && (
            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${assigneeColor}`}>
              {assignee}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
