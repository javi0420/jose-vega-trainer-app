import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Safety timeout to prevent infinite loading screen
    const safetyTimeout = setTimeout(() => {
      console.warn('AuthContext: Session check timed out, forcing app load')
      setLoading(false)
    }, 5000)

    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
    }).catch((err) => {
      console.error('Session check failed:', err)
    }).finally(() => {
      clearTimeout(safetyTimeout)
      setLoading(false)
    })

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    // Notify other contexts to clear their state
    window.dispatchEvent(new CustomEvent('app-logout'))

    // Clear persisted workout state to prevent leaks between sessions
    localStorage.removeItem('draft_workout')
    localStorage.removeItem('active_workout_id')

    // Optimistic update to clear UI immediately and fix race conditions
    setSession(null)
    setUser(null)
    setLoading(false)
    await supabase.auth.signOut()
  }

  const value = {
    session,
    user,
    loading,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
        <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white">
          <div className="text-xl animate-pulse">Cargando aplicación...</div>
        </div>
      )}
    </AuthContext.Provider>
  )
}
