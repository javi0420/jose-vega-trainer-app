import { clsx } from 'clsx'

export default function MuscleHeatmap({ exercises }) {
    // Extract unique muscle groups
    const muscleCounts = {};

    exercises.forEach(ex => {
        const muscle = ex.muscle_group || 'General';
        muscleCounts[muscle] = (muscleCounts[muscle] || 0) + 1;
    });

    const sortedMuscles = Object.entries(muscleCounts)
        .sort(([, a], [, b]) => b - a); // Most frequent first

    if (sortedMuscles.length === 0) return null;

    return (
        <div className="mt-4">
            <h4 className="mb-3 text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
                Enfoque Muscular
            </h4>
            <div className="flex flex-wrap gap-2">
                {sortedMuscles.map(([muscle, count]) => (
                    <div
                        key={muscle}
                        className={clsx(
                            "rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors",
                            count > 2
                                ? "bg-gold-500 text-black shadow-lg shadow-gold-500/20"
                                : "bg-gray-800 text-gray-400 border border-gray-700"
                        )}
                    >
                        {muscle} <span className="opacity-60 text-[10px] ml-1">x{count}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
