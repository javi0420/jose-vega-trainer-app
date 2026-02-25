import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const ActiveWorkoutContext = createContext()

export function ActiveWorkoutProvider({ children }) {
    const { user, loading } = useAuth()
    const [activeWorkoutId, setActiveWorkoutId] = useState(() => {
        const savedId = localStorage.getItem('active_workout_id')
        if (savedId) return savedId
        // Fallback: if there is a draft workout, we are in an active session
        if (localStorage.getItem('draft_workout')) return 'draft'
        return null
    })

    const [workoutStartedAt, setWorkoutStartedAt] = useState(() => {
        const saved = localStorage.getItem('workout_started_at')
        return saved ? parseInt(saved, 10) : null
    })

    // Calculate workout duration in real-time (seconds)
    const [workoutDuration, setWorkoutDuration] = useState(0)

    // Update duration every second when workout is active
    useEffect(() => {
        if (!workoutStartedAt) {
            setWorkoutDuration(0)
            return
        }

        const updateDuration = () => {
            const elapsed = Math.floor((Date.now() - workoutStartedAt) / 1000)
            setWorkoutDuration(elapsed)
        }

        // Initial update
        updateDuration()

        // Update every second
        const interval = setInterval(updateDuration, 1000)

        // Handle Page Visibility changes (prevent timer pause when app is minimized)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Immediately recalculate when app becomes visible
                updateDuration()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            clearInterval(interval)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [workoutStartedAt])

    // Clear state on explicit logout event
    useEffect(() => {
        const handleLogout = () => {
            setActiveWorkoutId(null)
            setWorkoutStartedAt(null)
            // LocalStorage is also cleared in AuthContext.signOut for redundancy
            localStorage.removeItem('active_workout_id')
            localStorage.removeItem('draft_workout')
            localStorage.removeItem('workout_started_at')
        }
        window.addEventListener('app-logout', handleLogout)
        return () => window.removeEventListener('app-logout', handleLogout)
    }, [])

    useEffect(() => {
        if (activeWorkoutId) {
            localStorage.setItem('active_workout_id', activeWorkoutId)
        } else if (activeWorkoutId === null) {
            localStorage.removeItem('active_workout_id')
        }
    }, [activeWorkoutId])

    useEffect(() => {
        if (workoutStartedAt) {
            localStorage.setItem('workout_started_at', workoutStartedAt.toString())
        } else if (workoutStartedAt === null) {
            localStorage.removeItem('workout_started_at')
        }
    }, [workoutStartedAt])

    const startWorkout = (id) => {
        setActiveWorkoutId(id)
        // Only set startedAt if it doesn't exist yet (don't reset on draft saves)
        setWorkoutStartedAt(prev => prev || Date.now())
    }

    const discardWorkout = () => {
        setActiveWorkoutId(null)
        setWorkoutStartedAt(null)
        // Also clear the draft workout data to prevent reload issues
        localStorage.removeItem('draft_workout')
        localStorage.removeItem('workout_started_at')
    }

    return (
        <ActiveWorkoutContext.Provider value={{
            activeWorkoutId,
            workoutStartedAt,
            workoutDuration,
            startWorkout,
            discardWorkout
        }}>
            {children}
        </ActiveWorkoutContext.Provider>
    )
}

export const useActiveWorkout = () => {
    const context = useContext(ActiveWorkoutContext)
    if (!context) throw new Error('useActiveWorkout must be used within ActiveWorkoutProvider')
    return context
}
