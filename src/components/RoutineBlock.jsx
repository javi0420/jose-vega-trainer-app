import { Plus, Minus, Trash2, ClipboardList, Info, ArrowUp, ArrowDown } from 'lucide-react'
import { clsx } from 'clsx'

export default function RoutineBlock({ block, blockIndex, isFirst, isLast, updateBlock, onMoveBlock, onAddExerciseToBlock, onRemoveExercise }) {
    // exercises array
    const exercises = block.exercises || [];

    const handleExerciseChange = (exerciseIndex, field, value) => {
        // Normalize comma to dot for decimal separator (iOS Spanish keyboard fix)
        const normalizedValue = (field === 'default_rpe' && typeof value === 'string')
            ? value.replace(',', '.')
            : value;
        const updatedExercises = [...exercises];
        updatedExercises[exerciseIndex] = {
            ...updatedExercises[exerciseIndex],
            [field]: normalizedValue
        };
        updateBlock(block.id, { ...block, exercises: updatedExercises });
    };

    const adjustValue = (index, field, delta, min = 0, isFloat = false) => {
        const currentValue = parseFloat(exercises[index][field]) || 0;
        const newValue = isFloat
            ? Math.max(min, Math.round((currentValue + delta) * 10) / 10)
            : Math.max(min, currentValue + delta);
        handleExerciseChange(index, field, newValue);
    };

    if (!exercises || exercises.length === 0) {
        return <div className="p-4 bg-gray-900 border border-red-900/50 rounded mb-4 text-red-500 font-bold uppercase text-[10px] tracking-widest">Bloque vacío (Error de datos)</div>
    }

    return (
        <div className="rounded-[2.5rem] glass-card shadow-2xl mb-6 overflow-hidden" data-testid="routine-block-item">
            {/* Header for Superset */}
            {exercises.length > 1 && (
                <div className="bg-gold-500/10 px-6 py-3 border-b border-gold-500/10 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gold-500 animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                    <span className="text-[10px] font-black text-gold-500 tracking-[0.2em] uppercase italic">Superset Agrupado</span>
                </div>
            )}

            {exercises.map((exercise, index) => {
                return (
                    <div key={exercise.internalId || (exercise.id + '-' + index)} className={clsx("p-7", index < exercises.length - 1 && "border-b border-white/5")}>
                        {/* Header del Ejercicio */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                {exercises.length > 1 && (
                                    <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-gold-500/10 text-sm font-black text-gold-500 border border-gold-500/20">
                                        {String.fromCharCode(64 + (index + 1))}
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <h3 className="font-black text-xl text-white leading-tight tracking-tight uppercase">
                                        {exercise.name}
                                        {exercise.is_active === false && (
                                            <span className="ml-2 inline-block rounded bg-red-500/10 px-2 py-0.5 text-[9px] font-black text-red-500 border border-red-500/20 uppercase tracking-tighter">
                                                Archivado
                                            </span>
                                        )}
                                    </h3>
                                    <span className="inline-block mt-1 w-fit rounded-lg bg-white/5 px-2 py-0.5 text-[9px] font-black text-gray-500 uppercase tracking-[0.15em] border border-white/5">
                                        {exercise.muscle_group}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => onMoveBlock(-1)}
                                    disabled={isFirst}
                                    data-testid="btn-move-block-up"
                                    className="p-3 rounded-xl text-gray-500 hover:text-gold-500 hover:bg-gold-500/10 transition-all border border-white/5 active:scale-90 disabled:opacity-20 flex-shrink-0"
                                    title="Mover arriba"
                                >
                                    <ArrowUp className="w-5 h-5 stroke-[3]" />
                                </button>
                                <button
                                    onClick={() => onMoveBlock(1)}
                                    disabled={isLast}
                                    data-testid="btn-move-block-down"
                                    className="p-3 rounded-xl text-gray-500 hover:text-gold-500 hover:bg-gold-500/10 transition-all border border-white/5 active:scale-90 disabled:opacity-20 flex-shrink-0"
                                    title="Mover abajo"
                                >
                                    <ArrowDown className="w-5 h-5 stroke-[3]" />
                                </button>
                                <button
                                    onClick={() => onRemoveExercise(index)}
                                    className="p-3 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-white/5 ml-2 group active:scale-90 flex-shrink-0"
                                    title="Eliminar ejercicio"
                                >
                                    <Trash2 className="w-5 h-5 stroke-[3] group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                        </div>

                        {/* Configuration Inputs - Premium Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            {/* SERIES */}
                            <div className="bg-white/5 p-4 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                                <label
                                    htmlFor={`series-${block.id}-${index}`}
                                    className="block text-[10px] font-black text-gray-500 mb-3 uppercase tracking-widest"
                                >
                                    Series
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => adjustValue(index, 'default_sets', -1, 1)}
                                        aria-label="Disminuir series"
                                        className="h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-gray-500 hover:text-white hover:border-white/20 active:scale-95 transition-all shadow-lg"
                                    >
                                        <Minus className="h-5 w-5" />
                                    </button>
                                    <input
                                        id={`series-${block.id}-${index}`}
                                        type="number"
                                        value={exercise.default_sets || ''}
                                        onChange={(e) => handleExerciseChange(index, 'default_sets', parseInt(e.target.value) || 0)}
                                        className="flex-1 min-w-0 bg-transparent text-center font-black text-3xl text-white focus:outline-none"
                                    />
                                    <button
                                        onClick={() => adjustValue(index, 'default_sets', 1)}
                                        aria-label="Aumentar series"
                                        className="h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-gray-500 hover:text-gold-500 hover:border-gold-500/30 active:scale-95 transition-all shadow-lg"
                                    >
                                        <Plus className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* REPS */}
                            <div className="bg-white/5 p-4 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                                <label
                                    htmlFor={`reps-${block.id}-${index}`}
                                    className="block text-[10px] font-black text-gray-500 mb-3 uppercase tracking-widest"
                                >
                                    Reps / Tiempo
                                </label>
                                <input
                                    id={`reps-${block.id}-${index}`}
                                    type="text"
                                    value={exercise.default_reps || ''}
                                    onChange={(e) => handleExerciseChange(index, 'default_reps', e.target.value)}
                                    placeholder="8-12"
                                    className="w-full h-10 bg-transparent text-center font-black text-xl text-white placeholder-gray-700 focus:outline-none"
                                />
                            </div>

                            {/* RPE */}
                            <div className="bg-white/5 p-4 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                                <label
                                    htmlFor={`rpe-${block.id}-${index}`}
                                    className="block text-[10px] font-black text-gray-500 mb-3 uppercase tracking-widest"
                                >
                                    RPE (Intensidad)
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => adjustValue(index, 'default_rpe', -0.5, 0, true)}
                                        aria-label="Disminuir RPE"
                                        className="h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-gray-500 hover:text-white hover:border-white/20 active:scale-95 transition-all shadow-lg"
                                    >
                                        <Minus className="h-5 w-5" />
                                    </button>
                                    <input
                                        id={`rpe-${block.id}-${index}`}
                                        type="text"
                                        inputMode="decimal"
                                        step="0.5"
                                        value={exercise.default_rpe || ''}
                                        onChange={(e) => handleExerciseChange(index, 'default_rpe', e.target.value)}
                                        className="flex-1 min-w-0 bg-transparent text-center font-black text-3xl text-gold-500 focus:outline-none"
                                    />
                                    <button
                                        onClick={() => adjustValue(index, 'default_rpe', 0.5, 0, true)}
                                        aria-label="Aumentar RPE"
                                        className="h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-gray-500 hover:text-gold-500 hover:border-gold-500/30 active:scale-95 transition-all shadow-lg"
                                    >
                                        <Plus className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Notes - Refined Textarea */}
                        <div className="relative group">
                            <div className="absolute left-5 top-5 text-gray-600 group-focus-within:text-gold-500 transition-colors">
                                <Info className="h-4 w-4" />
                            </div>
                            <textarea
                                value={exercise.notes || ''}
                                onChange={(e) => handleExerciseChange(index, 'notes', e.target.value)}
                                placeholder="Instrucciones especiales..."
                                className="w-full rounded-[2rem] bg-black/20 border border-white/5 py-4 pl-12 pr-6 text-sm text-gray-300 placeholder-gray-700 focus:border-gold-500/30 focus:outline-none hover:border-white/10 transition-all resize-none h-24 leading-relaxed tracking-tight"
                            />
                        </div>
                    </div>
                );
            })}

            {/* Footer: Add to Superset */}
            <div className="p-6 border-t border-white/5 bg-black/10">
                <button
                    onClick={onAddExerciseToBlock}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[10px] font-black text-gray-500 hover:text-gold-500 hover:bg-gold-500/5 border border-dashed border-white/10 hover:border-gold-500/30 transition-all active:scale-[0.98] uppercase tracking-[0.2em]"
                >
                    <Plus className="h-4 w-4" />
                    Agrupar Ejercicio (Superserie)
                </button>
            </div>
        </div>
    )
}
