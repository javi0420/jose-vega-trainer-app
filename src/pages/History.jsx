import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useRecentWorkouts } from '../hooks/useWorkouts'
import { ArrowLeft, Calendar, Dumbbell, ChevronRight, Clock, MessageCircle } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function History() {
    const navigate = useNavigate()
    const { data: workouts, isLoading } = useRecentWorkouts()

    // Helper para fecha relativa
    const formatDateRelative = (dateString) => {
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: es })
        } catch (e) {
            return ''
        }
    }

    // Helper para fecha absoluta
    const formatDateAbsolute = (dateString) => {
        try {
            return format(new Date(dateString), "d 'de' MMMM, yyyy", { locale: es })
        } catch (e) {
            return ''
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
            {/* Header */}
            <div className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 p-4 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-3 -ml-2 rounded-full hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-bold text-white">Historial de Entrenos</h1>
                </div>
            </div>

            <div className="p-4 max-w-2xl mx-auto">
                {isLoading ? (
                    <div className="space-y-4 mt-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-gray-900 border border-gray-800" />
                        ))}
                    </div>
                ) : workouts && workouts.length > 0 ? (
                    <div className="space-y-4 mt-2">
                        {workouts.map(workout => (
                            <div
                                key={workout.id}
                                onClick={() => navigate(`/app/workout/${workout.id}`)}
                                className={clsx(
                                    "group relative overflow-hidden rounded-2xl p-5 transition-all shadow-sm active:scale-[0.99] cursor-pointer border",
                                    workout.feedback_notes && !workout.trainer_feedback_viewed_at
                                        ? "border-l-4 border-l-yellow-500 border-y-yellow-500/10 border-r-yellow-500/10 bg-yellow-500/10 shadow-[0_0_20px_-5px_rgba(234,179,8,0.3)]"
                                        : "bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-gray-700"
                                )}
                            >
                                {/* feedback-chip */}
                                {workout.feedback_notes && !workout.trainer_feedback_viewed_at && (
                                    <div
                                        data-testid="feedback-chip"
                                        className="absolute top-0 right-0 bg-yellow-500 text-black text-[10px] font-black px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm z-10"
                                    >
                                        <MessageCircle className="w-3 h-3" />
                                        <span>FEEDBACK</span>
                                    </div>
                                )}
                                <div className="flex items-start gap-4">
                                    {/* Icon Box */}
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold-500/10 text-gold-500 group-hover:bg-gold-500/20 transition-colors">
                                        <Dumbbell className="h-6 w-6" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        {/* Header Row: Title & Badge */}
                                        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1 mb-1">
                                            <h3 className="font-bold text-white text-lg leading-tight truncate max-w-full mr-auto">{workout.name}</h3>
                                            {/* Status Badge */}
                                            {workout.status === 'completed' && (
                                                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-400 uppercase tracking-wider">
                                                    Completado
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-1 text-sm text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span className="capitalize">{formatDateAbsolute(workout.date)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                <Clock className="h-3 w-3" />
                                                <span>{formatDateRelative(workout.date)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all mt-3 self-center" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <div className="mb-4 rounded-full bg-gray-900 p-6">
                            <Dumbbell className="h-10 w-10 opacity-20" />
                        </div>
                        <p className="text-lg font-medium text-gray-400">Sin historial</p>
                        <p className="text-sm opacity-60">Completa tu primer entreno para verlo aquí.</p>
                    </div>
                )}
            </div>
        </div >
    )
}
