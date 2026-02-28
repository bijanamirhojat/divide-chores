import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { isPushSupported, getSubscriptionStatus, subscribeToPush, unsubscribeFromPush } from '../lib/pushSubscription'
import AnimatedOverlay from './AnimatedOverlay'

const APP_VERSION = import.meta.env.APP_VERSION || '0.0.0'
const BUILD_ID = import.meta.env.BUILD_ID || 'dev'

export default function Menu({ show, onClose, onLogout, currentUser, presentationMode, onTogglePresentation, onUpdateUser, onOpenStats }) {
  const [showHistory, setShowHistory] = useState(false)
  const [completedTasks, setCompletedTasks] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsSupported, setNotificationsSupported] = useState(true)
  const fileInputRef = useRef(null)

  useEffect(() => {
    checkNotificationStatus()
  }, [])

  async function checkNotificationStatus() {
    if (!isPushSupported()) {
      setNotificationsSupported(false)
      return
    }
    const status = await getSubscriptionStatus()
    setNotificationsEnabled(status === 'subscribed')
    if (status === 'denied') setNotificationsSupported(false)
  }

  async function handleToggleNotifications() {
    if (notificationsLoading) return
    setNotificationsLoading(true)
    try {
      if (notificationsEnabled) {
        await unsubscribeFromPush()
        setNotificationsEnabled(false)
      } else {
        await subscribeToPush(currentUser.id)
        setNotificationsEnabled(true)
      }
    } catch (err) {
      console.error('Notification toggle failed:', err)
      // Re-check actual status
      const status = await getSubscriptionStatus()
      setNotificationsEnabled(status === 'subscribed')
      if (status === 'denied') setNotificationsSupported(false)
    } finally {
      setNotificationsLoading(false)
    }
  }

  async function loadHistory() {
    setLoadingHistory(true)
    const { data } = await supabase
      .from('completed_tasks')
      .select('*, tasks(title, day_of_week), users(name)')
      .order('completed_at', { ascending: false })
      .limit(50)
    
    if (data) setCompletedTasks(data)
    setLoadingHistory(false)
  }

  function handleShowHistory() {
    setShowHistory(true)
    loadHistory()
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Resize to max 256x256 to keep base64 small and avoid DB/query issues
    const base64 = await resizeImage(file, 256)
    if (onUpdateUser) {
      await onUpdateUser({ avatar_url: base64 })
    }
  }

  function resizeImage(file, maxSize) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let w = img.width
          let h = img.height
          if (w > h) {
            if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize }
          } else {
            if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize }
          }
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', 0.8))
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  async function handleRemoveAvatar() {
    if (onUpdateUser) {
      await onUpdateUser({ avatar_url: null })
    }
  }

  const menuItems = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      label: 'Voltooide taken',
      onClick: handleShowHistory,
      bg: 'bg-pastel-mint/30',
      iconBg: 'bg-pastel-mint',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      label: presentationMode ? 'Presentatie uit' : 'Presentatie aan',
      onClick: onTogglePresentation,
      closeOnClick: true,
      bg: 'bg-pastel-lavender/30',
      iconBg: 'bg-pastel-lavender',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      label: (
        <span className="flex items-center gap-2">
          Statistieken
          <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-medium">BETA</span>
        </span>
      ),
      onClick: onOpenStats,
      bg: 'bg-pastel-peach/30',
      iconBg: 'bg-pastel-peach',
    },
  ]

  const dayNames = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

  return (
    <AnimatedOverlay show={show} onClose={onClose} direction="right" className="flex h-full ml-auto w-full max-w-sm">
      <div 
        className="bg-white w-full h-full shadow-soft-lg overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Menu</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="bg-gradient-to-br from-pastel-mint/50 to-pastel-lavender/30 rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <button 
                  onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                  className="relative"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-soft flex items-center justify-center overflow-hidden">
                    {currentUser?.avatar_url ? (
                      <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">
                        {currentUser?.name === 'Bijan' ? '👨' : '👩'}
                      </span>
                    )}
                  </div>
                  {/* Always-visible camera badge for mobile */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full shadow-soft flex items-center justify-center border border-gray-100">
                    <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </button>
                {showAvatarMenu && (
                  <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-soft-lg border border-gray-100 overflow-hidden z-10 min-w-[180px] animate-fade-in">
                    <button
                      onClick={() => {
                        setShowAvatarMenu(false)
                        fileInputRef.current?.click()
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Foto wijzigen
                    </button>
                    {currentUser?.avatar_url && (
                      <button
                        onClick={() => {
                          setShowAvatarMenu(false)
                          handleRemoveAvatar()
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors border-t border-gray-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Foto verwijderen
                      </button>
                    )}
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <div>
                <p className="text-xs text-gray-500">Ingelogd als</p>
                <p className="text-lg font-semibold text-gray-800">{currentUser?.name}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick()
                  if (item.closeOnClick) onClose()
                }}
                className="w-full p-4 rounded-2xl text-left flex items-center gap-4 hover:shadow-soft transition-all duration-200 active:bg-gray-50"
              >
                <div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center text-gray-600`}>
                  {item.icon}
                </div>
                <span className={`font-medium ${item.textColor || 'text-gray-700'}`}>{item.label}</span>
              </button>
            ))}
          </div>

          {notificationsSupported && (
            <button
              onClick={handleToggleNotifications}
              className="w-full p-4 rounded-2xl text-left flex items-center gap-4 hover:shadow-soft transition-all duration-200 active:bg-gray-50"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <span className="font-medium text-gray-700">Meldingen</span>
              <span className="ml-auto">
                {notificationsLoading ? (
                  <svg className="animate-spin w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <span className={`block w-11 h-6 rounded-full transition-colors duration-200 ${notificationsEnabled ? 'bg-accent-mint' : 'bg-gray-200'}`}>
                    <span className={`block w-5 h-5 mt-0.5 rounded-full bg-white shadow transition-transform duration-200 ${notificationsEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                  </span>
                )}
              </span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="w-full p-4 rounded-2xl text-left flex items-center gap-4 hover:bg-red-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-500 group-hover:bg-red-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <span className="font-medium text-red-500">Uitloggen</span>
          </button>

          <div className="pt-4 border-t border-gray-100 mt-2">
            <p className="text-xs text-gray-300 text-center">
              Divide/Chores v{APP_VERSION} &middot; build {BUILD_ID}
            </p>
          </div>
        </div>
      </div>

      <AnimatedOverlay show={showHistory} onClose={() => setShowHistory(false)} direction="up" className="flex items-end h-full" zIndex={60}>
        <div 
          className="bg-white rounded-t-3xl w-full max-h-[80vh] overflow-y-auto shadow-soft-lg"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white rounded-t-3xl z-10">
            <h2 className="text-xl font-semibold text-gray-800">Voltooide taken</h2>
            <button onClick={() => setShowHistory(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-5">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <svg className="animate-spin w-6 h-6 text-accent-mint" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : completedTasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-400">Nog geen voltooide taken</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedTasks.map(ct => (
                  <div key={ct.id} className="p-4 bg-gray-50 rounded-2xl">
                    <p className="font-medium text-gray-700">{ct.tasks?.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-gray-400">{ct.users?.name}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-400">
                        {dayNames[ct.tasks?.day_of_week]} • {new Date(ct.completed_at).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AnimatedOverlay>
    </AnimatedOverlay>
  )
}
