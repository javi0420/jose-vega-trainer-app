import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function LastNote({ exerciseId }) {
    const [note, setNote] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        async function fetchLastNote() {
            if (!exerciseId) return;
            setIsLoading(true);

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase.rpc('get_last_exercise_session', {
                    p_exercise_id: exerciseId,
                    p_user_id: user.id
                });

                if (error) throw error;

                if (data && data.length > 0) {
                    // All sets in the session share the same per-exercise note in this RPC
                    setNote(data[0].note);
                }
            } catch (err) {
                console.error("Error fetching last note:", err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchLastNote();
    }, [exerciseId]);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 mb-3 text-[10px] text-gray-500 font-bold uppercase tracking-widest px-1 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Cargando nota anterior...</span>
            </div>
        );
    }

    if (!note || !note.trim()) return null;

    return (
        <div className="animate-in slide-in-from-top-2 fade-in duration-500 mb-4 overflow-hidden rounded-r-lg border-l-4 border-yellow-500 bg-yellow-500/10 p-3 shadow-lg shadow-yellow-500/5">
            <div className="flex items-start gap-3">
                <div className="p-1 rounded-full bg-yellow-500/20 text-yellow-500 shrink-0">
                    <AlertCircle className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest leading-none mb-1.5">Nota de Sesión Anterior</span>
                    <p className="text-sm font-medium italic text-yellow-100/90 leading-relaxed">
                        "{note}"
                    </p>
                </div>
            </div>
        </div>
    );
}
