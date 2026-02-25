import { useState } from 'react'
import { CheckCircle2, TrendingUp, Award, ChevronDown, ChevronUp, Circle } from 'lucide-react'

export default function ExerciseSummaryCard({ exercise, sets }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const validSets = sets.filter(s => s.completed && s.weight > 0 && s.reps > 0);
    const totalSets = sets?.length || 0;
    const totalReps = validSets.reduce((acc, s) => acc + (parseInt(s.reps) || 0), 0);
    const hasValidSets = validSets.length > 0;

    // Find best set (Max Weight, then Max Reps)
    const bestSetIndex = validSets.reduce((bestIdx, current, currentIdx, arr) => {
        if (bestIdx === -1) return currentIdx;
        const best = arr[bestIdx];
        if (parseFloat(current.weight) > parseFloat(best.weight)) return currentIdx;
        if (parseFloat(current.weight) === parseFloat(best.weight) && parseInt(current.reps) > parseInt(best.reps)) return currentIdx;
        return bestIdx;
    }, -1);

    const bestSet = bestSetIndex !== -1 ? validSets[bestSetIndex] : null;

    // Calculate 1RM (Epley Formula) for the best set
    // 1RM = Weight * (1 + Reps/30)
    const estimated1RM = bestSet
        ? Math.round(parseFloat(bestSet.weight) * (1 + parseInt(bestSet.reps) / 30))
        : 0;

    // FIX: Mostrar TODOS los ejercicios, incluso sin sets válidos
    // OLD: if (validSets.length === 0) return null;

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/40 transition-all hover:bg-gray-900 hover:border-gray-700">
            {/* Header */}
            <div className="p-4 pb-3">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className="font-bold text-gray-200 leading-tight">{exercise.name}</h3>
                        <p className="text-xs text-gray-500 capitalize">{exercise.muscle_group}</p>
                    </div>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                        {hasValidSets ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                            <Circle className="h-3.5 w-3.5 text-gray-600" />
                        )}
                    </div>
                </div>

                {!hasValidSets ? (
                    /* Ejercicio sin datos válidos */
                    <div className="text-sm text-gray-500 italic p-3 bg-gray-950/50 rounded-lg border border-gray-800/50" data-testid="exercise-no-valid-sets">
                        {totalSets > 0
                            ? `${totalSets} serie${totalSets > 1 ? 's' : ''} sin completar`
                            : 'Sin series registradas'
                        }
                    </div>
                ) : (
                    /* Ejercicio con datos válidos */
                    <>
                        {/* Summary Stats (Always Visible) */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-lg bg-gray-950/50 p-2 border border-gray-800/50">
                                <span className="block text-[10px] text-gray-500 font-bold uppercase">Mejor Set</span>
                                <span className="block font-mono font-bold text-white" data-testid="summary-best-set-value">
                                    {bestSet ? `${bestSet.weight}kg × ${bestSet.reps}` : '-'}
                                </span>
                            </div>
                            <div className="rounded-lg bg-gray-950/50 p-2 border border-gray-800/50">
                                <span className="block text-[10px] text-gray-500 font-bold uppercase">Volumen Total</span>
                                <span className="block font-mono font-bold text-gray-300">
                                    {validSets.reduce((acc, s) => acc + (parseFloat(s.weight) * parseFloat(s.reps)), 0).toLocaleString('es-ES')} <span className="text-[10px] text-gray-500">kg</span>
                                </span>
                            </div>
                        </div>

                        {/* 1RM Estimate */}
                        {estimated1RM > 0 && (
                            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-gold-500 font-bold uppercase tracking-tighter">
                                <TrendingUp className="h-3 w-3" />
                                Est. 1RM: {estimated1RM}kg
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Metrics List (Sets) - Solo si hay sets válidos */}
            {hasValidSets && (
                <div className={`px-4 pb-4 space-y-1.5 ${validSets.length > 1 ? 'pt-2' : 'pt-4 border-t border-gray-800/50 bg-gray-950/30'}`}>
                    {/* Expand/Collapse Button for Multiple Sets */}
                    {validSets.length > 1 && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="w-full mb-2 py-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gold-500 transition-colors"
                        >
                            {isExpanded ? (
                                <>
                                    <ChevronUp className="h-3.5 w-3.5" />
                                    Ocultar series
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="h-3.5 w-3.5" />
                                    Ver {validSets.length} series
                                </>
                            )}
                        </button>
                    )}

                    {/* Individual Sets List - Show all if single set OR if expanded */}
                    {(validSets.length === 1 || isExpanded) && validSets.map((set, idx) => {
                        const isBest = idx === bestSetIndex;
                        return (
                            <div
                                key={idx}
                                className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-all ${isBest
                                    ? 'bg-gold-500/10 border border-gold-500/20 shadow-sm shadow-gold-500/5'
                                    : 'bg-gray-950/40 border border-gray-800/50'
                                    }`}
                            >
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isBest ? 'text-gold-500' : 'text-gray-600'
                                    }`}>
                                    Set {validSets.length > 1 ? idx + 1 : 'Único'}
                                </span>
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col items-end">
                                        <span className={`font-mono font-bold ${isBest ? 'text-gold-400' : 'text-white'
                                            }`} data-testid="summary-set-value">
                                            {set.weight}kg × {set.reps}
                                        </span>
                                        {(set.rpe !== null || set.tempo) && (
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">
                                                {set.rpe !== null && `RIR: ${set.rpe}`}
                                                {set.rpe !== null && set.tempo && ' | '}
                                                {set.tempo && `Téc: ${set.tempo}`}
                                            </span>
                                        )}
                                    </div>
                                    {isBest && (
                                        <Award className="h-3.5 w-3.5 text-gold-500" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    )
}
