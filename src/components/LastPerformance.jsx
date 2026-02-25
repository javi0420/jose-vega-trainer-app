import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function LastPerformance({ exerciseId }) {
    const [lastStats, setLastStats] = useState(null);

    useEffect(() => {
        let ignore = false;

        async function fetchPR() {
            if (!exerciseId) return;

            // Use the optimized RPC for instant result
            const { data, error } = await supabase
                .rpc('get_exercise_pr', { p_exercise_id: exerciseId });

            if (!ignore) {
                if (data && data.length > 0) {
                    setLastStats(data[0]);
                } else {
                    setLastStats(null);
                }
            }
        }

        fetchPR();
        return () => { ignore = true; };
    }, [exerciseId]);

    if (!lastStats) return null;

    return (
        <div className="text-xs text-yellow-400 mt-1 mb-2 font-medium flex items-center gap-2">
            <span>🏆 Récord Personal:</span>
            <span className="text-gray-900 bg-yellow-400 px-2 py-0.5 rounded font-bold">
                {lastStats.weight}kg x {lastStats.reps}
            </span>
        </div>
    );
}