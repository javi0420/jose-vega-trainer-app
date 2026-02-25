import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Plus, X, Search, Dumbbell, Loader2, Trash2, FileText, User, Clock } from 'lucide-react'
import { useExercises } from '../hooks/useExercises'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useActiveWorkout } from '../context/ActiveWorkoutContext' // Import Context
import { useTimer } from '../context/TimerContext' // Import Timer
import WorkoutBlock from '../components/WorkoutBlock'
import LoadTemplateModal from '../components/LoadTemplateModal'
import LoadAssignedRoutineModal from '../components/LoadAssignedRoutineModal'
import GlobalRestTimerModal from '../components/GlobalRestTimerModal'
import ReplaceExerciseModal from '../components/ReplaceExerciseModal'
import ReorderExercisesModal from '../components/ReorderExercisesModal'
import { generateUUID } from '../utils/uuid'
import { normalizeText } from '../utils/text'
import { offlineQueue } from '../lib/offlineQueue'
import toast from 'react-hot-toast'

export default function WorkoutEditor() {
    const { user } = useAuth()
    // State for search must be defined BEFORE the hook use
    const [searchTerm, setSearchTerm] = useState('')

    // Use server-side search/pagination
    const { exercises, isLoading: isLoadingExercises, createExercise, fetchNextPage, hasNextPage, isFetchingNextPage } = useExercises(searchTerm)

    const { startWorkout, discardWorkout, workoutDuration } = useActiveWorkout()
    const { startTimer, stopTimer, isActive } = useTimer()

    const navigate = useNavigate()
    const location = useLocation()

    // Local State
    const [isSaving, setIsSaving] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
    const [isAssignedModalOpen, setIsAssignedModalOpen] = useState(false)
    const [isGlobalTimerModalOpen, setIsGlobalTimerModalOpen] = useState(false)
    const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false)
    const [isReorderModalOpen, setIsReorderModalOpen] = useState(false)
    const [activeBlockIdForSuperset, setActiveBlockIdForSuperset] = useState(null)
    const [replaceContext, setReplaceContext] = useState({ blockId: null, index: null })
    const [isEditingName, setIsEditingName] = useState(false)
    const [tempWorkoutName, setTempWorkoutName] = useState('')
    const [workout, setWorkout] = useState({
        name: 'Entrenamiento de Tarde',
        startTime: new Date(),
        blocks: []
    })


    // Timer Effect - Save workout progress (removed local timer, using context)
    useEffect(() => {
        // Navigation Guard
        const handleBeforeUnload = (e) => {
            if (workout.blocks.length > 0 && !isSaving) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        }
    }, [workout.blocks.length, isSaving])

    // Format elapsed time for display (MM:SS or HH:MM:SS)
    const formatElapsedTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60

        if (hrs > 0) {
            return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        }
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }

    // Load Draft or Routine on Mount
    useEffect(() => {
        let ignore = false;

        const loadRoutine = async (routineId) => {
            try {
                const { data: routine, error } = await supabase
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
                    .single()

                if (error) throw error
                if (ignore) return;

                // Transform to Workout Structure
                const blocks = routine.routine_blocks
                    .sort((a, b) => a.order_index - b.order_index)
                    .map(block => {
                        const blockExercises = block.routine_exercises
                            .sort((a, b) => a.position.localeCompare(b.position))
                            .map(re => {
                                const defaultSetCount = re.default_sets || 3;
                                const defaultReps = parseInt(re.default_reps) || 0;
                                const defaultRpe = re.default_rpe || null;

                                const sets = Array.from({ length: defaultSetCount }).map((_, i) => ({
                                    id: generateUUID(),
                                    setNumber: i + 1,
                                    weight: '',
                                    reps: '',
                                    prevWeight: re.target_weight,
                                    prevReps: re.target_reps || (parseInt(re.default_reps) || ''),
                                    rpe: defaultRpe,
                                    completed: false
                                }));

                                return {
                                    ...re.exercises,
                                    id: re.exercises?.id || generateUUID(),
                                    name: re.custom_exercise_name || re.exercises?.name || 'Ejercicio Personalizado',
                                    muscle_group: re.exercises?.muscle_group || 'General',
                                    position: re.position,
                                    sets: sets,
                                    notes: re.notes
                                };
                            });

                        return {
                            id: generateUUID(),
                            type: blockExercises.length > 1 ? 'superset' : 'single',
                            exercises: blockExercises
                        };
                    });

                setWorkout({
                    name: routine.name,
                    startTime: new Date(),
                    blocks: blocks
                });
                startWorkout('active');

            } catch (err) {
                if (!ignore) {
                    console.error("Error loading routine:", err);
                    alert("Error al cargar la rutina.");
                }
            }
        };

        const searchParams = new URLSearchParams(location.search);
        const routineId = location.state?.routineId || searchParams.get('routineId');
        const loadTemplate = location.state?.loadTemplate;

        if (loadTemplate) {
            handleLoadTemplate(loadTemplate);
            startWorkout('draft');
        } else if (routineId) {
            loadRoutine(routineId);
        } else {
            const savedDraft = localStorage.getItem('draft_workout')
            if (savedDraft) {
                try {
                    const parsed = JSON.parse(savedDraft)
                    parsed.startTime = new Date(parsed.startTime)
                    setWorkout(parsed)
                    startWorkout('draft')
                } catch (e) {
                    console.error("Error loading draft", e)
                }
            } else {
                startWorkout('draft')
            }
        }

        return () => {
            ignore = true;
            // Don't stop timer on unmount - it's global!
        };
    }, [])

    // Save Draft on Change
    useEffect(() => {
        if (workout.blocks.length > 0) {
            localStorage.setItem('draft_workout', JSON.stringify(workout))
            startWorkout('draft')
        }
    }, [workout, startWorkout])

    // Handlers
    const handleDiscardWorkout = () => {
        if (window.confirm('¿Estás seguro de que quieres descartar este entrenamiento? Se perderán todos los datos no guardados.')) {
            stopTimer()
            discardWorkout()
            localStorage.removeItem('draft_workout')
            navigate('/app', { replace: true })
        }
    }

    const handleLoadTemplate = (routine) => {
        if (!routine) return;

        // Confirm if there's existing data
        if (workout.blocks.length > 0) {
            const confirmLoad = window.confirm('¿Cargar esta plantilla? Se reemplazarán los ejercicios actuales.')
            if (!confirmLoad) return
        }

        // Standardized data mapping:
        // Supports: routine_blocks -> routine_exercises -> exercises
        const sourceBlocks = routine.routine_blocks || routine.blocks || [];

        const loadedBlocks = [...sourceBlocks]
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
            .map((rb) => {
                const sourceExercises = rb.routine_exercises || rb.exercises || [];

                const exercises = [...sourceExercises]
                    .sort((a, b) => (a.position || '').localeCompare(b.position || ''))
                    .map(re => {
                        const exerciseData = re.exercises || re.exercise || re;

                        return {
                            id: re.exercise_id || exerciseData.id || generateUUID(),
                            name: exerciseData.name || re.custom_exercise_name || 'Ejercicio',
                            muscle_group: exerciseData.muscle_group || 'General',
                            position: re.position || 'A',
                            isAdHoc: !re.exercise_id && !exerciseData.id,
                            sets: Array.from({ length: re.default_sets || 3 }, (_, i) => ({
                                id: generateUUID(),
                                setNumber: i + 1,
                                weight: '',
                                reps: '',
                                prevWeight: re.target_weight?.toString() || '',
                                prevReps: re.target_reps?.toString() || re.default_reps || '',
                                rpe: re.default_rpe || '',
                                rest_seconds: '',
                                tempo: '',
                                completed: false
                            })),
                            notes: re.notes || ''
                        };
                    });

                return {
                    id: generateUUID(),
                    order_index: rb.order_index,
                    type: exercises.length > 1 ? 'superset' : 'single',
                    exercises: exercises
                };
            });

        setWorkout({
            name: routine.name,
            startTime: new Date(),
            blocks: loadedBlocks
        });

        // Ensure timer is in active state if not already
        startWorkout('active');
    }

    const handleSaveWorkout = async () => {
        // Filtrar bloques y ejercicios válidos (que tengan nombre)
        const validBlocks = workout.blocks.map(block => ({
            ...block,
            exercises: block.exercises.filter(ex => ex.name.trim() !== '')
        })).filter(block => block.exercises.length > 0);

        if (validBlocks.length === 0) {
            alert('Añade al menos un ejercicio con nombre antes de guardar.')
            return
        }

        // Validación de sets (opcional: al menos 1 set completado en total)
        const hasCompletedSets = validBlocks.some(block =>
            block.exercises.some(ex => ex.sets && ex.sets.some(set => set.completed))
        )

        if (!hasCompletedSets) {
            const confirmSave = window.confirm('No has marcado ninguna serie como completada. ¿Guardar de todos modos?')
            if (!confirmSave) return
        }

        setIsSaving(true)

        try {
            if (!user || !user.id) {
                throw new Error('No hay sesión activa. Por favor, vuelve a iniciar sesión.')
            }

            // Construct payload for RPC
            console.log('DEBUG: Compiling workout payload...');
            const payload = {
                p_user_id: user.id,
                p_name: workout.name,
                p_date: workout.startTime.toISOString(),
                p_duration: workoutDuration,
                p_status: 'completed',
                p_blocks: validBlocks.map((block, bIdx) => ({
                    order_index: bIdx,
                    type: block.type,
                    exercises: block.exercises.map(ex => {
                        const isValidUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
                        const effectiveIsAdHoc = ex.isAdHoc || !isValidUUID(ex.id);

                        return {
                            exercise_id: effectiveIsAdHoc ? null : ex.id,
                            custom_exercise_name: effectiveIsAdHoc ? ex.name : null,
                            position: ex.position || 'A',
                            notes: ex.notes,
                            sets: (ex.sets || []).map(set => ({
                                setNumber: set.setNumber,
                                weight: parseFloat(set.weight) || 0,
                                reps: parseFloat(set.reps) || 0,
                                rpe: parseFloat(set.rpe) || null,
                                rest_seconds: parseFloat(set.rest_seconds) || null,
                                tempo: set.tempo || null,
                                completed: set.completed
                            }))
                        };
                    })
                }))
            };

            // OFFLINE HANDLING
            if (!navigator.onLine) {
                await offlineQueue.add('SAVE_WORKOUT', payload)

                toast.success('Guardado en modo OFFLINE. Se subirá automáticamente cuando recuperes la conexión.', {
                    duration: 6000,
                    icon: '📡'
                })

                stopTimer()
                discardWorkout()
                localStorage.removeItem('draft_workout')

                navigate('/app/history', { replace: true })
                return
            }

            // Call Atomic RPC
            console.log('DEBUG: Sending RPC save_full_workout', payload);
            const { data: workoutId, error } = await supabase.rpc('save_full_workout', payload)

            if (error) throw error

            // Éxito
            // Don't stop timer here, allow it to continue or stop explicitly if needed.
            // Actually, we usually stop it on save.
            stopTimer()
            discardWorkout() // Clears context
            localStorage.removeItem('draft_workout')

            navigate(`/app/workout/${workoutId}`, { replace: true })

        } catch (error) {
            console.error('Error guardando entrenamiento:', error)
            alert(`Error al guardar: ${error.message}`)
        } finally {
            setIsSaving(false)
        }
    }
    const handleAddExercise = (exercise, e) => {
        if (e) e.preventDefault()

        if (activeBlockIdForSuperset) {
            // AÑADIR A BLOQUE EXISTENTE (SUPERSET)
            setWorkout(prev => ({
                ...prev,
                blocks: prev.blocks.map(b => {
                    if (b.id === activeBlockIdForSuperset) {
                        const position = String.fromCharCode(65 + b.exercises.length); // A, B, C...
                        return {
                            ...b,
                            type: 'superset',
                            exercises: [...b.exercises, { ...exercise, position, sets: [] }]
                        };
                    }
                    return b;
                })
            }));
        } else {
            // AÑADIR NUEVO BLOQUE
            const newBlock = {
                id: generateUUID(),
                type: 'single',
                exercises: [{ ...exercise, position: 'A', sets: [] }],
            }

            setWorkout(prev => ({
                ...prev,
                blocks: [...prev.blocks, newBlock]
            }))
        }

        setIsModalOpen(false)
        setSearchTerm('')
        setActiveBlockIdForSuperset(null) // Reset
    }

    const openExerciseModal = useCallback((blockId = null) => {
        setActiveBlockIdForSuperset(blockId)
        setIsModalOpen(true)
    }, [])

    // Handler para actualizar un bloque específico
    const updateBlock = useCallback((blockId, updatedBlockData) => {
        setWorkout(prev => ({
            ...prev,
            blocks: prev.blocks.map(b => b.id === blockId ? updatedBlockData : b)
        }))
    }, [])

    const handleApplyGlobalRest = useCallback((seconds) => {
        setWorkout(prev => ({
            ...prev,
            blocks: prev.blocks.map(block => ({
                ...block,
                exercises: block.exercises.map(ex => ({
                    ...ex,
                    target_rest_time: seconds
                }))
            }))
        }))
        toast.success(`Descanso de ${seconds}s aplicado a todos los ejercicios`)
    }, [])

    const moveBlock = useCallback((index, direction) => {
        setWorkout(prev => {
            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= prev.blocks.length) return prev;

            const newBlocks = [...prev.blocks];
            const temp = newBlocks[index];
            newBlocks[index] = newBlocks[newIndex];
            newBlocks[newIndex] = temp;
            return { ...prev, blocks: newBlocks };
        });
    }, [])

    const handleRemoveExerciseFromBlock = useCallback((blockId, exerciseIndex) => {
        setWorkout(prev => {
            const blockIndex = prev.blocks.findIndex(b => b.id === blockId);
            if (blockIndex === -1) return prev;

            const block = prev.blocks[blockIndex];

            // Caso 1: Es el único ejercicio del bloque -> Borrar Bloque
            if (block.exercises.length <= 1) {
                const newBlocks = prev.blocks.filter(b => b.id !== blockId);
                return { ...prev, blocks: newBlocks };
            }

            // Caso 2: Es parte de un superset -> Borrar solo ejercicio y reordenar letras
            const newExercises = block.exercises.filter((_, idx) => idx !== exerciseIndex);

            // Re-asignar posiciones (A, B, C...)
            const reorderedExercises = newExercises.map((ex, idx) => ({
                ...ex,
                position: String.fromCharCode(65 + idx)
            }));

            const updatedBlock = {
                ...block,
                type: reorderedExercises.length > 1 ? 'superset' : 'single',
                exercises: reorderedExercises
            };

            const newBlocks = [...prev.blocks];
            newBlocks[blockIndex] = updatedBlock;

            return { ...prev, blocks: newBlocks };
        });
    }, [])

    const handleReplaceExercise = useCallback((blockId, exerciseIndex, newExerciseData) => {
        setWorkout(prev => ({
            ...prev,
            blocks: prev.blocks.map(block => {
                if (block.id !== blockId) return block;

                const updatedExercises = [...block.exercises];
                const oldExercise = updatedExercises[exerciseIndex];

                // CRITICAL: Preserve existing sets
                updatedExercises[exerciseIndex] = {
                    ...newExerciseData,
                    position: oldExercise.position,
                    sets: oldExercise.sets || [],
                    notes: oldExercise.notes || ''
                };

                return { ...block, exercises: updatedExercises };
            })
        }));
        setIsReplaceModalOpen(false);
        toast.success(`Ejercicio cambiado a ${newExerciseData.name}`);
    }, []);

    const handleReorderBlocks = useCallback((reorderedBlocks) => {
        setWorkout(prev => ({ ...prev, blocks: reorderedBlocks }));
    }, []);

    // Filter logic removed (server-side now)

    const mainContainerRef = useRef(null);

    // Dynamic padding to ensure bottom actions are always reachable above the timer
    const bottomPadding = isActive ? 'pb-80' : 'pb-60';

    return (
        <div className="flex h-screen flex-col bg-gray-950 text-gray-100">
            {/* Top Navigation */}
            <header className="flex items-center gap-2 border-b border-gray-800 bg-gray-900 px-3 py-2">
                <button
                    data-testid="btn-back"
                    onClick={() => navigate(-1)}
                    className="rounded-full h-10 w-10 flex items-center justify-center text-gray-400 hover:bg-gray-800 transition-colors"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 min-w-0">
                    <button
                        data-testid="workout-header-title-trigger"
                        onClick={() => {
                            setTempWorkoutName(workout.name)
                            setIsEditingName(true)
                        }}
                        className="flex items-center gap-2 group w-full text-left"
                    >
                        <span className="text-base font-semibold text-white truncate max-w-[200px]">
                            {workout.name}
                        </span>
                        <FileText className="h-3.5 w-3.5 text-gray-500 group-hover:text-gold-500 transition-colors" />
                    </button>
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider font-medium flex items-center gap-1.5 leading-none">
                        <Clock className="h-2.5 w-2.5" />
                        {formatElapsedTime(workoutDuration)} • {workout.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsGlobalTimerModalOpen(true)}
                        data-testid="btn-global-rest"
                        className={`rounded-lg h-10 w-10 flex items-center justify-center transition-colors ${isActive ? 'bg-gold-500 text-black animate-pulse' : 'text-gray-400 hover:bg-gray-800'}`}
                        title="Configurar descanso global"
                    >
                        <Clock className="h-5 w-5" />
                    </button>

                    {workout.blocks.length > 0 && (
                        <button
                            onClick={() => setIsTemplateModalOpen(true)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gold-500 transition-colors"
                            title="Cargar plantilla"
                        >
                            <FileText className="h-5 w-5" />
                        </button>
                    )}

                    {/* Botón Cargar Rutina Asignada (Entrenador) */}
                    <button
                        onClick={() => setIsAssignedModalOpen(true)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gold-500 transition-colors"
                        title="Cargar rutina asignada por entrenador"
                    >
                        <User className="h-5 w-5" />
                    </button>

                    <button
                        onClick={handleDiscardWorkout}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                        title="Descartar entrenamiento"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={handleSaveWorkout}
                        disabled={isSaving}
                        data-testid="workout-btn-save"
                        className="rounded-xl bg-gold-500 px-4 h-11 text-xs font-bold text-black shadow-lg shadow-gold-500/20 hover:bg-gold-400 active:scale-95 disabled:opacity-50 transition-all"
                    >
                        {isSaving ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>...</span>
                            </div>
                        ) : 'Finalizar'}
                    </button>
                </div>
            </header >

            {/* Main Content (Scrollable) */}
            < main ref={mainContainerRef} className={`flex-1 overflow-y-auto p-4 ${bottomPadding}`} >
                {
                    workout.blocks.length === 0 ? (
                        <div className="mt-8 flex flex-col items-center justify-center text-center text-gray-500">
                            <div className="mb-4 rounded-full bg-gray-900 p-4 ring-1 ring-gray-800">
                                <Dumbbell className="h-8 w-8 opacity-50" />
                            </div>
                            <p>Tu rutina está vacía.</p>
                            <p className="text-sm mb-6">Añade ejercicios o carga una plantilla.</p>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    data-testid="btn-load-template"
                                    onClick={() => setIsTemplateModalOpen(true)}
                                    className="flex items-center gap-2 rounded-xl bg-gray-800 border border-gray-700 px-6 py-3 text-white font-bold shadow-lg hover:bg-gray-700 hover:border-gray-600 active:scale-95 transition-all"
                                >
                                    <FileText className="h-5 w-5" />
                                    <span>Cargar Plantilla</span>
                                </button>

                                <button
                                    onClick={() => setIsAssignedModalOpen(true)}
                                    data-testid="btn-load-assigned"
                                    className="flex items-center gap-2 rounded-xl bg-gray-900 border border-gray-700 px-6 py-3 text-gold-500 font-bold shadow-lg hover:bg-gray-800 hover:border-gold-500/50 active:scale-95 transition-all"
                                >
                                    <User className="h-5 w-5" />
                                    <span>Rutina Entrenador</span>
                                </button>

                                <button
                                    onClick={() => openExerciseModal(null)}
                                    data-testid="btn-add-block"
                                    className="flex items-center gap-2 rounded-xl bg-gold-500 px-6 py-3 text-black font-bold shadow-lg hover:bg-gold-400 active:scale-95 transition-all"
                                >
                                    <Plus className="h-5 w-5" />
                                    <span>Añadir Ejercicio</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {workout.blocks.map((block, index) => (
                                <div key={block.id} data-testid={`workout-block-${index}`}>
                                    <WorkoutBlock
                                        block={block}
                                        blockIndex={index}
                                        isFirst={index === 0}
                                        isLast={index === workout.blocks.length - 1}
                                        moveBlock={moveBlock}
                                        updateBlock={updateBlock}
                                        openExerciseModal={openExerciseModal}
                                        openReplaceModal={(blockId, exIndex) => {
                                            setReplaceContext({ blockId, index: exIndex });
                                            setIsReplaceModalOpen(true);
                                        }}
                                        openReorderModal={() => setIsReorderModalOpen(true)}
                                        removeExerciseFromBlock={handleRemoveExerciseFromBlock}
                                    />
                                </div>
                            ))}

                            {/* Static Add Button at the end of the list */}
                            <button
                                onClick={() => openExerciseModal(null)}
                                data-testid="btn-add-block"
                                className="group mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-gray-800 py-5 text-gold-500 shadow-lg ring-1 ring-gray-700/50 transition-all active:scale-[0.98] active:bg-gray-700"
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-500/10 transition-colors group-active:bg-gold-500/20">
                                    <Plus className="h-5 w-5" />
                                </div>
                                <span className="text-lg font-bold tracking-wide">Añadir Ejercicio</span>
                            </button>
                        </div>
                    )
                }

            </main >



            {/* Exercise Selector Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950 sm:inset-x-0 sm:bottom-0 sm:top-auto sm:h-[80vh] sm:rounded-t-2xl sm:border-t sm:border-gray-800">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-gray-800 p-4">
                            <div className="flex flex-col">
                                <h2 className="text-lg font-bold text-white leading-tight">
                                    {activeBlockIdForSuperset ? 'Agrupar Ejercicio' : 'Añadir Ejercicio'}
                                </h2>
                                {activeBlockIdForSuperset && (
                                    <span className="text-[10px] font-bold text-gold-500 uppercase tracking-widest">Creando Superserie</span>
                                )}
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="rounded-full p-2 text-gray-400 hover:bg-gray-800"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar ejercicio..."
                                    className="w-full rounded-lg border-none bg-gray-800 h-12 pl-10 pr-4 text-white text-base placeholder-gray-500 focus:ring-2 focus:ring-gold-500"
                                    autoFocus
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Exercise List */}
                        <div className="flex-1 overflow-y-auto p-2">
                            {isLoadingExercises ? (
                                <div className="px-4 py-8 text-center text-gray-500">Cargando catálogo...</div>
                            ) : exercises?.length > 0 ? (
                                <ul className="space-y-1">
                                    {exercises.map(ex => (
                                        <li key={ex.id}>
                                            <button
                                                type="button"
                                                onClick={(e) => handleAddExercise(ex, e)}
                                                data-testid={`exercise-item-${ex.id}`}
                                                className="flex w-full min-h-[44px] items-center gap-4 rounded-lg px-4 py-3 text-left hover:bg-gray-900 active:bg-gray-800 touch-manipulation"
                                            >
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-200">{ex.name}</p>
                                                    {ex.muscle_group && (
                                                        <span className="inline-block rounded bg-gray-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                                                            {ex.muscle_group}
                                                        </span>
                                                    )}
                                                </div>
                                                <Plus className="h-5 w-5 text-gray-600" />
                                            </button>
                                        </li>
                                    ))}
                                    {/* Load More Button */}
                                    {hasNextPage && (
                                        <li className="pt-2 pb-4 flex justify-center">
                                            <button
                                                onClick={() => fetchNextPage()}
                                                disabled={isFetchingNextPage}
                                                className="px-4 py-2 text-sm text-gold-500 hover:text-gold-400 disabled:opacity-50"
                                            >
                                                {isFetchingNextPage ? 'Cargando...' : 'Cargar más ejercicios'}
                                            </button>
                                        </li>
                                    )}
                                </ul>
                            ) : (
                                <div className="px-4 py-8 text-center text-gray-500">
                                    <p className="mb-4">No se encontraron ejercicios.</p>
                                    {searchTerm && (
                                        <button
                                            onClick={() => {
                                                handleAddExercise({
                                                    id: generateUUID(), // Temporary local ID
                                                    name: searchTerm,
                                                    muscle_group: 'General',
                                                    isAdHoc: true
                                                })
                                            }}
                                            className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-black hover:bg-gold-400"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Usar "{searchTerm}" (Solo este entreno)
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Assigned Routine Modal */}
            {
                isAssignedModalOpen && (
                    <LoadAssignedRoutineModal
                        isOpen={isAssignedModalOpen}
                        onClose={() => setIsAssignedModalOpen(false)}
                        onLoadRoutine={handleLoadTemplate}
                    />
                )
            }

            {/* Replace Exercise Modal */}
            {isReplaceModalOpen && (
                <ReplaceExerciseModal
                    isOpen={isReplaceModalOpen}
                    onClose={() => setIsReplaceModalOpen(false)}
                    onReplace={handleReplaceExercise}
                    activeBlockId={replaceContext.blockId}
                    exerciseIndex={replaceContext.index}
                />
            )}

            {/* Reorder Blocks Modal */}
            {isReorderModalOpen && (
                <ReorderExercisesModal
                    isOpen={isReorderModalOpen}
                    onClose={() => setIsReorderModalOpen(false)}
                    blocks={workout.blocks}
                    onReorder={handleReorderBlocks}
                    onRemoveBlock={(id) => handleRemoveExerciseFromBlock(id, 0)}
                />
            )}

            {/* Load Template Modal */}
            {
                isTemplateModalOpen && (
                    <LoadTemplateModal
                        isOpen={isTemplateModalOpen}
                        onClose={() => setIsTemplateModalOpen(false)}
                        onLoadTemplate={handleLoadTemplate}
                    />
                )
            }
            {/* Name Editor Bottom Sheet */}
            {isEditingName && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm transition-opacity">
                    <div className="w-full max-w-xl animate-in slide-in-from-bottom duration-300 rounded-t-[2.5rem] bg-gray-900/95 backdrop-blur-xl border-t border-white/10 p-8 pb-10 shadow-2xl shadow-black">
                        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-gray-800" />

                        <h3 className="mb-6 text-xl font-black text-white uppercase tracking-tight">Editar Nombre</h3>

                        <div className="space-y-6">
                            <div className="relative">
                                <input
                                    type="text"
                                    autoFocus
                                    data-testid="workout-name-edit-input"
                                    value={tempWorkoutName}
                                    onChange={(e) => setTempWorkoutName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && tempWorkoutName.trim()) {
                                            setWorkout(prev => ({ ...prev, name: tempWorkoutName }))
                                            setIsEditingName(false)
                                        }
                                    }}
                                    placeholder="Nombre del entrenamiento"
                                    className="h-14 w-full rounded-2xl bg-black/40 border border-white/5 px-4 text-lg font-bold text-white placeholder-gray-700 transition-all focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/50"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsEditingName(false)}
                                    data-testid="workout-name-cancel-btn"
                                    className="h-14 flex-1 rounded-2xl border border-white/5 bg-white/5 text-sm font-black text-gray-400 uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        if (tempWorkoutName.trim()) {
                                            setWorkout(prev => ({ ...prev, name: tempWorkoutName }))
                                            setIsEditingName(false)
                                        }
                                    }}
                                    disabled={!tempWorkoutName.trim()}
                                    data-testid="workout-name-save-btn"
                                    className="h-14 flex-[1.5] rounded-2xl bg-gold-500 text-sm font-black text-black uppercase tracking-widest shadow-lg shadow-gold-500/20 hover:bg-gold-400 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Global Rest Timer Modal */}
            <GlobalRestTimerModal
                isOpen={isGlobalTimerModalOpen}
                onClose={() => setIsGlobalTimerModalOpen(false)}
                onApply={handleApplyGlobalRest}
                currentDefault={60}
            />
        </div >
    )
}
