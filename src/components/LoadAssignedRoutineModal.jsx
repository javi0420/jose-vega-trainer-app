import { X, Calendar, User, ChevronRight, FileText, Dumbbell, Briefcase } from 'lucide-react'
import { useAssignedRoutines } from '../hooks/useAssignedRoutines'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default function LoadAssignedRoutineModal({ isOpen, onClose, onLoadRoutine }) {
    const { data: assignments, isLoading, error } = useAssignedRoutines()

    if (!isOpen) return null

    const formatDateRelative = (dateString) => {
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: es })
        } catch (e) {
            return ''
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl max-h-[80vh] bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gold-500/10">
                            <Briefcase className="h-5 w-5 text-gold-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Rutinas Asignadas</h2>
                            <p className="text-xs text-gray-500">Selecciona una rutina de tu entrenador</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-24 w-full animate-pulse rounded-xl bg-gray-800/50" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-400">
                            <p>Error cargando rutinas asignadas</p>
                            <p className="text-xs opacity-70 mt-1">{error.message}</p>
                        </div>
                    ) : !assignments || assignments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <Dumbbell className="h-10 w-10 mb-4 opacity-20" />
                            <p>No tienes rutinas asignadas actualmente.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {assignments.map(assignment => {
                                const routine = assignment.routine
                                if (!routine) return null

                                const exerciseCount = routine.blocks?.reduce((acc, b) => acc + (b.exercises?.length || 0), 0) || 0

                                return (
                                    <button
                                        key={assignment.id}
                                        onClick={() => {
                                            onLoadRoutine(routine)
                                            onClose()
                                        }}
                                        className="w-full group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-left transition-all hover:bg-gray-800 hover:border-gray-700 active:scale-[0.99] flex flex-col sm:flex-row gap-4"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <h3 className="font-bold text-white truncate text-lg">{routine.name}</h3>
                                                {/* New Badge if not viewed */}
                                                {!assignment.viewed_at && (
                                                    <span className="shrink-0 bg-gold-500 text-black text-[10px] font-black uppercase px-2 py-0.5 rounded ml-2">
                                                        Nuevo
                                                    </span>
                                                )}
                                            </div>

                                            {/* Trainer Notes Preview */}
                                            {assignment.assignment_notes && (
                                                <div className="mt-2 flex items-start gap-2 text-xs text-gray-400 bg-gray-950/30 p-2 rounded">
                                                    <FileText className="h-3 w-3 mt-0.5 text-gold-500/70" />
                                                    <p className="line-clamp-2">{assignment.assignment_notes}</p>
                                                </div>
                                            )}

                                            <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="h-3 w-3" />
                                                    <span>{assignment.trainer?.full_name || 'Entrenador'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>{formatDateRelative(assignment.assigned_at)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Dumbbell className="h-3 w-3" />
                                                    <span>{exerciseCount} ejercicios</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end sm:justify-center">
                                            <div className="p-2 rounded-full bg-transparent group-hover:bg-gold-500/10 transition-colors">
                                                <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-gold-500 transition-colors" />
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
