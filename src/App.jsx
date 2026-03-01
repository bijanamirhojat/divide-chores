// v1.4.0 - wishlist feature + biometric auth (Face ID / Touch ID) + meal editing + PWA update banner
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { resubscribeIfNeeded } from './lib/pushSubscription'
import { isBiometricAvailable, hasBiometricSetup, isBiometricSetupDismissed, dismissBiometricSetup, registerBiometric } from './lib/biometricAuth'
import Login from './components/Login'
import WeekView from './components/WeekView'
import TaskModal from './components/TaskModal'
import Menu from './components/Menu'
import Stats from './components/Stats'
import Wishlist from './components/Wishlist'
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

function BiometricSetupModal({ userName, onSetup, onDismiss }) {
  const [isSettingUp, setIsSettingUp] = useState(false)

  async function handleSetup() {
    setIsSettingUp(true)
    await onSetup()
    setIsSettingUp(false)
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onDismiss}>
      <div 
        className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 shadow-soft-lg animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pastel-mint to-pastel-lavender rounded-[1.5rem] mb-4 shadow-soft">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Face ID instellen?</h2>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Hoi {userName}! Wil je Face ID gebruiken om sneller in te loggen? Je PIN blijft als backup beschikbaar.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSetup}
            disabled={isSettingUp}
            className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSettingUp ? (
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
                Stel Face ID in
              </>
            )}
          </button>
          <button
            onClick={onDismiss}
            className="w-full py-3 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            Later
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
  const [showWishlist, setShowWishlist] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [showBiometricSetup, setShowBiometricSetup] = useState(false)
  const [lastLoginPin, setLastLoginPin] = useState(null)
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

  // Auto-login in dev mode when VITE_DEV_PIN is set
  useEffect(() => {
    const devPin = import.meta.env.VITE_DEV_PIN
    if (import.meta.env.DEV && devPin && users.length > 0 && !currentUser && !isAutoLoggingIn) {
      setIsAutoLoggingIn(true)
      handleLogin(devPin).then(matched => {
        setIsAutoLoggingIn(false)
        if (matched && matched.length === 1) {
          setCurrentUser(matched[0])
        }
      })
    }
  }, [users, currentUser])

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

  // Re-subscribe push notifications silently after login
  useEffect(() => {
    if (currentUser?.id) {
      resubscribeIfNeeded(currentUser.id)
    }
  }, [currentUser?.id])

  // Check if we should offer biometric setup after login
  useEffect(() => {
    if (currentUser && lastLoginPin) {
      checkBiometricSetupOffer()
    }
  }, [currentUser, lastLoginPin])

  async function checkBiometricSetupOffer() {
    // Don't offer if already set up, dismissed, or not available
    if (hasBiometricSetup() || isBiometricSetupDismissed()) return
    const available = await isBiometricAvailable()
    if (available) {
      // Small delay so user sees the main screen first
      setTimeout(() => setShowBiometricSetup(true), 800)
    }
  }

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
      setLastLoginPin(pin)
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

  async function handleBiometricSetup() {
    if (!currentUser || !lastLoginPin) return
    try {
      await registerBiometric(currentUser.id, currentUser.name, lastLoginPin)
      setShowBiometricSetup(false)
    } catch (err) {
      console.error('Biometric setup failed:', err)
      setShowBiometricSetup(false)
    }
  }

  function handleDismissBiometricSetup() {
    dismissBiometricSetup()
    setShowBiometricSetup(false)
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
    setLastLoginPin(null)
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
      {showBiometricSetup && (
        <BiometricSetupModal
          userName={currentUser.name}
          onSetup={handleBiometricSetup}
          onDismiss={handleDismissBiometricSetup}
        />
      )}
      
      <WeekView 
        currentUser={currentUser}
        users={users}
        onComplete={handleComplete}
        presentationMode={presentationMode}
        onTogglePresentation={() => setPresentationMode(!presentationMode)}
        onOpenMenu={() => setShowMenu(true)}
      />

      <Menu 
        show={showMenu}
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
        onOpenWishlist={() => {
          setShowMenu(false)
          setShowWishlist(true)
        }}
      />

      <Stats 
        show={showStats}
        onClose={() => setShowStats(false)}
        users={users}
      />

      <Wishlist
        show={showWishlist}
        onClose={() => setShowWishlist(false)}
        currentUser={currentUser}
        users={users}
      />
    </div>
  )
}
