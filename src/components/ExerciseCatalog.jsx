import { useState } from 'react'
import { useExercises } from '../hooks/useExercises'
import { Plus, Search, Edit2, Trash2, X, Check, Dumbbell } from 'lucide-react'
import { normalizeText } from '../utils/text'

export default function ExerciseCatalog() {
    const [searchTerm, setSearchTerm] = useState('')
    const { exercises, isLoading, createExercise, updateExercise, deleteExercise, fetchNextPage, hasNextPage, isFetchingNextPage } = useExercises(searchTerm)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingExercise, setEditingExercise] = useState(null)
    const [form, setForm] = useState({ name: '', muscle_group: '' })

    // Client-side filtering removed in favor of Server-side

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editingExercise) {
                await updateExercise.mutateAsync({ id: editingExercise.id, ...form })
                setSearchTerm(form.name) // Search for it to show it
            } else {
                await createExercise.mutateAsync(form)
                setSearchTerm(form.name) // Search for it to show it
            }
            closeModal()
        } catch (err) {
            alert(err.message)
        }
    }

    const handleEdit = (ex) => {
        setEditingExercise(ex)
        setForm({ name: ex.name, muscle_group: ex.muscle_group || '' })
        setIsModalOpen(true)
    }

    const handleDelete = async (id) => {
        if (window.confirm('¿Seguro que quieres eliminar este ejercicio?')) {
            try {
                await deleteExercise.mutateAsync(id)
            } catch (err) {
                alert(err.message)
            }
        }
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setEditingExercise(null)
        setForm({ name: '', muscle_group: '' })
    }

    if (isLoading) return <div className="flex justify-center p-8"><Dumbbell className="animate-spin text-gold-500" /></div>

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Dumbbell className="text-gold-500" />
                    Catálogo de Ejercicios
                </h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex h-12 items-center gap-2 bg-gold-500 hover:bg-gold-400 text-black px-6 rounded-lg transition-colors font-bold shadow-lg shadow-gold-500/10"
                >
                    <Plus size={20} />
                    Nuevo Ejercicio
                </button>
            </div>

            {/* Buscador */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                    type="text"
                    placeholder="Buscar ejercicio o grupo muscular..."
                    data-testid="exercise-search-input"
                    className="w-full bg-gray-900 border border-gray-800 text-white pl-10 pr-4 h-12 rounded-xl focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500/50 outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Lista */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exercises?.map(ex => (
                    <div key={ex.id} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex justify-between items-center group hover:border-gray-700 transition-all">
                        <div>
                            <h3 className="font-semibold text-white">{ex.name}</h3>
                            <p className="text-sm text-gray-400 capitalize">{ex.muscle_group || 'General'}</p>
                            {ex.created_by && (
                                <span className="text-[10px] bg-gold-500/10 text-gold-500 px-1.5 py-0.5 rounded border border-gold-500/20 mt-1 inline-block font-bold">
                                    Personalizado
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEdit(ex)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
                                title="Editar"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button
                                onClick={() => handleDelete(ex.id)}
                                data-testid={`delete-exercise-${ex.id}`}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                title="Eliminar"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
                <div className="flex justify-center py-4">
                    <button
                        data-testid="load-more-btn"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="px-6 py-2 bg-gray-800 text-gold-500 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors font-medium border border-gray-700"
                    >
                        {isFetchingNextPage ? 'Cargando más...' : 'Ver más ejercicios'}
                    </button>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">
                                {editingExercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nombre</label>
                                <input
                                    required
                                    type="text"
                                    data-testid="exercise-name-input"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg h-12 px-4 text-white text-base focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500/50 outline-none"
                                    placeholder="Ej: Press de Banca"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Grupo Muscular</label>
                                <select
                                    data-testid="exercise-muscle-group-select"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg h-12 px-4 text-white text-base focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500/50 outline-none"
                                    value={form.muscle_group}
                                    onChange={(e) => setForm({ ...form, muscle_group: e.target.value })}
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="pecho">Pecho</option>
                                    <option value="espalda">Espalda</option>
                                    <option value="piernas">Piernas</option>
                                    <option value="hombros">Hombros</option>
                                    <option value="Bíceps">Bíceps</option>
                                    <option value="Tríceps">Tríceps</option>
                                    <option value="core">Core</option>
                                    <option value="cardio">Cardio</option>
                                </select>
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 h-12 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    data-testid="exercise-submit-btn"
                                    className="flex-1 bg-gold-500 hover:bg-gold-400 text-black h-12 rounded-lg transition-colors font-bold flex items-center justify-center gap-2 shadow-lg shadow-gold-500/20"
                                >
                                    <Check size={20} />
                                    {editingExercise ? 'Guardar Cambios' : 'Crear Ejercicio'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
