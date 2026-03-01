import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import AnimatedOverlay from './AnimatedOverlay'

const PRICE_LABELS = { 1: '\u20AC', 2: '\u20AC\u20AC', 3: '\u20AC\u20AC\u20AC' }
const PRICE_COLORS = {
  1: 'bg-pastel-mint/40 text-pastel-mintDark',
  2: 'bg-pastel-peach/40 text-pastel-peachDark',
  3: 'bg-pastel-rose/40 text-pastel-roseDark',
}

function WishlistItem({ wish, users, onToggleComplete, onEdit, onDelete, onDeleteAttempt }) {
  const addedByUser = users.find(u => u.id === wish.added_by)

  // Swipe-to-delete (same pattern as TaskItem)
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
  }, [isOpen, isDismissing])

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
          onEdit?.(wish)
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition,
          marginBottom: 0,
        }}
      >
        <div className={`flex items-start gap-3 ${wish.is_completed ? 'opacity-60' : ''}`}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleComplete(wish)
            }}
            className={`mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
              wish.is_completed
                ? 'bg-accent-mint border-accent-mint'
                : 'border-gray-300 hover:border-accent-mint bg-white group-hover:shadow-soft'
            }`}
          >
            {wish.is_completed && (
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`font-medium text-sm leading-tight ${wish.is_completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {wish.title}
              </p>
              {wish.price_indication && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-lg font-semibold flex-shrink-0 ${PRICE_COLORS[wish.price_indication]}`}>
                  {PRICE_LABELS[wish.price_indication]}
                </span>
              )}
            </div>

            {wish.note && (
              <p className="text-gray-400 text-xs mt-0.5 truncate">{wish.note}</p>
            )}

            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-gray-400">{addedByUser?.name || 'Onbekend'}</span>
              {wish.url && (
                <>
                  <span className="text-gray-300">&middot;</span>
                  <a
                    href={wish.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-accent-mint hover:text-pastel-mintDark transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </>
              )}
            </div>
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

export default function Wishlist({ show, onClose, currentUser, users }) {
  const [wishes, setWishes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingWish, setEditingWish] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  useEffect(() => {
    if (show) loadWishes()
  }, [show])

  async function loadWishes() {
    setLoading(true)
    const { data } = await supabase
      .from('wishes')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setWishes(data)
    setLoading(false)
  }

  async function handleToggleComplete(wish) {
    const newCompleted = !wish.is_completed
    const updates = {
      is_completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
    }

    // Optimistic update
    setWishes(prev => prev.map(w => w.id === wish.id ? { ...w, ...updates } : w))

    const { error } = await supabase
      .from('wishes')
      .update(updates)
      .eq('id', wish.id)

    if (error) {
      // Revert on error
      setWishes(prev => prev.map(w => w.id === wish.id ? wish : w))
    }
  }

  async function handleDelete(wish) {
    const { error } = await supabase
      .from('wishes')
      .delete()
      .eq('id', wish.id)

    if (!error) {
      setWishes(prev => prev.filter(w => w.id !== wish.id))
    }
  }

  async function handleSave(wishData) {
    if (wishData.id) {
      // Update
      const { id, ...updates } = wishData
      const { data, error } = await supabase
        .from('wishes')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (!error && data) {
        setWishes(prev => prev.map(w => w.id === id ? data : w))
      }
    } else {
      // Insert
      const { data, error } = await supabase
        .from('wishes')
        .insert({ ...wishData, added_by: currentUser.id })
        .select()
        .single()

      if (!error && data) {
        setWishes(prev => [data, ...prev])
      }
    }

    setEditingWish(null)
    setShowAddModal(false)
  }

  const activeWishes = wishes.filter(w => !w.is_completed)
  const completedWishes = wishes.filter(w => w.is_completed)

  // Group active wishes by category
  const groupedActive = {}
  activeWishes.forEach(w => {
    const cat = w.category || 'Algemeen'
    if (!groupedActive[cat]) groupedActive[cat] = []
    groupedActive[cat].push(w)
  })

  const existingCategories = [...new Set(wishes.map(w => w.category).filter(Boolean))]

  return (
    <AnimatedOverlay show={show} onClose={onClose} direction="up" className="w-full h-full">
      <div
        className="bg-white w-full h-full overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-800">Wishlist</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 pb-24">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin w-6 h-6 text-accent-mint" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : activeWishes.length === 0 && completedWishes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-pastel-lavender/30 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-pastel-lavenderDark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">Nog geen wensen</p>
              <p className="text-gray-300 text-xs mt-1">Tik op + om een wens toe te voegen</p>
            </div>
          ) : (
            <>
              {/* Active wishes grouped by category */}
              {Object.entries(groupedActive).map(([category, items]) => (
                <div key={category} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{category}</h3>
                    <span className="text-xs text-gray-300">{items.length}</span>
                  </div>
                  {items.map(wish => (
                    <WishlistItem
                      key={wish.id}
                      wish={wish}
                      users={users}
                      onToggleComplete={handleToggleComplete}
                      onEdit={(w) => setEditingWish(w)}
                      onDelete={() => handleDelete(wish)}
                      onDeleteAttempt={() => {}}
                    />
                  ))}
                </div>
              ))}

              {/* Completed section */}
              {completedWishes.length > 0 && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="flex items-center gap-2 mb-3 group"
                  >
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showCompleted ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Afgerond</span>
                    <span className="text-xs text-gray-300">{completedWishes.length}</span>
                  </button>

                  {showCompleted && (
                    <div className="animate-fade-in">
                      {completedWishes.map(wish => (
                        <WishlistItem
                          key={wish.id}
                          wish={wish}
                          users={users}
                          onToggleComplete={handleToggleComplete}
                          onEdit={(w) => setEditingWish(w)}
                          onDelete={() => handleDelete(wish)}
                          onDeleteAttempt={() => {}}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* FAB button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-accent-mint text-white rounded-2xl shadow-soft-lg flex items-center justify-center active:scale-95 transition-transform z-20"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Add / Edit modal */}
        {(showAddModal || editingWish) && (
          <WishlistItemModal
            wish={editingWish}
            existingCategories={existingCategories}
            onSave={handleSave}
            onClose={() => {
              setShowAddModal(false)
              setEditingWish(null)
            }}
            onDelete={editingWish ? () => {
              handleDelete(editingWish)
              setEditingWish(null)
            } : null}
          />
        )}
      </div>
    </AnimatedOverlay>
  )
}

function WishlistItemModal({ wish, existingCategories, onSave, onClose, onDelete }) {
  const [title, setTitle] = useState(wish?.title || '')
  const [note, setNote] = useState(wish?.note || '')
  const [url, setUrl] = useState(wish?.url || '')
  const [category, setCategory] = useState(wish?.category || '')
  const [priceIndication, setPriceIndication] = useState(wish?.price_indication || null)
  const [loading, setLoading] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const categoryInputRef = useRef(null)

  const isEditing = !!wish

  const filteredCategories = existingCategories.filter(c =>
    c.toLowerCase().includes(category.toLowerCase()) && c.toLowerCase() !== category.toLowerCase()
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !category.trim()) return

    setLoading(true)

    const wishData = {
      title: title.trim(),
      note: note.trim() || null,
      url: url.trim() || null,
      category: category.trim(),
      price_indication: priceIndication,
    }

    if (isEditing) {
      wishData.id = wish.id
    }

    await onSave(wishData)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-end z-[60] animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto shadow-soft-lg animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {isEditing ? 'Wens wijzigen' : 'Wens toevoegen'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Titel</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Bijv. Nieuwe lamp"
              className="input-field"
              required
              autoFocus
            />
          </div>

          {/* Category combobox */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-600 mb-2">Categorie</label>
            <input
              ref={categoryInputRef}
              type="text"
              value={category}
              onChange={e => {
                setCategory(e.target.value)
                setShowCategoryDropdown(true)
              }}
              onFocus={() => setShowCategoryDropdown(true)}
              onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
              placeholder="Bijv. Huis, Tuin, Keuken..."
              className="input-field"
              required
            />
            {showCategoryDropdown && filteredCategories.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-soft-lg border border-gray-100 overflow-hidden z-10 animate-fade-in">
                {filteredCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setCategory(cat)
                      setShowCategoryDropdown(false)
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Price indication */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Prijsindicatie <span className="text-gray-400 font-normal">(optioneel)</span></label>
            <div className="flex gap-2">
              {[1, 2, 3].map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPriceIndication(priceIndication === level ? null : level)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                    priceIndication === level
                      ? `${PRICE_COLORS[level]} ring-2 ring-offset-2 ${level === 1 ? 'ring-pastel-mintDark' : level === 2 ? 'ring-pastel-peachDark' : 'ring-pastel-roseDark'}`
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {PRICE_LABELS[level]}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Opmerking <span className="text-gray-400 font-normal">(optioneel)</span></label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Extra informatie..."
              className="input-field resize-none"
              rows={2}
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Link <span className="text-gray-400 font-normal">(optioneel)</span></label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
              className="input-field"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !title.trim() || !category.trim()}
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : isEditing ? 'Wijzigingen opslaan' : 'Wens toevoegen'}
          </button>

          {/* Delete button for editing */}
          {isEditing && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Weet je zeker dat je deze wens wilt verwijderen?')) {
                  onDelete()
                }
              }}
              disabled={loading}
              className="w-full py-3 text-red-500 font-medium text-sm hover:bg-red-50 rounded-xl transition-colors"
            >
              Wens verwijderen
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
