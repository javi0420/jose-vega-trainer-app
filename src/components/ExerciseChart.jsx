import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line } from 'recharts';
import { format } from 'date-fns';
import { getBestSet } from '../utils/workoutUtils';

export default function ExerciseChart({ exerciseId, userId }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        setLoading(true);
        setData([]);
        setErrorMsg("");

        async function fetchData() {
            if (!exerciseId) {
                setLoading(false);
                return;
            }

            let targetUserId = userId;

            if (!targetUserId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }
                targetUserId = user.id;
            }

            // 1. FETCH RAW DATA (Replaces RPC to ensure consistency with Progress.jsx)
            // We fetch the last 50 workouts for this exercise
            const { data: blocks, error } = await supabase
                .from('block_exercises')
                .select(`
                    id,
                    sets (weight, reps, completed),
                    workout_blocks!inner (
                        workouts!inner (
                            id,
                            user_id,
                            name,
                            date,
                            created_at
                        )
                    )
                `)
                .eq('exercise_id', exerciseId)
                .eq('workout_blocks.workouts.user_id', targetUserId)
                .order('created_at', { ascending: false }) // Use creation date as proxy for chronological order
                .limit(50); // Limit locally to 50 sessions for performance

            if (error) {
                console.error("Error gráfica:", error);
                setErrorMsg("Error cargando historial: " + error.message);
                setLoading(false);
                return;
            }



            if (blocks && blocks.length > 0) {
                // Group by Workout ID to handle duplicates (multiple blocks per workout)
                const groupedByWorkout = {};

                blocks.forEach(block => {
                    const workout = block.workout_blocks?.workouts;
                    if (!workout) return;

                    // Filter only COMPLETED sets for the graph
                    const validSets = block.sets?.filter(s => s.completed && s.weight > 0) || [];

                    // Use shared logic to find the Best Set
                    const bestSet = getBestSet(validSets);

                    if (!bestSet) return; // No valid set in this block

                    const wId = workout.id;
                    const wDate = workout.date || workout.created_at;

                    // If we already have this workout (from another block), keep the best one
                    if (groupedByWorkout[wId]) {
                        const currentBest = { weight: groupedByWorkout[wId].weight, reps: groupedByWorkout[wId].reps };
                        const challenger = { weight: bestSet.weight, reps: bestSet.reps };
                        const winner = getBestSet([currentBest, challenger]);

                        groupedByWorkout[wId].weight = Number(winner.weight);
                        groupedByWorkout[wId].reps = Number(winner.reps);
                    } else {
                        groupedByWorkout[wId] = {
                            workout_date: wDate,
                            weight: Number(bestSet.weight),
                            reps: Number(bestSet.reps)
                        };
                    }
                });

                // Convert to array and sort by date ascending for the chart
                const chartData = Object.values(groupedByWorkout)
                    .sort((a, b) => new Date(a.workout_date) - new Date(b.workout_date))
                    .map(item => {
                        let displayDate = item.workout_date;
                        try {
                            if (item.workout_date) {
                                displayDate = format(new Date(item.workout_date), 'dd/MM');
                            }
                        } catch (e) { /* ignore */ }

                        const w = Number(item.weight);
                        const r = Number(item.reps);
                        const estimated1RM = w * (1 + r / 30);

                        return {
                            dateStr: item.workout_date,
                            createdAtStr: item.workout_date,
                            displayDate: displayDate,
                            weight: w,
                            reps: r,
                            estimated1RM: parseFloat(estimated1RM.toFixed(1))
                        };
                    });

                setData(chartData);
            }
            setLoading(false);
        }

        fetchData();
    }, [exerciseId, userId]);

    if (loading) return <div className="text-[10px] font-black text-gold-500 p-4 animate-pulse uppercase tracking-[0.2em]">Cargando evolución...</div>;
    if (errorMsg) return <div className="text-[10px] text-red-400 p-2 border border-red-900 rounded bg-red-900/10">⚠️ {errorMsg}</div>;

    if (data.length === 0) return (
        <div className="p-4 text-center bg-black/20 rounded-2xl border border-white/5">
            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">Sin registros previos</p>
        </div>
    );

    const maxWeightRecord = Math.max(...data.map(d => d.weight));
    const showOnlyReps = maxWeightRecord === 0;

    // Single record view
    if (data.length === 1) return (
        <div className="p-4 text-center bg-white/[0.03] backdrop-blur-xl rounded-[1.5rem] border border-white/5 flex flex-col items-center justify-center gap-1 shadow-xl">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gold-500/60 mb-1">
                Registro más reciente
            </span>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl text-white font-black">{data[0].weight}</span>
                <span className="text-xs text-gold-500 font-bold uppercase">kg</span>
            </div>
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">{data[0].displayDate}</span>
        </div>
    );

    return (
        <div className="h-48 w-full bg-white/[0.02] backdrop-blur-xl rounded-[2rem] p-3 mb-4 border border-white/5 mt-2 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis
                        dataKey="createdAtStr"
                        stroke="#4B5563"
                        tick={{ fill: '#4B5563', fontSize: 9, fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                        tickFormatter={(str) => {
                            try {
                                return format(new Date(str), 'dd/MM');
                            } catch (e) { return ''; }
                        }}
                    />
                    <YAxis
                        yAxisId="left"
                        stroke="#D4AF37"
                        orientation="left"
                        hide={showOnlyReps}
                        tick={{ fontSize: 9, fontWeight: 'bold' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#000000e0',
                            border: '1px solid #ffffff10',
                            borderRadius: '12px',
                            backdropFilter: 'blur(10px)',
                            padding: '8px'
                        }}
                        labelStyle={{ display: 'none' }}
                        itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                        formatter={(value, name, props) => {
                            const { weight, reps } = props.payload;
                            if (name === 'estimated1RM') return [`${weight} kg x ${reps} reps`, 'LOGRO'];
                            return null;
                        }}
                    />
                    {!showOnlyReps && (
                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="estimated1RM"
                            name="estimated1RM"
                            stroke="#D4AF37"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorWeight)"
                            activeDot={{ r: 5, strokeWidth: 0, fill: '#D4AF37' }}
                        />
                    )}
                </AreaChart>
            </ResponsiveContainer>

        </div>
    );
}
