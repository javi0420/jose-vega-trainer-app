import { useTimer } from '../context/TimerContext'
import { Plus, SkipForward, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useActiveWorkout } from '../context/ActiveWorkoutContext'
import { useLocation } from 'react-router-dom'

export default function RestTimerOverlay() {
    const { timeLeft, isActive, totalTime, stopTimer, addTime, unlockAudio } = useTimer()
    const { activeWorkoutId } = useActiveWorkout()
    const location = useLocation()
    const [isMinimized, setIsMinimized] = useState(false)

    if (!isActive) return null

    // Progress percentage
    const progress = Math.min(100, Math.max(0, ((totalTime - timeLeft) / totalTime) * 100))

    // Check if ActiveWorkoutBar is visible to adjust stacking
    const isBannerVisible = activeWorkoutId &&
        location.pathname.startsWith('/app') &&
        !location.pathname.includes('/workout/new')

    // Format mm:ss
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s < 10 ? '0' : ''}${s}`
    }

    return (
        <div
            className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out pointer-events-none ${isMinimized ? 'h-0' : 'h-full'
                }`}
        >
            {/* Minimized Bar (Mini-Player) */}
            <div
                data-testid="timer-mini-player"
                aria-label="Temporizador de descanso minimizado"
                className={`absolute left-4 right-4 bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl flex items-center justify-between px-6 transition-all duration-500 pointer-events-auto cursor-pointer ${isMinimized
                    ? `${isBannerVisible ? 'bottom-[150px]' : 'bottom-[70px]'} h-16 opacity-100`
                    : 'bottom-0 h-0 opacity-0 pointer-events-none overflow-hidden'
                    }`}
                onClick={() => setIsMinimized(false)}
            >
                {/* Progress in Minimized Bar (Top edge) */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/5 rounded-t-2xl overflow-hidden">
                    <div
                        className="h-full bg-gold-500 transition-all duration-1000 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-white font-mono tabular-nums">
                        {formatTime(timeLeft)}
                    </span>
                    <span className="text-[10px] text-gold-500/50 font-bold uppercase tracking-widest hidden sm:block">Descanso</span>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            stopTimer()
                        }}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        aria-label="Omitir descanso"
                    >
                        <SkipForward className="h-5 w-5 fill-current" />
                    </button>
                    <button
                        data-testid="timer-mini-expand"
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsMinimized(false)
                        }}
                        className="p-2 text-gold-500"
                        aria-label="Expandir temporizador"
                    >
                        <ChevronUp className="h-6 w-6" />
                    </button>
                </div>
            </div>

            <div
                className={`absolute bottom-0 left-0 right-0 bg-[#1C1C1E] border-t border-gray-800 pb-safe shadow-2xl transition-all duration-500 transform pointer-events-auto ${isMinimized ? 'opacity-0 translate-y-full pointer-events-none' : 'opacity-100 translate-y-0'
                    }`}
            >
                {/* Progress Bar (Edge to Edge) */}
                <div className="h-1.5 w-full bg-gray-800">
                    <div
                        className="h-full bg-gold-500 transition-all duration-1000 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="flex flex-col items-center p-4 space-y-6 relative">
                    {/* Minimize Button */}
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="absolute left-4 top-4 p-2 text-gray-400 hover:text-white transition-colors bg-gray-800/50 rounded-full"
                        aria-label="Minimizar temporizador"
                    >
                        <ChevronDown className="h-5 w-5" />
                    </button>

                    {/* Close/Stop Button */}
                    <button
                        onClick={stopTimer}
                        data-testid="timer-btn-close"
                        className="absolute right-4 top-4 p-2 text-gray-500 hover:text-red-400 transition-colors"
                        aria-label="Cerrar temporizador"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    {/* Timer Display */}
                    <div className="text-center pt-4">
                        <div className="text-[10px] font-black text-gold-500/50 uppercase tracking-[0.2em] mb-1">Resting Time</div>
                        <span
                            data-testid="timer-display"
                            className="text-6xl font-black text-white font-mono tabular-nums tracking-tighter"
                        >
                            {formatTime(timeLeft)}
                        </span>
                    </div>

                    {/* Controls Row */}
                    <div className="grid grid-cols-3 gap-3 w-full max-w-sm pb-2">
                        <button
                            data-testid="timer-btn-sub-15"
                            onClick={() => {
                                unlockAudio()
                                addTime(-15)
                            }}
                            className="flex h-14 items-center justify-center rounded-2xl bg-gray-800/80 text-white font-black text-base active:scale-90 transition-all border border-white/5 hover:bg-gray-800"
                        >
                            -15s
                        </button>

                        <button
                            data-testid="timer-btn-add-15"
                            onClick={() => {
                                unlockAudio()
                                addTime(15)
                            }}
                            className="flex h-14 items-center justify-center rounded-2xl bg-gray-800/80 text-white font-black text-base active:scale-90 transition-all border border-white/5 hover:bg-gray-800"
                        >
                            +15s
                        </button>

                        <button
                            data-testid="timer-btn-skip"
                            onClick={stopTimer}
                            className="flex h-14 items-center justify-center rounded-2xl bg-gold-500 text-black font-black text-base active:scale-95 transition-all shadow-lg shadow-gold-500/10 hover:bg-gold-400"
                        >
                            SALTAR
                        </button>
                    </div>
                </div>
            </div>
        </div >
    )
}
