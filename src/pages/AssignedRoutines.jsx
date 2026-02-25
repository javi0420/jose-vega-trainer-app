import { useNavigate } from 'react-router-dom'
import { useAssignedRoutines, useMarkRoutineViewed, useUpdateAssignedRoutineFeedback } from '../hooks/useAssignedRoutines'
import { ArrowLeft, Calendar, Dumbbell, ChevronRight, Clock, FileText, User, MessageSquare, Send, CheckCircle2 } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import { clsx } from 'clsx'

export default function AssignedRoutines() {
    const navigate = useNavigate()
    const { data: assignments, isLoading, error, refetch } = useAssignedRoutines()
    const { markAsViewed } = useMarkRoutineViewed()
    const { updateFeedback } = useUpdateAssignedRoutineFeedback()

    const [feedbackStates, setFeedbackStates] = useState({})
    const [savingIds, setSavingIds] = useState(new Set())
    const [successIds, setSuccessIds] = useState(new Set())

    // Mark unviewed assignments as viewed when page loads
    useEffect(() => {
        if (assignments) {
            assignments
                .filter(a => !a.viewed_at)
                .forEach(a => markAsViewed(a.id).catch(console.error))

            // Initialize feedback states
            const initialFeedback = {}
            assignments.forEach(a => {
                initialFeedback[a.id] = a.client_feedback || ''
            })
            setFeedbackStates(initialFeedback)
        }
    }, [assignments])

    const handleFeedbackChange = (id, value) => {
        setFeedbackStates(prev => ({ ...prev, [id]: value }))
    }

    const handleSaveFeedback = async (id) => {
        setSavingIds(prev => new Set(prev).add(id))
        try {
            await updateFeedback(id, feedbackStates[id])
            setSuccessIds(prev => new Set(prev).add(id))
            setTimeout(() => {
                setSuccessIds(prev => {
                    const next = new Set(prev)
                    next.delete(id)
                    return next
                })
            }, 3000)
            await refetch()
        } catch (err) {
            console.error(err)
            alert('Error al enviar feedback')
        } finally {
            setSavingIds(prev => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
        }
    }

    const formatDateRelative = (dateString) => {
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: es })
        } catch (e) {
            return ''
        }
    }

    const formatDateAbsolute = (dateString) => {
        try {
            return format(new Date(dateString), "d 'de' MMMM, yyyy", { locale: es })
        } catch (e) {
            return ''
        }
    }

    const getExerciseCount = (routine) => {
        if (!routine?.blocks) return 0
        return routine.blocks.reduce((total, block) => {
            return total + (block.exercises?.length || 0)
        }, 0)
    }

    const handleStartWorkout = (routine) => {
        navigate('/app/workout/new', {
            state: {
                authorized: true,
                loadTemplate: routine
            }
        })
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
            {/* Header */}
            <div className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 p-4 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-bold text-white">Rutinas Asignadas</h1>
                </div>
            </div>

            <div className="p-4 max-w-2xl mx-auto">
                {error && (
                    <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                        Error al cargar rutinas: {error.message}
                    </div>
                )}
                {isLoading ? (
                    <div className="space-y-4 mt-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-40 w-full animate-pulse rounded-2xl bg-gray-900 border border-gray-800" />
                        ))}
                    </div>
                ) : Array.isArray(assignments) && assignments.length > 0 ? (
                    <div className="space-y-4 mt-2">
                        {assignments.map(assignment => {
                            const routine = assignment.routine
                            if (!routine) return null // Skip invalid assignments

                            const exerciseCount = getExerciseCount(routine)
                            const isNew = !assignment.viewed_at

                            return (
                                <div
                                    key={assignment.id}
                                    data-testid={`assigned-routine-${routine.name}`}
                                    className="relative overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 p-5 transition-all hover:bg-gray-800 hover:border-gray-700 shadow-sm"
                                >
                                    {/* New Badge */}
                                    {isNew && (
                                        <div className="absolute top-0 right-0 bg-gold-500 text-black text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl">
                                            Nuevo
                                        </div>
                                    )}

                                    {/* Routine Info */}
                                    <div className="mb-4">
                                        <h3 className="font-bold text-white text-xl mb-1">{routine.name}</h3>
                                        {routine.description && (
                                            <p className="text-sm text-gray-400 mb-2">{routine.description}</p>
                                        )}

                                        {/* Meta Info */}
                                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-3">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span>Asignada {formatDateRelative(assignment.assigned_at)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Dumbbell className="h-3.5 w-3.5" />
                                                <span>{exerciseCount} ejercicios</span>
                                            </div>
                                            {assignment.trainer && (
                                                <div className="flex items-center gap-1.5">
                                                    <User className="h-3.5 w-3.5" />
                                                    <span>{assignment.trainer.full_name || assignment.trainer.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Trainer Notes */}
                                    {assignment.assignment_notes && (
                                        <div className="mb-4 p-4 rounded-2xl bg-gold-500/5 border border-gold-500/10">
                                            <div className="flex items-start gap-3">
                                                <FileText className="h-4 w-4 text-gold-500 mt-1 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] font-black text-gold-500 uppercase tracking-widest mb-1.5">Nota del Coach</p>
                                                    <p className="text-sm text-gray-300 leading-relaxed font-medium">{assignment.assignment_notes}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Client Response */}
                                    <div className="mb-6 space-y-3">
                                        <div className="flex items-center gap-2 px-1">
                                            <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tu comentario</span>
                                        </div>
                                        <div className="relative">
                                            <textarea
                                                value={feedbackStates[assignment.id] || ''}
                                                onChange={(e) => handleFeedbackChange(assignment.id, e.target.value)}
                                                placeholder="Responde al coach o deja notas sobre esta rutina..."
                                                className="w-full rounded-2xl bg-black/40 border border-gray-800 p-4 pr-12 text-sm text-white placeholder-gray-700 focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/30 min-h-[80px] transition-all"
                                            />
                                            <button
                                                onClick={() => handleSaveFeedback(assignment.id)}
                                                disabled={savingIds.has(assignment.id) || feedbackStates[assignment.id] === assignment.client_feedback}
                                                className={clsx(
                                                    "absolute bottom-3 right-3 p-2 rounded-xl transition-all active:scale-90",
                                                    successIds.has(assignment.id)
                                                        ? "bg-emerald-500 text-black"
                                                        : "bg-gold-500 text-black shadow-lg shadow-gold-500/20"
                                                )}
                                            >
                                                {savingIds.has(assignment.id) ? (
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                                                ) : successIds.has(assignment.id) ? (
                                                    <CheckCircle2 className="h-4 w-4" />
                                                ) : (
                                                    <Send className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        onClick={() => handleStartWorkout(routine)}
                                        className="w-full rounded-xl bg-gold-500 py-3 text-sm font-black text-black hover:bg-gold-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold-500/20"
                                    >
                                        Empezar Entreno
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <div className="mb-4 rounded-full bg-gray-900 p-6">
                            <Dumbbell className="h-10 w-10 opacity-20" />
                        </div>
                        <p className="text-lg font-medium text-gray-400">Sin rutinas asignadas</p>
                        <p className="text-sm opacity-60">Tu entrenador aún no te ha asignado rutinas.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
