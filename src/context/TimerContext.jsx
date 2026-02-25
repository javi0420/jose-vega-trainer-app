import { createContext, useContext, useState, useEffect, useRef } from 'react'

const TimerContext = createContext({})

export const useTimer = () => useContext(TimerContext)

export function TimerProvider({ children }) {
    const [timeLeft, setTimeLeft] = useState(0) // Seconds remaining
    const [isActive, setIsActive] = useState(false)
    const [totalTime, setTotalTime] = useState(0) // Initial duration to calculate progress
    const audioContextRef = useRef(null)
    const intervalRef = useRef(null)
    const endTimeRef = useRef(null)
    const [hasNotificationPermission, setHasNotificationPermission] = useState(
        typeof Notification !== 'undefined' && Notification.permission === 'granted'
    )

    // Request notification permission on first interaction
    const requestNotificationPermission = async () => {
        if (typeof Notification === 'undefined') return false

        if (Notification.permission === 'granted') {
            setHasNotificationPermission(true)
            return true
        }

        if (Notification.permission !== 'denied') {
            try {
                const permission = await Notification.requestPermission()
                const granted = permission === 'granted'
                setHasNotificationPermission(granted)
                return granted
            } catch (e) {
                console.error('Notification permission error:', e)
                return false
            }
        }
        return false
    }

    // Show browser notification
    const showNotification = () => {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

        try {
            const notification = new Notification('¡Descanso Terminado! 💪', {
                body: 'Tu tiempo de descanso ha finalizado. ¡Continuemos!',
                icon: '/pwa-192x192.png',
                badge: '/pwa-64x64.png',
                tag: 'rest-timer',
                requireInteraction: false,
                silent: false
            })

            // Auto-close after 5 seconds
            setTimeout(() => notification.close(), 5000)

            // Open app when clicking notification
            notification.onclick = () => {
                window.focus()
                notification.close()
            }
        } catch (e) {
            console.error('Notification error:', e)
        }
    }

    // Unlock AudioContext on first user interaction
    const unlockAudio = () => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
            }
            if (audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume()
            }
        } catch (e) {
            console.error("Audio Context unlock failed", e)
        }
    }

    // Sound effect with richer sequence (Success Chime)
    const playBeep = () => {
        if (!audioContextRef.current) return

        try {
            const ctx = audioContextRef.current
            const now = ctx.currentTime

            // Función helper para tocar una nota
            const playNote = (freq, startTime, duration, type = 'sine') => {
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()

                osc.connect(gain)
                gain.connect(ctx.destination)

                osc.type = type
                osc.frequency.setValueAtTime(freq, startTime)

                // Envelope
                gain.gain.setValueAtTime(0, startTime)
                gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05)
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

                osc.start(startTime)
                osc.stop(startTime + duration)
            }

            // Secuencia: "Ding-Dong-Ding" (Do-Mi-Sol)
            playNote(523.25, now, 0.4)       // C5
            playNote(659.25, now + 0.2, 0.4) // E5
            playNote(783.99, now + 0.4, 0.8) // G5 (más larga)

        } catch (e) {
            console.error("Audio playback failed", e)
        }
    }

    const startTimer = (seconds) => {
        if (!seconds || seconds <= 0) return

        // Unlock audio immediately on user interaction
        unlockAudio()

        // Request notification permission (silent if already granted/denied)
        requestNotificationPermission()

        // Clear existing
        if (intervalRef.current) clearInterval(intervalRef.current)

        const now = Date.now()
        const end = now + (seconds * 1000)

        endTimeRef.current = end
        setTotalTime(seconds)
        setTimeLeft(seconds)
        setIsActive(true)

        // Persist timer state for background recovery
        localStorage.setItem('rest_timer_state', JSON.stringify({
            endTime: end,
            totalTime: seconds,
            isActive: true
        }))

        // Correction loop to prevent drift
        intervalRef.current = setInterval(() => {
            const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000)

            if (remaining <= 0) {
                stopTimer()
                playBeep()
                showNotification() // Browser notification
                // Vibration for mobile
                if (navigator.vibrate) navigator.vibrate([200, 100, 200])
            } else {
                setTimeLeft(remaining)
            }
        }, 200) // update more frequently for smoothness, but calculate based on Date
    }

    const stopTimer = () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setIsActive(false)
        setTimeLeft(0)
        endTimeRef.current = null
        // Clear persisted state
        localStorage.removeItem('rest_timer_state')
    }

    const addTime = (seconds) => {
        if (!isActive) return
        const newEndTime = endTimeRef.current + (seconds * 1000)
        endTimeRef.current = newEndTime

        // Update visual immediately
        const remaining = Math.ceil((newEndTime - Date.now()) / 1000)
        setTimeLeft(remaining)
        setTotalTime(prev => prev + seconds) // Adjust total to keep progress bar relative consistent? Or maybe not needed.
    }

    // Restore timer state on mount (if exists)
    useEffect(() => {
        const savedState = localStorage.getItem('rest_timer_state')
        if (savedState) {
            try {
                const { endTime, totalTime, isActive } = JSON.parse(savedState)
                if (isActive && endTime) {
                    const now = Date.now()
                    const remaining = Math.ceil((endTime - now) / 1000)

                    if (remaining > 0) {
                        // Resume timer
                        endTimeRef.current = endTime
                        setTotalTime(totalTime)
                        setTimeLeft(remaining)
                        setIsActive(true)

                        unlockAudio()

                        intervalRef.current = setInterval(() => {
                            const rem = Math.ceil((endTimeRef.current - Date.now()) / 1000)
                            if (rem <= 0) {
                                stopTimer()
                                playBeep()
                                showNotification()
                                if (navigator.vibrate) navigator.vibrate([200, 100, 200])
                            } else {
                                setTimeLeft(rem)
                            }
                        }, 200)
                    } else {
                        // Timer already finished
                        localStorage.removeItem('rest_timer_state')
                    }
                }
            } catch (e) {
                console.error('Failed to restore timer state:', e)
                localStorage.removeItem('rest_timer_state')
            }
        }
    }, [])

    // Handle Page Visibility changes (background/foreground)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isActive && endTimeRef.current) {
                const now = Date.now()
                const remaining = Math.ceil((endTimeRef.current - now) / 1000)

                if (remaining <= 0) {
                    // Timer finished while in background
                    stopTimer()
                    playBeep()
                    showNotification()
                    if (navigator.vibrate) navigator.vibrate([200, 100, 200])
                } else {
                    // Update display to correct time
                    setTimeLeft(remaining)
                }
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [isActive])

    // Cleanup
    useEffect(() => {
        return () => clearInterval(intervalRef.current)
    }, [])

    return (
        <TimerContext.Provider value={{
            timeLeft,
            isActive,
            totalTime,
            startTimer,
            stopTimer,
            addTime,
            unlockAudio,
            hasNotificationPermission,
            requestNotificationPermission
        }}>
            {children}
        </TimerContext.Provider>
    )
}
