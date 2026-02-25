import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Loader2, ArrowLeft } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import { getBestSet } from '../utils/workoutUtils';

export default function Progress() {
    const navigate = useNavigate();
    const [exercises, setExercises] = useState([]);
    const [selectedExercise, setSelectedExercise] = useState('');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // 1. Cargar lista de ejercicios
    useEffect(() => {
        async function fetchExercises() {
            const { data } = await supabase
                .from('exercises')
                .select('id, name')
                .eq('is_active', true)
                .order('name');
            if (data) setExercises(data);
        }
        fetchExercises();
    }, []);

    // 2. Cargar datos
    useEffect(() => {
        async function fetchData() {
            if (!selectedExercise) return;
            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: blocks, error } = await supabase
                .from('block_exercises')
                .select(`
                  id,
                  sets (weight, reps),
                  workout_blocks!inner (
                    workouts!inner (
                      id,
                      user_id,
                      date,
                      created_at
                    )
                  )
                `)
                .eq('exercise_id', selectedExercise)
                .eq('workout_blocks.workouts.user_id', user.id)
                .order('id', { ascending: false })
                .limit(100);

            if (error) {
                console.error("Error cargando progreso:", error);
                setLoading(false);
                return;
            }



            // Agrupar por Workout ID para manejar sesiones
            const groupedByWorkout = {};

            blocks.forEach(block => {
                const workout = block.workout_blocks?.workouts;
                if (!workout || !workout.id) return;

                const workoutId = workout.id;

                // Usamos la nueva utilidad para encontrar el MEJOR SET REAL
                // Esto evita el "Frankenstein Data" (mezclar peso de un set con reps de otro)
                const bestSet = getBestSet(block.sets);

                if (!bestSet) return;

                const blockMaxWeight = Number(bestSet.weight);
                const associéReps = Number(bestSet.reps);

                if (blockMaxWeight === 0 && associéReps === 0) return;

                // Si ya existe registro de este workout (por si hubiera múltiples bloques del mismo ejercicio),
                // nos quedamos con el mejor de los bloques.
                if (groupedByWorkout[workoutId]) {
                    const currentBest = { weight: groupedByWorkout[workoutId].weight, reps: groupedByWorkout[workoutId].reps };
                    const challenger = { weight: blockMaxWeight, reps: associéReps };

                    // Comparamos el "campeón actual" vs el "nuevo candidato"
                    const winner = getBestSet([currentBest, challenger]);

                    groupedByWorkout[workoutId].weight = Number(winner.weight);
                    groupedByWorkout[workoutId].reps = Number(winner.reps);
                } else {
                    groupedByWorkout[workoutId] = {
                        date: workout.date,
                        created_at: workout.created_at,
                        weight: blockMaxWeight,
                        reps: associéReps
                    };
                }
            });

            // Transformar y Ordenar
            const chartData = Object.values(groupedByWorkout)
                .map(item => {
                    let displayDate = item.date;
                    try {
                        const dateObj = new Date(item.date);
                        if (!isNaN(dateObj.getTime())) {
                            displayDate = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
                        }
                    } catch (e) { /* ignore */ }

                    const w = Number(item.weight || 0);
                    const r = Number(item.reps || 0);
                    const estimated1RM = w * (1 + r / 30);

                    return {
                        dateStr: item.date,
                        createdAtStr: item.created_at,
                        displayDate: displayDate,
                        weight: w,
                        reps: r,
                        estimated1RM: parseFloat(estimated1RM.toFixed(1))
                    };
                })
                .sort((a, b) => {
                    const d1 = new Date(a.dateStr).getTime();
                    const d2 = new Date(b.dateStr).getTime();
                    if (d1 !== d2) return d1 - d2;
                    return new Date(a.createdAtStr).getTime() - new Date(b.createdAtStr).getTime();
                });

            setData(chartData);
            setLoading(false);
        }

        fetchData();
    }, [selectedExercise]);

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 pb-20">
            <header className="bg-gray-950/50 backdrop-blur-xl border-b border-white/5 p-4 sticky top-0 z-30 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                >
                    <ArrowLeft className="h-6 w-6 text-gray-400" />
                </button>
                <h1 className="text-xl font-black text-white uppercase tracking-tight">Evolución y Progreso</h1>
            </header>

            <main className="p-4 max-w-5xl mx-auto space-y-6">
                <section className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                        Selecciona un ejercicio
                    </label>
                    <SearchableSelect
                        options={exercises}
                        value={selectedExercise}
                        onChange={setSelectedExercise}
                        placeholder="Buscar ejercicio para graficar..."
                    />
                </section>

                {/* Tarjeta de Gráfica */}
                <div className="bg-gray-900 border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden transition-all">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <div className="flex flex-col gap-1">
                            <h2 className="font-black text-white uppercase tracking-widest text-xs">Análisis de Rendimiento</h2>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Peso máximo registrado por sesión</p>
                        </div>
                        {data.length > 0 && (
                            <div className="bg-gold-500/10 text-gold-500 px-3 py-1.5 rounded-full border border-gold-500/20 text-[10px] font-black uppercase tracking-tighter">
                                {data.length} Sesiones registradas
                            </div>
                        )}
                    </div>

                    <div className="h-[400px] w-full p-4 relative">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-gold-500 animate-pulse gap-3">
                                <Loader2 className="h-10 w-10 animate-spin" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Procesando base de datos...</span>
                            </div>
                        ) : data.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis
                                        dataKey="createdAtStr"
                                        stroke="#4B5563"
                                        tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 700 }}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={15}
                                        tickFormatter={(value) => {
                                            if (!value) return '';
                                            const d = new Date(value);
                                            return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
                                        }}
                                    />
                                    {/* Eje Y Izquierdo (Peso) */}
                                    <YAxis
                                        yAxisId="left"
                                        stroke="#D4AF37"
                                        tick={{ fill: '#D4AF37', fontSize: 10, fontWeight: 900 }}
                                        tickLine={false}
                                        axisLine={false}
                                        unit="kg"
                                    />
                                    <Tooltip
                                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                                        contentStyle={{
                                            backgroundColor: 'rgba(10, 10, 10, 0.95)',
                                            borderColor: 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: '20px',
                                            backdropFilter: 'blur(20px)',
                                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                                            padding: '12px 16px'
                                        }}
                                        itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                        labelStyle={{ color: '#6B7280', marginBottom: '8px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                        formatter={(value, name, props) => {
                                            const { weight, reps } = props.payload;
                                            if (name === 'estimated1RM') return [`${weight} kg x ${reps} reps`, 'Rendimiento'];
                                            return null;
                                        }}
                                        labelFormatter={(label) => {
                                            if (!label) return '';
                                            const d = new Date(label);
                                            return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                        }}
                                    />
                                    {/* Línea de Peso (Oro) */}
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="estimated1RM"
                                        name="estimated1RM"
                                        stroke="#D4AF37"
                                        strokeWidth={4}
                                        dot={{ r: 4, fill: '#000000', strokeWidth: 2, stroke: '#D4AF37' }}
                                        activeDot={{ r: 8, fill: '#D4AF37', stroke: '#fff', strokeWidth: 2 }}
                                        animationDuration={1500}
                                        connectNulls
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-700">
                                <div className="p-8 rounded-full bg-white/[0.02] border border-white/5 mb-4">
                                    <span className="text-6xl text-gray-800">📈</span>
                                </div>
                                <p className="text-sm font-black uppercase tracking-widest text-gray-500">Sin datos seleccionados</p>
                                <p className="text-[10px] text-gray-600 mt-2 uppercase tracking-widest">Elige un ejercicio de la lista superior</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
