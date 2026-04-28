import React, { useState, useEffect } from 'react';
import { Hammer, Wrench, Clock, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Maintenance = ({ message }) => {
    const [trainerName, setTrainerName] = useState('IronTrack');

    useEffect(() => {
        async function fetchTrainerName() {
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('role', 'trainer')
                    .limit(1)
                    .single();
                
                if (data?.full_name) {
                    setTrainerName(data.full_name);
                }
            } catch (err) {
                console.error('Error fetching trainer name:', err);
            }
        }
        fetchTrainerName();
    }, []);

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center overflow-hidden relative">
            {/* Background Decorative Elements */}
            <div className="absolute top-1/4 -left-20 w-64 h-64 bg-zinc-800/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-zinc-900/40 rounded-full blur-3xl" />
            
            <div className="max-w-md w-full glass-card p-8 md:p-12 space-y-8 relative z-10 border border-zinc-800/50">
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-zinc-400 blur-xl opacity-20 animate-pulse" />
                        <div className="bg-zinc-900 p-4 rounded-3xl border border-zinc-800 relative shadow-2xl">
                            <ShieldAlert size={48} className="text-zinc-200" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-zinc-800 p-2 rounded-full border border-zinc-700 shadow-lg">
                            <Wrench size={16} className="text-zinc-400 animate-spin-slow" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                        Modo Mantenimiento
                    </h1>
                    <p className="text-zinc-400 text-lg leading-relaxed">
                        {message || 'Estamos realizando algunas mejoras técnicas para ofrecerte la mejor experiencia.'}
                    </p>
                </div>

                <div className="pt-6 border-t border-zinc-800/50 flex flex-col items-center space-y-4">
                    <div className="flex items-center space-x-2 text-zinc-500 text-sm">
                        <Clock size={16} />
                        <span>Estimamos volver en unos minutos</span>
                    </div>
                    
                    <div className="flex space-x-3">
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-700 animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce" />
                    </div>
                </div>
            </div>

            <p className="mt-12 text-zinc-600 text-[10px] tracking-[0.3em] uppercase font-black opacity-50">
                {trainerName} &copy; 2026
            </p>
            
            <style>{`
                .glass-card {
                    background: rgba(24, 24, 27, 0.7);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default Maintenance;
