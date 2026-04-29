import { X } from 'lucide-react'
import { t } from '../utils/translations'

export default function ExerciseDetailsModal({ exercise, onClose }) {
    if (!exercise) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-[2.5rem] border border-gray-800 bg-gray-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-gold-500/10">

                {/* Header / Hero GIF */}
                <div className="relative w-full h-64 bg-gold-500 flex items-center justify-center rounded-t-xl overflow-hidden shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-colors shadow-lg"
                    >
                        <X size={20} />
                    </button>
                    {exercise.gif_url ? (
                        <img
                            src={exercise.gif_url}
                            alt={exercise.name_es || exercise.name}
                            className="max-w-full max-h-full object-scale-down"
                            style={{ mixBlendMode: 'multiply', filter: 'grayscale(100%) contrast(1.1)' }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                            Sin imagen disponible
                        </div>
                    )}
                </div>

                {/* Content Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <h2 className="text-2xl font-bold text-white mb-4 uppercase tracking-wide">
                        {exercise.name_es || exercise.name}
                    </h2>

                    <div className="flex flex-wrap gap-2 mb-6">
                        {(exercise.body_part || exercise.muscle_group) && (
                            <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-gray-700">
                                {t(exercise.body_part || exercise.muscle_group)}
                            </span>
                        )}
                        {exercise.target_muscle && (
                            <span className="px-3 py-1 bg-gold-500/10 text-gold-500 rounded-full text-xs font-bold uppercase tracking-wider border border-gold-500/20">
                                {t(exercise.target_muscle)}
                            </span>
                        )}
                        {exercise.equipment && (
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-semibold uppercase tracking-wider border border-blue-500/20">
                                {t(exercise.equipment.replace(/_/g, ' '))}
                            </span>
                        )}
                    </div>

                    {( (exercise.instructions && exercise.instructions.length > 0) || (exercise.instructions_es && exercise.instructions_es.length > 0) ) && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-2 mb-3">
                                Instrucciones
                            </h3>
                            <ol className="list-decimal list-outside ml-4 space-y-3 text-gray-300 text-sm leading-relaxed">
                                {(exercise.instructions_es && exercise.instructions_es.length > 0 
                                    ? exercise.instructions_es 
                                    : (exercise.instructions || [])
                                ).map((step, idx) => (
                                    <li key={idx} className="pl-2 marker:text-gold-500 marker:font-bold">
                                        {step}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
