import { useState, useEffect, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Dumbbell, Clock, ChevronDown, ChevronUp, TrendingUp, Copy, X, Trash2, Save } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
const ExerciseChart = lazy(() => import('../components/ExerciseChart'))
import WorkoutHeader from '../components/workout/WorkoutHeader'
import FeedbackSection from '../components/workout/FeedbackSection'
import MuscleHeatmap from '../components/summary/MuscleHeatmap'
import ExerciseSummaryCard from '../components/summary/ExerciseSummaryCard'
import { useUserRole } from '../hooks/useUserRole'
import { useSaveAsRoutine } from '../hooks/useSaveAsRoutine'
import { toast } from 'react-hot-toast'

export default function WorkoutDetail() {
    // Scroll to top on mount to prevent auto-scroll to bottom
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])
    const { id } = useParams()
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const { data: userRole, isLoading: roleLoading } = useUserRole() // Get role
    const isTrainer = userRole?.role === 'trainer'
    const [showChart, setShowChart] = useState(false)
    const [selectedChartExerciseId, setSelectedChartExerciseId] = useState(null)
    const [isSaveRoutineModalOpen, setIsSaveRoutineModalOpen] = useState(false)
    const [newRoutineName, setNewRoutineName] = useState('')
    const { mutate: saveAsRoutine, isPending: isSavingRoutine } = useSaveAsRoutine()
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const { data: workout, isLoading, error, refetch } = useQuery({
        queryKey: ['workout', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('workouts')
                .select(`
                    *,
                    profiles (full_name, avatar_url),
                    workout_blocks (
                        *,
                        block_exercises (
                            *,
                            exercises (id, name, muscle_group),
                            sets (*)
                        )
                    )
                `)
                .limit(1)
                .eq('id', id)

            if (error) throw error

            // Handle array result safely
            const workoutData = (data && data.length > 0) ? data[0] : null
            if (!workoutData) throw new Error('Entrenamiento no encontrado')

            // Sorting logic...
            workoutData.workout_blocks.sort((a, b) => a.order_index - b.order_index)
            workoutData.workout_blocks.forEach(block => {
                if (block.block_exercises) {
                    block.block_exercises.sort((a, b) => (a.position || 'A').localeCompare(b.position || 'A'));
                    block.block_exercises.forEach(be => {
                        if (be.sets) {
                            be.sets.sort((a, b) => (a.round_index || a.set_number) - (b.round_index || b.set_number))
                        }
                    })
                }
            })
            return workoutData
        }
    })



    useEffect(() => {
        const firstExId = workout?.workout_blocks?.[0]?.block_exercises?.[0]?.exercises?.id
        if (firstExId) {
            setSelectedChartExerciseId(firstExId)
        }
    }, [workout])

    const handleDeleteWorkout = async () => {
        setIsDeleting(true)
        try {
            // Se usa .select() para verificar que el RLS permitió el borrado real
            const { data, error } = await supabase
                .from('workouts')
                .delete()
                .eq('id', id)
                .select()

            if (error) throw error

            if (!data || data.length === 0) {
                throw new Error('No se pudo borrar. Permisos insuficientes.')
            }

            // Invalidate queries claves para sincronización instantánea
            await queryClient.invalidateQueries({ queryKey: ['dashboard_recent_activity'] });
            await queryClient.invalidateQueries({ queryKey: ['workouts_history'] });

            // Invalida también las queries de la base de código actual para mayor seguridad
            queryClient.invalidateQueries({ queryKey: ['workouts'] })
            queryClient.invalidateQueries({ queryKey: ['trainerActivity'] })
            queryClient.invalidateQueries({ queryKey: ['trainerStats'] })
            queryClient.invalidateQueries({ queryKey: ['clientStats'] })

            toast.success('Entrenamiento eliminado')
            navigate('/app/history')
        } catch (err) {
            console.error(err)
            toast.error(err.message || 'Error al eliminar el entrenamiento')
            setIsDeleting(false)
            setIsDeleteModalOpen(false)
        }
    }



    if (isLoading || roleLoading) return (
        <div className="flex h-screen items-center justify-center bg-gray-950 text-gold-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
        </div>
    )

    if (error) return (
        <div className="flex h-screen items-center justify-center bg-gray-950 text-red-400 p-4 text-center">
            <p>Error cargando el entrenamiento: {error.message}</p>
        </div>
    )


    // --- CALCULATIONS FOR SUMMARY ---
    let totalVolume = 0;
    let duration = 0;
    let allExercises = [];

    try {
        allExercises = workout.workout_blocks?.flatMap(b => b.block_exercises || []) || [];

        // Calculate Total Volume
        totalVolume = allExercises.reduce((acc, ex) => {
            const setVol = ex.sets?.reduce((sAcc, set) => {
                if (set.completed && set.weight > 0 && set.reps > 0) {
                    return sAcc + (parseFloat(set.weight) * parseFloat(set.reps));
                }
                return sAcc;
            }, 0) || 0;
            return acc + setVol;
        }, 0);

        // Calculate Duration
        duration = workout.duration_seconds ||
            (workout.started_at && workout.completed_at
                ? (new Date(workout.completed_at) - new Date(workout.started_at)) / 1000
                : 0);
    } catch (err) {
        console.error("Error calculating summary stats:", err);
    }



    return (
        <div className="flex min-h-screen flex-col bg-black text-gray-100 font-sans pb-32">

            {/* ... (existing content) */}

            <WorkoutHeader
                workoutId={id}
                workoutName={workout.name}
                date={workout.date || workout.created_at}
                durationSeconds={duration}
                totalVolume={totalVolume}
                isTrainer={isTrainer}
                onDeleteClick={() => setIsDeleteModalOpen(true)}
                onNameUpdate={refetch}
            />

            {/* 2. Trainer/User Info Row */}
            <div className="flex items-center justify-between px-2 mb-2">
                {workout.profiles && (
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-gray-800">
                            <img
                                src={workout.profiles.avatar_url || `https://ui-avatars.com/api/?name=${workout.profiles.full_name}&background=random`}
                                alt={workout.profiles.full_name}
                                className="h-full w-full object-cover"
                            />
                        </div >
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">{workout.profiles.full_name}</span>
                            <span className="text-[10px] uppercase font-bold text-gray-500">Atleta</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Save as Routine Banner */}
            <div className="mx-2 mb-8">
                <button
                    data-testid="btn-save-as-routine"
                    onClick={() => {
                        console.log('DEBUG: Clicking Save as Routine')
                        setNewRoutineName(`${workout.name} (Plantilla)`)
                        setIsSaveRoutineModalOpen(true)
                    }}
                    className="w-full relative group overflow-hidden rounded-[2rem] bg-gradient-to-br from-gold-400 to-gold-600 p-[1px] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-gold-500/20"
                >
                    <div className="flex items-center justify-between gap-4 rounded-[calc(2rem-1px)] bg-gray-950 px-6 py-5 transition-colors group-hover:bg-gray-900">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500 shadow-lg shadow-gold-500/40 transition-transform group-hover:rotate-6">
                                <Copy className="h-6 w-6 text-black" />
                            </div>
                            <div className="text-left">
                                <h4 className="text-sm font-black uppercase tracking-tight text-white mb-0.5">¿Quieres repetir este entreno?</h4>
                                <p className="text-[10px] font-bold text-gray-500">Guárdalo como plantilla personalizada</p>
                            </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-gold-500 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black group-hover:bg-white transition-colors">
                            Guardar
                        </span>
                    </div>
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_3s_infinite]" />
                </button>
            </div>

            {/* 3. Feedback Section */}
            <FeedbackSection
                workoutId={id}
                isTrainer={isTrainer}
                feedbackNotes={workout.feedback_notes}
                clientNotes={workout.client_notes}
                trainerFeedbackViewedAt={workout.trainer_feedback_viewed_at}
                clientFeedbackViewedAt={workout.client_feedback_viewed_at}
                onFeedbackSaved={refetch}
            />

            {/* 4. Muscle Focus Heatmap */}
            <MuscleHeatmap exercises={allExercises.map(be => be.exercises).filter(Boolean)} />

            {/* 5. Coach Analysis Button */}
            {
                workout.workout_blocks?.length > 0 && (
                    <div className="rounded-2xl bg-gray-900/30 p-1">
                        <button
                            onClick={() => setShowChart(!showChart)}
                            className="flex h-14 w-full items-center justify-between rounded-xl bg-gray-800/50 px-4 text-sm font-bold text-gold-500 hover:bg-gray-800 transition-colors"
                        >
                            <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Análisis de Progreso</span>
                            {showChart ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        {showChart && (
                            <div className="p-4 animate-in slide-in-from-top-2">
                                <div className="mb-4">
                                    <select
                                        className="w-full rounded-lg bg-gray-950 border border-gray-700 text-white h-12 px-3 text-base"
                                        value={selectedChartExerciseId || ''}
                                        onChange={(e) => setSelectedChartExerciseId(e.target.value)}
                                    >
                                        {allExercises.map((be, idx) => (
                                            <option key={idx} value={be.exercises?.id}>{be.exercises?.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {selectedChartExerciseId && (
                                    <Suspense fallback={<div className="h-48 w-full animate-pulse bg-white/5 rounded-[2rem] border border-white/5 my-4" />}>
                                        <ExerciseChart exerciseId={selectedChartExerciseId} userId={workout.user_id} />
                                    </Suspense>
                                )}
                            </div>
                        )}
                    </div>
                )
            }

            {/* 6. Exercise List (Cards) */}
            <div data-testid="workout-summary-container">
                <h3 className="mb-4 text-xs font-bold text-gray-500 uppercase tracking-widest pl-1" data-testid="workout-summary-title">Resumen de Ejercicios</h3>
                <div className="space-y-3">
                    {allExercises.length === 0 ? (
                        <div className="p-8 text-center text-gray-600 text-sm border border-dashed border-gray-800 rounded-xl">
                            Sin ejercicios registrados.
                        </div>
                    ) : (
                        allExercises.map((exerciseData, index) => (
                            <ExerciseSummaryCard
                                key={`${exerciseData.id}-${index}`}
                                exercise={exerciseData.exercises || { name: exerciseData.custom_exercise_name, muscle_group: 'General' }}
                                sets={exerciseData.sets || []}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Save as Routine Modal (PORTAL) */}
            {
                isSaveRoutineModalOpen && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-sm transition-all">
                        <div
                            className="w-full max-w-md overflow-hidden rounded-t-[2.5rem] sm:rounded-[2.5rem] bg-gray-900 border-t sm:border border-white/10 p-8 shadow-2xl slide-in-from-bottom-10"
                        >
                            <div className="mb-6 flex items-center justify-between">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight italic">Nueva Plantilla</h3>
                                <button
                                    onClick={() => setIsSaveRoutineModalOpen(false)}
                                    className="rounded-full bg-white/5 p-2 text-gray-400 hover:text-white"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gold-500/50">Nombre de la Rutina</label>
                                    <input
                                        data-testid="input-routine-name"
                                        autoFocus
                                        type="text"
                                        value={newRoutineName}
                                        onChange={(e) => setNewRoutineName(e.target.value)}
                                        placeholder="Ej: Rutina de Empuje"
                                        className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-all font-bold"
                                    />
                                </div>

                                <button
                                    data-testid="btn-confirm-save-routine"
                                    disabled={isSavingRoutine || !newRoutineName.trim()}
                                    onClick={() => {
                                        saveAsRoutine({ workoutId: id, routineName: newRoutineName }, {
                                            onSuccess: (newId) => {
                                                setIsSaveRoutineModalOpen(false)
                                                toast.success((t) => (
                                                    <div className="flex flex-col gap-2">
                                                        <span className="font-bold text-sm">¡Rutina guardada correctamente!</span>
                                                        <button
                                                            onClick={() => {
                                                                toast.dismiss(t.id)
                                                                navigate(`/app/routines/${newId}`)
                                                            }}
                                                            className="text-xs font-black uppercase tracking-widest text-gold-500 hover:text-gold-400 text-left"
                                                        >
                                                            Ir a la Rutina →
                                                        </button>
                                                    </div>
                                                ), { duration: 5000 })
                                            },
                                            onError: () => {
                                                toast.error('Error al guardar la rutina')
                                            }
                                        })
                                    }}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-500 p-4 text-sm font-black uppercase tracking-tight text-black shadow-lg shadow-gold-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
                                >
                                    {isSavingRoutine ? (
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                                    ) : (
                                        <>
                                            <Save className="h-5 w-5" />
                                            Confirmar Guardado
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.getElementById('portal-root') || document.body
                )
            }
            {/* Deletion Summary Modal (PORTAL) */}
            {
                isDeleteModalOpen && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in">
                        <div className="w-full max-w-sm rounded-[2.5rem] bg-gray-900 border border-white/10 p-8 shadow-2xl animate-in zoom-in-95">
                            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 mx-auto">
                                <Trash2 className="h-8 w-8" />
                            </div>

                            <h3 className="text-xl font-black text-white text-center uppercase tracking-tight mb-2">Eliminar Entreno</h3>
                            <p className="text-xs text-center text-gray-500 font-bold uppercase tracking-widest mb-8">Esta acción no se puede deshacer</p>

                            <div className="space-y-4 mb-8 bg-white/5 rounded-2xl p-6 border border-white/5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nombre</span>
                                    <span className="text-xs font-bold text-white truncate max-w-[150px]">{workout.name}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ejercicios</span>
                                    <span className="text-xs font-bold text-white">{allExercises.length}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Volumen Total</span>
                                    <span className="text-xs font-bold text-white">{totalVolume.toFixed(1)} kg</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleDeleteWorkout}
                                    disabled={isDeleting}
                                    className="w-full rounded-2xl bg-red-600 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : 'Confirmar Borrado'}
                                </button>
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    disabled={isDeleting}
                                    className="w-full rounded-2xl bg-gray-800 py-4 text-sm font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.getElementById('portal-root') || document.body
                )
            }
        </div >
    )
}
