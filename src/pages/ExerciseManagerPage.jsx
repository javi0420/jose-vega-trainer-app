import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ExerciseCatalog from '../components/ExerciseCatalog'

export default function ExerciseManagerPage() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-gray-950 px-4 py-6 pb-28 text-gray-100 font-sans selection:bg-gold-500/30">
            <header className="mb-6 flex items-center gap-4">
                <button
                    onClick={() => navigate('/app')}
                    className="rounded-full p-2 text-gray-400 hover:bg-gray-800 transition-colors"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-white">Gestión de Ejercicios</h1>
                    <p className="text-xs text-gray-500">Administra el catálogo global</p>
                </div>
            </header>

            <main className="max-w-7xl mx-auto">
                <ExerciseCatalog />
            </main>
        </div>
    )
}
