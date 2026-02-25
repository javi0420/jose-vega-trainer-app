import { Calendar, Clock, Dumbbell, Pencil, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState, useEffect } from 'react'

export default function SummaryHeader({ workoutName, date, durationSeconds, totalVolume, onSaveName }) {
    // Format duration (e.g., "1h 15m")
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    const durationString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(workoutName);

    // Sync if prop changes externally
    useEffect(() => {
        setTempName(workoutName);
    }, [workoutName]);

    const handleSave = () => {
        if (tempName.trim() !== '') {
            onSaveName(tempName);
        } else {
            setTempName(workoutName); // Revert if empty
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setTempName(workoutName);
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') handleCancel();
    };

    return (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 to-black p-6 shadow-2xl ring-1 ring-white/5">
            {/* Background Decor */}
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-500/10 blur-3xl" />

            <div className="relative z-10 text-center">
                <div className="mb-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gold-500">
                    <Calendar className="h-3 w-3" />
                    {date ? format(new Date(date), "d 'de' MMMM, yyyy", { locale: es }) : 'Fecha desconocida'}
                </div>

                {/* Editable Title Section */}
                <div className="mb-6 flex items-center justify-center gap-2 min-h-[40px]">
                    {isEditing ? (
                        <div className="flex items-center gap-2 w-full max-w-xs animate-in fade-in zoom-in-95">
                            <input
                                autoFocus
                                type="text"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={handleSave}
                                className="w-full border-b-2 border-gold-500 bg-transparent text-center text-3xl font-black italic text-white focus:outline-none px-2 py-1"
                            />
                            {/* Mobile helper buttons (since Enter/Esc are less obvious) */}
                            <button onMouseDown={handleSave} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-full"><Check className="h-5 w-5" /></button>
                        </div>
                    ) : (
                        <div className="group flex items-center gap-2">
                            <h1 className="text-3xl font-black italic text-white leading-tight">
                                {workoutName || "Entrenamiento"}
                            </h1>
                            {onSaveName && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="opacity-50 hover:opacity-100 group-hover:opacity-100 p-2 text-gray-400 hover:text-gold-500 hover:bg-white/5 rounded-full transition-all"
                                    aria-label="Editar nombre"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Time Stat */}
                    <div className="flex flex-col items-center justify-center rounded-2xl bg-gray-800/50 p-3 backdrop-blur-sm">
                        <Clock className="mb-1 h-5 w-5 text-gray-400" />
                        <span className="text-2xl font-bold text-white tracking-tighter">{durationString}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Duración</span>
                    </div>

                    {/* Volume Stat */}
                    <div className="flex flex-col items-center justify-center rounded-2xl bg-gray-800/50 p-3 backdrop-blur-sm">
                        <Dumbbell className="mb-1 h-5 w-5 text-gold-500" />
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-white tracking-tighter">{(totalVolume / 1000).toFixed(1)}</span>
                            <span className="text-xs font-medium text-gray-400">ton</span>
                        </div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Volumen Total</span>
                    </div>
                </div>

                {/* PR Badge (Mock Logic for now, can be real later) */}
                {totalVolume > 5000 && (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-4 py-1.5 text-xs font-bold text-gold-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                        {/* <Trophy className="h-3 w-3" /> */}
                        <span>¡Excelente Trabajo!</span>
                    </div>
                )}
            </div>
        </div>
    )
}
