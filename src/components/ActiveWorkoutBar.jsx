import { useNavigate, useLocation } from 'react-router-dom'
import { useActiveWorkout } from '../context/ActiveWorkoutContext'
import { useAuth } from '../context/AuthContext'
import { useTimer } from '../context/TimerContext'
import { Play, X, Dumbbell, Clock } from 'lucide-react'

export default function ActiveWorkoutBar() {
    const { activeWorkoutId, discardWorkout } = useActiveWorkout()
    const { startTimer, isActive } = useTimer()
    const navigate = useNavigate()
    const location = useLocation()
    const { user } = useAuth()

    // Only show within the main app routes
    if (!user || !activeWorkoutId || !location.pathname.startsWith('/app') || location.pathname.includes('/workout/new')) return null

    return (
        <div className="fixed bottom-[80px] left-4 right-4 z-30">
            <div className="flex items-center justify-between rounded-xl bg-gray-900 border border-gold-500/30 p-3 shadow-2xl shadow-black/80 ring-1 ring-white/5 backdrop-blur-md">
                <div
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => navigate('/app/workout/new', { state: { authorized: true } })}
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-500/10 text-gold-500 animate-pulse">
                        <Dumbbell className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white leading-tight">Entrenamiento en Curso</p>
                        <p className="text-[10px] text-gray-400">Pulsa para continuar...</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 pl-3 border-l border-gray-800">
                    <button
                        onClick={() => startTimer(60)}
                        data-testid="btn-bar-global-rest"
                        className={`p-2 transition-colors ${isActive ? 'text-gold-500 animate-pulse' : 'text-gray-400 hover:text-gold-500'}`}
                        title="Iniciar descanso (60s)"
                    >
                        <Clock className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => navigate('/app/workout/new', { state: { authorized: true } })}
                        className="p-2 text-gold-500 hover:text-gold-400 transition-colors"
                    >
                        <Play className="h-5 w-5 fill-current" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            if (window.confirm("¿Descartar este entrenamiento?")) {
                                discardWorkout()
                            }
                        }}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
