// v1.2.0 - meal editing + PWA update banner
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import WeekView from './components/WeekView'
import TaskModal from './components/TaskModal'
import Menu from './components/Menu'
import Stats from './components/Stats'
import Confetti from './components/Confetti'

function UpdateBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] animate-slide-down">
      <div className="bg-accent-mint/95 backdrop-blur-sm text-white px-4 py-3 shadow-soft-lg">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm font-medium">Nieuwe versie beschikbaar!</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-white text-accent-mint px-4 py-1.5 rounded-xl text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            Updaten
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [users, setUsers] = useState([])
  const [showMenu, setShowMenu] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [presentationMode, setPresentationMode] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('mode') === 'presentation'
  })
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    function onSwUpdate() {
      setShowUpdateBanner(true)
    }
    window.addEventListener('sw-update-available', onSwUpdate)
    return () => window.removeEventListener('sw-update-available', onSwUpdate)
  }, [])

  useEffect(() => {
    if (presentationMode && users.length > 0) {
      const params = new URLSearchParams(window.location.search)
      const pin = params.get('pin')
      if (pin && !currentUser && !isAutoLoggingIn) {
        setIsAutoLoggingIn(true)
        handleLogin(pin).then(matched => {
          setIsAutoLoggingIn(false)
          if (matched && matched.length > 0) {
            if (matched.length === 1) {
              setCurrentUser(matched[0])
            }
          }
        })
      }
    }
  }, [presentationMode, users, currentUser])

  async function loadUsers() {
    const { data } = await supabase.from('users').select('*').order('name')
    if (data) setUsers(data)
  }

  async function handleLogin(pin) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('pin', pin)
      .limit(2)
    
    if (data && data.length > 0) {
      if (data.length === 1) {
        setCurrentUser(data[0])
      }
      return data
    }
    return null
  }

  function handleSelectUser(user) {
    setCurrentUser(user)
  }

  async function handleUpdateUser(updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', currentUser.id)
      .select()
      .single()
    
    if (data && !error) {
      setCurrentUser(data)
      setUsers(users.map(u => u.id === data.id ? data : u))
    }
  }

  function handleLogout() {
    setCurrentUser(null)
    setSession(null)
  }

  function handleComplete() {
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 2000)
  }

  if (!currentUser) {
    return (
      <>
        {showUpdateBanner && <UpdateBanner />}
        <Login 
          onLogin={handleLogin} 
          onSelectUser={handleSelectUser}
          users={users}
        />
      </>
    )
  }

  return (
    <div className={`min-h-screen ${presentationMode ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {showUpdateBanner && <UpdateBanner />}
      {showConfetti && <Confetti />}
      
      <WeekView 
        currentUser={currentUser}
        users={users}
        onComplete={handleComplete}
        presentationMode={presentationMode}
        onTogglePresentation={() => setPresentationMode(!presentationMode)}
        onOpenMenu={() => setShowMenu(true)}
      />

      {showMenu && (
        <Menu 
          onClose={() => setShowMenu(false)}
          onLogout={handleLogout}
          currentUser={currentUser}
          presentationMode={presentationMode}
          onTogglePresentation={() => setPresentationMode(!presentationMode)}
          onUpdateUser={handleUpdateUser}
          onOpenStats={() => {
            setShowMenu(false)
            setShowStats(true)
          }}
        />
      )}

      {showStats && (
        <Stats 
          onClose={() => setShowStats(false)}
          users={users}
        />
      )}
    </div>
  )
}
