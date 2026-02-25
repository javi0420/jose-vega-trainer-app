import { useState, useEffect } from 'react'
import { X, FileText, Dumbbell, Loader2, ChevronRight, User, Briefcase } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function LoadTemplateModal({ isOpen, onClose, onLoadTemplate }) {
    const { user } = useAuth()
    const [routines, setRoutines] = useState([])
    const [activeTab, setActiveTab] = useState('trainer') // 'trainer' | 'client'
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)

    console.log(`DEBUG: LoadTemplateModal Render. isOpen=${isOpen}, user=${user?.id}, isLoading=${isLoading}`)

    useEffect(() => {
        if (isOpen && user) {
            console.log('DEBUG: useEffect triggered - calling fetchRoutines')
            fetchRoutines()
        } else {
            console.log(`DEBUG: useEffect skipped. isOpen=${isOpen}, user=${!!user}`)
        }
    }, [isOpen, user])

    const fetchRoutines = async () => {
        setIsLoading(true)
        setError(null)

        try {
            if (!user || !user.id) {
                throw new Error('No hay sesión activa')
            }

            // Call the new RPC function
            const { data: routinesData, error: routinesError } = await supabase
                .rpc('get_user_routines_with_details');

            if (routinesError) {
                throw routinesError
            }

            // The RPC returns exactly the structure we need, so we just set it
            setRoutines(routinesData || [])

            // Auto-select tab logic
            const hasTrainerRoutines = routinesData?.some(r => r.created_by_trainer)
            if (!hasTrainerRoutines && routinesData?.length > 0) {
                setActiveTab('client')
            }
        } catch (err) {
            console.error('Error fetching routines:', err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleLoadRoutine = async (routine) => {
        try {
            setIsLoading(true);
            console.log('DEBUG: handleLoadRoutine called for:', routine?.name);

            const routineId = routine.id;
            const { data: fullRoutine, error: routineError } = await supabase
                .from('routines')
                .select(`
                    *,
                    routine_blocks (
                        *,
                        routine_exercises (
                            *,
                            exercises (*)
                        )
                    )
                `)
                .eq('id', routineId)
                .single();

            if (routineError) throw routineError;

            // Ensure order_index sorting if not guaranteed by API
            if (fullRoutine.routine_blocks) {
                fullRoutine.routine_blocks.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
                fullRoutine.routine_blocks.forEach(block => {
                    if (block.routine_exercises) {
                        block.routine_exercises.sort((a, b) => (a.position || '').localeCompare(b.position || ''));
                    }
                });
            }

            onLoadTemplate(fullRoutine);
            onClose();
        } catch (err) {
            console.error('Error in handleLoadRoutine:', err);
            alert('Error al cargar la rutina: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const getRoutineSummary = (routine) => {
        const totalBlocks = routine.routine_blocks?.length || 0
        const totalExercises = routine.routine_blocks?.reduce((sum, block) => {
            return sum + (block.routine_exercises?.length || 0)
        }, 0) || 0

        const exerciseNames = routine.routine_blocks
            ?.flatMap(block => block.routine_exercises || [])
            .slice(0, 3)
            .map(re => re.exercises?.name || re.custom_exercise_name)
            .filter(Boolean)
            .join(', ') || 'Sin ejercicios'

        return { totalBlocks, totalExercises, exerciseNames }
    }

    const filteredRoutines = routines.filter(routine => {
        if (activeTab === 'trainer') return !!routine.created_by_trainer
        return !routine.created_by_trainer
    })

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl max-h-[80vh] bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gold-500/10">
                            <FileText className="h-5 w-5 text-gold-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Cargar Plantilla</h2>
                            <p className="text-xs text-gray-500">Selecciona una rutina para comenzar</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                {routines.length > 0 && !isLoading && !error && (
                    <div className="flex border-b border-gray-800 px-6">
                        <button
                            onClick={() => setActiveTab('trainer')}
                            data-testid="tab-trainer"
                            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'trainer'
                                ? 'border-gold-500 text-gold-500'
                                : 'border-transparent text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <Briefcase className="h-4 w-4" />
                            Del Entrenador
                        </button>
                        <button
                            onClick={() => setActiveTab('client')}
                            data-testid="tab-client"
                            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'client'
                                ? 'border-gold-500 text-gold-500'
                                : 'border-transparent text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <User className="h-4 w-4" />
                            Mis Plantillas
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500" data-testid="modal-loader">
                            <Loader2 className="h-8 w-8 animate-spin mb-3" />
                            <p className="text-sm">Cargando plantillas...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12 text-red-400">
                            <p className="text-sm">{error}</p>
                            <button
                                onClick={fetchRoutines}
                                className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : filteredRoutines.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <div className="mb-3 rounded-full bg-gray-900 p-4 ring-1 ring-gray-800">
                                {activeTab === 'trainer' ? (
                                    <Briefcase className="h-8 w-8 opacity-50" />
                                ) : (
                                    <User className="h-8 w-8 opacity-50" />
                                )}
                            </div>
                            <p className="text-sm">
                                {activeTab === 'trainer'
                                    ? 'No tienes rutinas asignadas por tu entrenador'
                                    : 'No has creado ninguna plantilla todavía'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredRoutines.map((routine) => {
                                const { totalBlocks, totalExercises, exerciseNames } = getRoutineSummary(routine)
                                return (
                                    <button
                                        key={routine.id}
                                        onClick={() => handleLoadRoutine(routine)}
                                        className="w-full group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-left transition-all hover:bg-gray-800 hover:border-gray-700 active:scale-[0.99]"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <FileText className="h-4 w-4 text-gold-500 flex-shrink-0" />
                                                    <h3 className="font-bold text-white truncate">{routine.name}</h3>
                                                </div>
                                                {routine.description && (
                                                    <p className="text-xs text-gray-500 mb-2 line-clamp-1">{routine.description}</p>
                                                )}
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <Dumbbell className="h-3 w-3" />
                                                    <span className="truncate">{exerciseNames}</span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500 font-medium">
                                                    <span>{totalBlocks} bloque{totalBlocks !== 1 ? 's' : ''}</span>
                                                    <span>•</span>
                                                    <span>{totalExercises} ejercicio{totalExercises !== 1 ? 's' : ''}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-xs font-medium text-gold-500">Cargar</span>
                                                <ChevronRight className="h-4 w-4 text-gold-500" />
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
