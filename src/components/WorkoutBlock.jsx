import { useState, memo, Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { Plus, Trash2, Check, ClipboardList, Loader2, BarChart2, Timer, ChevronUp, ChevronDown, MoreVertical, ArrowUpDown, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import { supabase } from '../lib/supabase'
import LastPerformance from './LastPerformance'
import LastNote from './LastNote'
import ExerciseChart from './ExerciseChart'
import { useTimer } from '../context/TimerContext'
import { generateUUID } from '../utils/uuid'

const WorkoutBlock = memo(function WorkoutBlock({
    block,
    blockIndex,
    updateBlock,
    moveBlock,
    openExerciseModal,
    openReplaceModal,
    openReorderModal,
    removeExerciseFromBlock,
    isFirst,
    isLast
}) {
    // block.exercises es el array principal ahora (gracias al refactor en WorkoutEditor)
    // Fallback por si acaso viene con nombres antiguos, pero debería ser 'exercises'
    const exercises = block.exercises || block.block_exercises || block.exercise || [];
    const { startTimer } = useTimer()

    const moveExercise = (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= exercises.length) return;

        const newExercises = [...exercises];
        const temp = newExercises[index];
        newExercises[index] = newExercises[newIndex];
        newExercises[newIndex] = temp;

        // Re-assign positions (A, B, C...)
        const reorderedExercises = newExercises.map((ex, idx) => ({
            ...ex,
            position: String.fromCharCode(65 + idx)
        }));

        updateBlock(block.id, { ...block, exercises: reorderedExercises });
    }

    // Estado local para controlar qué gráficas se muestran (diccionario exerciseId -> bool)
    const [chartsVisible, setChartsVisible] = useState({});
    const [timerSettingsVisible, setTimerSettingsVisible] = useState({}); // exerciseId -> bool
    const [loadingLast, setLoadingLast] = useState({}); // Diccionario exerciseId -> bool

    const toggleChart = (exerciseId) => {
        setChartsVisible(prev => ({ ...prev, [exerciseId]: !prev[exerciseId] }));
    }

    const toggleTimerSettings = (exerciseId) => {
        setTimerSettingsVisible(prev => ({ ...prev, [exerciseId]: !prev[exerciseId] }));
    }

    const handleRestTimeChange = (exerciseIndex, seconds) => {
        const targetExercise = exercises[exerciseIndex];
        const updatedExercises = [...exercises];
        updatedExercises[exerciseIndex] = { ...targetExercise, target_rest_time: seconds };
        updateBlock(block.id, { ...block, exercises: updatedExercises });
    }

    // --- FUNCIONES GESTIÓN DE SETS (Ahora requieren exerciseIndex o Id) ---

    const handleAddSet = (exerciseIndex) => {
        const targetExercise = exercises[exerciseIndex];
        const currentSets = targetExercise.sets || [];
        const previousSet = currentSets.length > 0 ? currentSets[currentSets.length - 1] : null;

        const newSet = {
            id: generateUUID(),
            setNumber: currentSets.length + 1,
            weight: '', // Value starts empty
            reps: '',   // Value starts empty
            prevWeight: previousSet ? (previousSet.weight || previousSet.prevWeight) : '', // Placeholder logic
            prevReps: previousSet ? (previousSet.reps || previousSet.prevReps) : '', // Placeholder logic
            rpe: '',
            rest_seconds: '',
            tempo: '',
            completed: false
        };

        const updatedExercises = [...exercises];
        updatedExercises[exerciseIndex] = {
            ...targetExercise,
            sets: [...currentSets, newSet]
        };

        updateBlock(block.id, { ...block, exercises: updatedExercises });
    };

    const handleRemoveSet = (exerciseIndex, setId) => {
        const targetExercise = exercises[exerciseIndex];
        const filteredSets = targetExercise.sets.filter(s => s.id !== setId);
        // Renumerar
        const reorderedSets = filteredSets.map((s, index) => ({ ...s, setNumber: index + 1 }));

        const updatedExercises = [...exercises];
        updatedExercises[exerciseIndex] = { ...targetExercise, sets: reorderedSets };

        updateBlock(block.id, { ...block, exercises: updatedExercises });
    };

    const handleSetChange = (exerciseIndex, setId, field, value) => {
        const targetExercise = exercises[exerciseIndex];
        // Normalize comma to dot for decimal separator (iOS Spanish keyboard fix)
        const normalizedValue = (field === 'weight' || field === 'reps' || field === 'rpe')
            ? value.replace(',', '.')
            : value;
        const updatedSets = targetExercise.sets.map(set => set.id === setId ? { ...set, [field]: normalizedValue } : set);

        const updatedExercises = [...exercises];
        updatedExercises[exerciseIndex] = { ...targetExercise, sets: updatedSets };

        updateBlock(block.id, { ...block, exercises: updatedExercises });
    };

    const toggleSetComplete = (exerciseIndex, setId) => {
        const targetExercise = exercises[exerciseIndex];
        const updatedSets = targetExercise.sets.map(set => {
            if (set.id === setId) {
                const newCompletedState = !set.completed;

                // TIMER LOGIC
                // Si marcamos como completado (true)
                if (newCompletedState) {
                    // Usar configuración del ejercicio (target_rest_time) o por defecto 60s
                    // El usuario puede configurar 0 para desactivar.
                    const exerciseTarget = targetExercise.target_rest_time;
                    const duration = exerciseTarget !== undefined ? parseInt(exerciseTarget) : 60;

                    if (duration > 0) {
                        // SUPERSET LOGIC: Solo saltar si es el último ejercicio del bloque
                        const isLastExerciseInBlock = exerciseIndex === exercises.length - 1;
                        if (isLastExerciseInBlock) {
                            startTimer(duration);
                        }
                    }
                }

                return { ...set, completed: newCompletedState };
            }
            return set;
        });

        const updatedExercises = [...exercises];
        updatedExercises[exerciseIndex] = { ...targetExercise, sets: updatedSets };

        updateBlock(block.id, { ...block, exercises: updatedExercises });
    };

    const handleNotesChange = (exerciseIndex, value) => {
        const targetExercise = exercises[exerciseIndex];
        const updatedExercises = [...exercises];
        updatedExercises[exerciseIndex] = { ...targetExercise, notes: value };
        updateBlock(block.id, { ...block, exercises: updatedExercises });
    };

    // --- LOAD LAST WORKOUT (Optimized via RPC) ---
    const handleLoadLastSession = async (exerciseIndex) => {
        const targetExercise = exercises[exerciseIndex];
        const exId = targetExercise.id;

        if (!exId) return;

        setLoadingLast(prev => ({ ...prev, [exId]: true }));

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.id) {
                throw new Error("No hay sesión activa.");
            }

            // RPC CALL: Instant retrieval bypassing RLS overhead
            const { data, error } = await supabase.rpc('get_last_exercise_session', {
                p_exercise_id: exId,
                p_user_id: user.id
            });

            if (error) throw error;

            if (data && data.length > 0) {
                // RPC returns directly the sets (ordered by set number)
                // We map them to our internal structure
                const newSets = data.map((s, idx) => ({
                    id: generateUUID(),
                    setNumber: idx + 1,
                    weight: '', // Keep empty for placeholder use
                    reps: '',   // Keep empty for placeholder use
                    prevWeight: s.weight,
                    prevReps: s.reps,
                    rpe: '',
                    rest_seconds: s.rest_seconds || '',
                    tempo: '',
                    completed: false
                }));

                const updatedExercises = [...exercises];
                updatedExercises[exerciseIndex] = {
                    ...targetExercise,
                    sets: newSets,
                    notes: targetExercise.notes || data[0].note || ''
                };
                updateBlock(block.id, { ...block, exercises: updatedExercises });

                // Optional: Show note if exists (handled by RPC returning 'note' field)
                // if (data[0].note) alert("Nota de sesión anterior: " + data[0].note);

            } else {
                alert("No se encontró historial previo para este ejercicio.");
            }
        } catch (error) {
            console.error("Error loading last:", error);
            alert("Error cargando historial: " + error.message);
        } finally {
            setLoadingLast(prev => ({ ...prev, [exId]: false }));
        }
    };


    if (!exercises || exercises.length === 0) {
        return <div className="p-4 bg-gray-900 border border-red-900/50 rounded mb-4 text-red-500">Bloque vacío (Error de datos)</div>
    }

    return (
        <div className="rounded-[2.5rem] glass-card shadow-2xl mb-6 overflow-hidden group">
            {/* Si es SUPERSET (más de 1 ejercicio), podríamos poner un header general o indicador de grupo */}
            {exercises.length > 1 ? (
                <div className="bg-gold-500/10 px-6 py-3 border-b border-gold-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-gold-500 animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                        <span className="text-[10px] font-black text-gold-500 tracking-[0.2em] uppercase italic">Superset / Triserie</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => moveBlock(blockIndex, -1)}
                            disabled={isFirst}
                            data-testid="btn-move-superset-up"
                            className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-white disabled:opacity-20 transition-all"
                        >
                            <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => moveBlock(blockIndex, 1)}
                            disabled={isLast}
                            data-testid="btn-move-superset-down"
                            className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-white disabled:opacity-20 transition-all"
                        >
                            <ChevronDown className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="px-4 py-2 flex justify-end">
                    <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => moveBlock(blockIndex, -1)}
                            disabled={isFirst}
                            data-testid="btn-move-block-up"
                            className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-white disabled:opacity-20 transition-all"
                        >
                            <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => moveBlock(blockIndex, 1)}
                            disabled={isLast}
                            data-testid="btn-move-block-down"
                            className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-white disabled:opacity-20 transition-all"
                        >
                            <ChevronDown className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {exercises.map((exercise, index) => {
                const isLoading = loadingLast[exercise.id];
                const isChartVisible = chartsVisible[exercise.id];
                const sets = exercise.sets || [];

                return (
                    <div key={exercise.id + '-' + index} className={clsx("p-6", index < exercises.length - 1 && "border-b border-white/5")}>
                        {/* Header del Ejercicio */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                {/* Indicador A/B/C si hay varios */}
                                {exercises.length > 1 && (
                                    <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-gold-500/10 text-[10px] font-black text-gold-500 border border-gold-500/10">
                                        {String.fromCharCode(64 + (index + 1))}
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-lg text-white leading-tight tracking-tight uppercase">{exercise.name}</h3>
                                        {exercises.length > 1 && (
                                            <div className="flex items-center">
                                                <button
                                                    onClick={() => moveExercise(index, -1)}
                                                    disabled={index === 0}
                                                    data-testid={`btn-move-ex-up-${index}`}
                                                    className="p-0.5 text-gray-600 hover:text-gray-400 disabled:opacity-0 transition-all"
                                                >
                                                    <ChevronUp className="h-3 w-3" />
                                                </button>
                                                <button
                                                    onClick={() => moveExercise(index, 1)}
                                                    disabled={index === exercises.length - 1}
                                                    data-testid={`btn-move-ex-down-${index}`}
                                                    className="p-0.5 text-gray-600 hover:text-gray-400 disabled:opacity-0 transition-all"
                                                >
                                                    <ChevronDown className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <span className="inline-block mt-0.5 w-fit rounded-lg bg-white/5 px-2 py-0.5 text-[9px] font-black text-gray-500 uppercase tracking-[0.15em] border border-white/5">
                                        {exercise.muscle_group}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleLoadLastSession(index)}
                                    disabled={isLoading}
                                    className="p-2.5 rounded-xl bg-white/5 text-gray-500 hover:bg-gold-500/10 hover:text-gold-500 transition-all border border-white/5"
                                    title="Copiar último"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ClipboardList className="w-5 h-5" />}
                                </button>
                                <button
                                    onClick={() => toggleChart(exercise.id)}
                                    className={clsx("p-2.5 rounded-xl transition-all border border-white/5", isChartVisible ? "bg-gold-500 text-black border-gold-500" : "bg-white/5 text-gray-500 hover:bg-white/10")}
                                >
                                    <BarChart2 className="w-5 h-5" />
                                </button>

                                <Menu as="div" className="relative inline-block text-left">
                                    <Menu.Button
                                        className="p-2.5 rounded-xl bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300 transition-all border border-white/5"
                                        title="Menú de ejercicio"
                                        data-testid={`exercise-kebab-menu-${block.id}-${index}`}
                                    >
                                        <MoreVertical className="w-5 h-5" />
                                    </Menu.Button>

                                    <Menu.Items className="absolute right-0 z-[100] mt-2 w-56 origin-top-right rounded-2xl bg-gray-900/95 border border-white/10 shadow-2xl backdrop-blur-xl focus:outline-none p-2 overflow-hidden">
                                        <div className="space-y-1">
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => openReorderModal()}
                                                        className={clsx(
                                                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all",
                                                            active ? "bg-white/10 text-white" : "text-gray-400"
                                                        )}
                                                    >
                                                        <ArrowUpDown className="h-4 w-4" />
                                                        Reordenar ejercicios
                                                    </button>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => openReplaceModal(block.id, index)}
                                                        data-testid="btn-change-exercise"
                                                        className={clsx(
                                                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all",
                                                            active ? "bg-white/10 text-white" : "text-gray-400"
                                                        )}
                                                    >
                                                        <RefreshCw className="h-4 w-4" />
                                                        Cambiar ejercicio
                                                    </button>
                                                )}
                                            </Menu.Item>
                                            <div className="my-1 border-t border-white/5" />
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => removeExerciseFromBlock(block.id, index)}
                                                        className={clsx(
                                                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all",
                                                            active ? "bg-red-500/20 text-red-500" : "text-red-500/70"
                                                        )}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Eliminar ejercicio
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        </div>
                                    </Menu.Items>
                                </Menu>
                            </div>
                        </div>

                        {/* Rest Timer Config Row */}
                        <div className="relative mb-4">
                            <button
                                onClick={() => toggleTimerSettings(exercise.id)}
                                className="flex items-center gap-2 text-[10px] font-black text-gold-500/80 hover:text-gold-500 transition-all uppercase tracking-[0.15em] bg-gold-500/5 px-3 py-1.5 rounded-lg border border-gold-500/10"
                            >
                                <Timer className="w-4 h-4" />
                                <span>
                                    Descanso: {exercise.target_rest_time !== undefined
                                        ? `${Math.floor(exercise.target_rest_time / 60)}m ${exercise.target_rest_time % 60}s`
                                        : '1m 0s'}
                                </span>
                            </button>

                            {/* Enhanced Popover for Timer Settings */}
                            {timerSettingsVisible[exercise.id] && (
                                <div className="absolute top-10 left-0 z-50 w-64 rounded-[2rem] glass-panel p-6 shadow-2xl animate-in fade-in zoom-in-95 backdrop-blur-2xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Configurar Descanso</h4>
                                        <button onClick={() => toggleTimerSettings(exercise.id)} className="text-gray-500 hover:text-white transition-colors">✕</button>
                                    </div>

                                    <div className="flex justify-center mb-6">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-black text-white tracking-tighter">
                                                {exercise.target_rest_time !== undefined ? Math.floor(exercise.target_rest_time / 60).toString().padStart(2, '0') : '01'}
                                            </span>
                                            <span className="text-gold-500 font-black text-4xl">:</span>
                                            <span className="text-5xl font-black text-white tracking-tighter">
                                                {exercise.target_rest_time !== undefined ? (exercise.target_rest_time % 60).toString().padStart(2, '0') : '00'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between gap-3 mb-4">
                                        <button
                                            onClick={() => handleRestTimeChange(index, Math.max(0, (exercise.target_rest_time || 60) - 15))}
                                            className="flex-1 rounded-xl bg-white/5 border border-white/5 h-12 flex items-center justify-center text-xs font-black text-gray-400 hover:bg-white/10 hover:text-white active:scale-95 transition-all"
                                        >
                                            -15s
                                        </button>
                                        <button
                                            onClick={() => handleRestTimeChange(index, (exercise.target_rest_time || 60) + 15)}
                                            className="flex-1 rounded-xl bg-white/5 border border-white/5 h-12 flex items-center justify-center text-xs font-black text-gray-400 hover:bg-white/10 hover:text-white active:scale-95 transition-all"
                                        >
                                            +15s
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        {[30, 60, 90, 120, 180, 300].map(seconds => (
                                            <button
                                                key={seconds}
                                                onClick={() => handleRestTimeChange(index, seconds)}
                                                className={clsx(
                                                    "rounded-lg py-1.5 text-[10px] font-black uppercase tracking-tighter transition-all",
                                                    (exercise.target_rest_time || 60) === seconds
                                                        ? "bg-gold-500 text-black shadow-lg shadow-gold-500/30"
                                                        : "bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300"
                                                )}
                                            >
                                                {seconds >= 60 ? `${seconds / 60}m` : `${seconds}s`}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => {
                                            startTimer(exercise.target_rest_time || 60);
                                            toggleTimerSettings(exercise.id);
                                        }}
                                        className="mt-6 w-full rounded-2xl bg-gold-500 py-3.5 text-xs font-black text-black hover:bg-gold-400 active:scale-95 transition-all shadow-xl shadow-gold-500/20 uppercase tracking-widest"
                                    >
                                        Iniciar Timer
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Last Performance Widget */}
                        <LastNote exerciseId={exercise.id} />
                        <LastPerformance exerciseId={exercise.id} />

                        {/* Exercise Notes */}
                        <div className="mt-3 mb-4 relative group">
                            <div className="absolute left-4 top-4 text-gray-700 group-focus-within:text-gold-500/50 transition-colors">
                                <ClipboardList className="h-4 w-4" />
                            </div>
                            <textarea
                                value={exercise.notes || ''}
                                onChange={(e) => handleNotesChange(index, e.target.value)}
                                placeholder="Notas técnicas para hoy..."
                                className="w-full rounded-2xl bg-black/20 border border-white/5 p-4 pl-11 text-xs text-gray-300 placeholder-gray-500 focus:border-gold-500/30 focus:outline-none transition-all resize-none h-16 tracking-tight leading-relaxed"
                            />
                        </div>

                        {/* Chart Area */}
                        {isChartVisible && (
                            <div className="my-4 animate-in fade-in slide-in-from-top-2">
                                <ExerciseChart exerciseId={exercise.id} />
                            </div>
                        )}

                        {/* Sets Header */}
                        <div className="grid grid-cols-[35px_1fr_1fr_0.7fr_1.8fr_55px] gap-2 mb-3 px-3 py-2 text-[9px] font-black text-gray-600 text-center uppercase tracking-[0.2em] bg-white/5 rounded-xl border border-white/5">
                            <span>#</span><span>Kg</span><span>Reps</span><span>RIR</span><span>Técnica</span><span>Ok</span>
                        </div>

                        {/* Sets List */}
                        <div className="space-y-3 mb-4">
                            {sets.map((set) => (
                                <div key={set.id} data-testid={`set-row-${set.id}`} className={clsx("relative flex items-center gap-2 rounded-2xl p-2 transition-all duration-300", set.completed ? "bg-gold-500/10 border border-gold-500/20" : "bg-white/5 border border-white/5 hover:border-white/10")}>
                                    <div className="w-[35px] text-center text-xs font-black text-gray-500 flex flex-col items-center justify-center">
                                        <span>{set.setNumber}</span>
                                        <button
                                            onClick={() => handleRemoveSet(index, set.id)}
                                            aria-label="Eliminar set"
                                            data-testid="workout-btn-remove-set"
                                            className="text-gray-500 hover:text-red-400 mt-2 p-1 transition-colors"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <div className="grid flex-1 grid-cols-[1fr_1fr_0.7fr_1.8fr] gap-2">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={set.weight || ''}
                                            onChange={(e) => handleSetChange(index, set.id, 'weight', e.target.value)}
                                            placeholder={set.prevWeight || "kg"}
                                            data-testid="workout-input-weight"
                                            className="h-11 w-full rounded-xl bg-black/10 border border-white/5 text-center text-base font-black text-white focus:border-gold-500/50 focus:outline-none px-0 placeholder-gray-500 transition-all"
                                        />
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={set.reps || ''}
                                            onChange={(e) => handleSetChange(index, set.id, 'reps', e.target.value)}
                                            placeholder={set.prevReps || "reps"}
                                            data-testid="workout-input-reps"
                                            className="h-12 w-full rounded-xl bg-black/10 border border-white/5 text-center text-base font-black text-white focus:border-gold-500/50 focus:outline-none px-0 placeholder-gray-500 transition-all"
                                        />
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={set.rpe || ''}
                                            onChange={(e) => handleSetChange(index, set.id, 'rpe', e.target.value)}
                                            placeholder="-"
                                            data-testid="workout-input-rpe"
                                            className="h-11 w-full rounded-xl bg-black/10 border border-white/5 text-center text-base font-black text-gold-500/60 focus:border-gold-500/50 focus:outline-none px-0 placeholder-gray-500 transition-all"
                                        />
                                        <input
                                            type="text"
                                            value={set.tempo || ''}
                                            onChange={(e) => handleSetChange(index, set.id, 'tempo', e.target.value)}
                                            placeholder="-"
                                            data-testid="workout-input-tempo"
                                            className="h-11 w-full rounded-xl bg-black/10 border border-white/5 text-center text-xs font-bold text-gray-500 focus:border-gold-500/50 focus:outline-none px-2 placeholder-gray-500 transition-all"
                                        />
                                    </div>
                                    <button
                                        onClick={() => toggleSetComplete(index, set.id)}
                                        aria-label="Completar set"
                                        data-testid="workout-btn-complete-set"
                                        className={clsx("flex h-11 w-[55px] shrink-0 items-center justify-center rounded-xl transition-all duration-300", set.completed ? "bg-gold-500 text-black shadow-lg shadow-gold-500/30" : "bg-white/5 text-gray-700 border border-white/5")}
                                    >
                                        <Check className={clsx("h-6 w-6 transition-transform duration-300", set.completed ? "scale-110 stroke-[3]" : "scale-100 stroke-[2]")} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => handleAddSet(index)}
                            data-testid="workout-btn-add-set"
                            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[10px] font-black text-gray-500 hover:text-gold-500 hover:bg-gold-500/5 border border-dashed border-white/10 hover:border-gold-500/30 transition-all active:scale-[0.98] uppercase tracking-[0.2em]"
                        >
                            <Plus className="h-4 w-4" /> Añadir Set
                        </button>
                    </div>
                );
            })}

            {/* BOTÓN PARA AÑADIR EJERCICIO AL BLOQUE (SUPERSET) */}
            <div className="p-6 border-t border-white/5 bg-black/10">
                <button
                    onClick={() => openExerciseModal(block.id)}
                    data-testid={`btn-add-exercise-to-block-${block.id}`}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[9px] font-black text-gold-500/60 hover:text-gold-500 hover:bg-gold-500/5 transition-all uppercase tracking-[0.2em]"
                >
                    <Plus className="h-3 w-3" />
                    Agrupar Ejercicio (Superserie)
                </button>
            </div>
        </div>
    )
})

export default WorkoutBlock