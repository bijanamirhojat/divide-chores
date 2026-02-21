import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import WeekView from './components/WeekView'
import TaskModal from './components/TaskModal'
import Menu from './components/Menu'
import Confetti from './components/Confetti'

export default function App() {
  const [session, setSession] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [users, setUsers] = useState([])
  const [showMenu, setShowMenu] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [presentationMode, setPresentationMode] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('mode') === 'presentation'
  })
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false)

  useEffect(() => {
    loadUsers()
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
      <Login 
        onLogin={handleLogin} 
        onSelectUser={handleSelectUser}
        users={users}
      />
    )
  }

  return (
    <div className={`min-h-screen ${presentationMode ? 'fixed inset-0 z-50 bg-white' : ''}`}>
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
        />
      )}
    </div>
  )
}
