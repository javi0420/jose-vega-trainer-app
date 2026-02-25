
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import SummaryHeader from '../summary/SummaryHeader'
import { supabase } from '../../lib/supabase'

export default function WorkoutHeader({
    workoutId,
    workoutName,
    date,
    durationSeconds,
    totalVolume,
    isTrainer,
    onDeleteClick,
    onNameUpdate
}) {
    const navigate = useNavigate()

    const handleSaveName = async (newName) => {
        try {
            const { error } = await supabase
                .from('workouts')
                .update({ name: newName })
                .eq('id', workoutId)

            if (error) throw error
            if (onNameUpdate) onNameUpdate()
        } catch (err) {
            console.error("Error updating name:", err)
            alert("Error al actualizar el nombre")
        }
    }

    return (
        <>
            {/* Nav Bar (Transparent/Minimal) */}
            <nav className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    {!isTrainer && (
                        <button
                            onClick={onDeleteClick}
                            className="rounded-full bg-red-950/30 p-2 text-red-500 hover:bg-red-950/50 backdrop-blur-md ring-1 ring-red-500/20 transition-all"
                            title="Eliminar entrenamiento"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/app')}
                        aria-label="Volver al inicio"
                        className="rounded-full bg-gray-900/50 p-2 text-white hover:bg-gray-800 backdrop-blur-md ring-1 ring-white/10 transition-all"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <div className="px-4 -mt-2 space-y-6">
                {/* Stats Header */}
                <SummaryHeader
                    workoutName={workoutName}
                    date={date}
                    durationSeconds={durationSeconds}
                    totalVolume={totalVolume}
                    onSaveName={handleSaveName}
                />
            </div>
        </>
    )
}
