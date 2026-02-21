import { useState } from 'react'

export default function Login({ onLogin, onSelectUser, users }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [showUserSelect, setShowUserSelect] = useState(false)
  const [matchedUsers, setMatchedUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    const matched = await onLogin(pin)
    setIsLoading(false)
    
    if (!matched) {
      setError('Ongeldige PIN')
      return
    }
    
    if (matched.length === 1) {
      onSelectUser(matched[0])
    } else {
      setMatchedUsers(matched)
      setShowUserSelect(true)
    }
  }

  function handleSelectUser(user) {
    onSelectUser(user)
  }

  if (showUserSelect) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-pastel-cream via-pastel-mint/10 to-white">
        <div className="w-full max-w-xs space-y-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-pastel-lavender rounded-2xl mb-4">
              <svg className="w-8 h-8 text-pastel-lavenderDark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Wie ben je?</h2>
            <p className="text-gray-500 mt-1">Kies je profiel</p>
          </div>
          
          <div className="space-y-3">
            {matchedUsers.map(user => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className={`w-full p-5 rounded-2xl text-lg font-medium transition-all duration-300 active:scale-[0.98] shadow-soft hover:shadow-soft-lg ${
                  user.name === 'Bijan' 
                    ? 'bg-brand-bijan text-white hover:bg-brand-bijan/90' 
                    : 'bg-brand-esther text-white hover:bg-brand-esther/90'
                }`}
              >
                <span className="flex items-center justify-center gap-3">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-full object-cover bg-white/20" />
                  ) : (
                    <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                      {user.name === 'Bijan' ? '👨' : '👩'}
                    </span>
                  )}
                  {user.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-pastel-cream via-pastel-mint/10 to-white">
      <div className="w-full max-w-xs">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-pastel-mint to-pastel-lavender rounded-[1.5rem] mb-5 shadow-soft">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Divide/Chores</h1>
          <p className="text-gray-500 mt-2">Own your chores.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN Code"
              className="input-field text-center text-2xl tracking-[0.5em] py-5"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
            />
          </div>
          
          {error && (
            <div className="flex items-center justify-center gap-2 text-red-500 text-sm bg-red-50 py-2 px-4 rounded-xl">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={isLoading || !pin}
            className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                Inloggen
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>
        
        <p className="mt-8 text-gray-400 text-xs text-center">
          Voer je persoonlijke PIN in om te starten
        </p>
      </div>
    </div>
  )
}
