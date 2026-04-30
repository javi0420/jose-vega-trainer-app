import { useState } from 'react'
import { useExercises } from '../hooks/useExercises'
import { Plus, Search, Edit2, Trash2, X, Check, Dumbbell } from 'lucide-react'
import { normalizeText } from '../utils/text'
import { t } from '../utils/translations'
import ExerciseDetailsModal from './ExerciseDetailsModal'
import ConfirmModal from './ConfirmModal'

export default function ExerciseCatalog() {
    const [searchTerm, setSearchTerm] = useState('')
    const { exercises, isLoading, createExercise, updateExercise, deleteExercise, fetchNextPage, hasNextPage, isFetchingNextPage } = useExercises(searchTerm)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingExercise, setEditingExercise] = useState(null)
    const [viewingExercise, setViewingExercise] = useState(null)
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
    const [exerciseToDelete, setExerciseToDelete] = useState(null)
    const [form, setForm] = useState({ name: '', body_part: '' })

    // Client-side filtering removed in favor of Server-side

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editingExercise) {
                await updateExercise.mutateAsync({ 
                    id: editingExercise.id, 
                    ...form,
                    name_es: form.name // Keep in sync for search
                })
            } else {
                await createExercise.mutateAsync({
                    ...form,
                    name_es: form.name // Keep in sync for search
                })
            }
            closeModal()
        } catch (err) {
            console.error('DEBUG: handleSubmit error:', err)
            alert(err.message)
        }
    }

    const handleEdit = (ex) => {
        setEditingExercise(ex)
        setForm({ 
            name: ex.name_es || ex.name, 
            body_part: ex.body_part || ex.muscle_group || '' 
        })
        setIsModalOpen(true)
    }

    const handleDelete = (id) => {
        setExerciseToDelete(id)
        setIsConfirmDeleteOpen(true)
    }

    const confirmDelete = async () => {
        if (!exerciseToDelete) return
        try {
            await deleteExercise.mutateAsync(exerciseToDelete)
        } catch (err) {
            alert(err.message)
        } finally {
            setExerciseToDelete(null)
        }
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setEditingExercise(null)
        setForm({ name: '', body_part: '' })
    }

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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    <div className="col-span-full flex justify-center p-12">
                        <Dumbbell className="animate-spin text-gold-500 h-10 w-10 shrink-0" />
                    </div>
                ) : exercises?.length === 0 ? (
                    <div className="col-span-full text-center p-8 text-gray-500 font-medium">
                        No se encontraron ejercicios.
                    </div>
                ) : (
                    exercises?.map(ex => (
                        <div
                            key={ex.id}
                            onClick={() => setViewingExercise(ex)}
                            className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex justify-between items-center group hover:border-gray-700 transition-all gap-4 cursor-pointer"
                        >
                            <div className="flex gap-4 items-center overflow-hidden">
                                {ex.gif_url ? (
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg shrink-0 border border-gray-800/50 overflow-hidden bg-gold-500">
                                        <img
                                            src={ex.gif_url}
                                            alt={ex.name_es || ex.name}
                                            className="w-full h-full object-cover"
                                            style={{ mixBlendMode: 'multiply', filter: 'grayscale(100%) contrast(1.1)' }}
                                            loading="lazy"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-gray-800 shrink-0 flex items-center justify-center border border-gray-700/50">
                                        <Dumbbell className="text-gray-600" size={32} />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-white truncate" title={ex.name_es || ex.name}>{ex.name_es || ex.name}</h3>
                                    <p className="text-sm text-gray-400 capitalize truncate">
                                        {t(ex.target_muscle || ex.body_part || ex.muscle_group || 'General')}
                                    </p>
                                    {ex.equipment && (
                                        <p className="text-xs text-gray-500 capitalize truncate">
                                            Eq: {t(ex.equipment.replace(/_/g, ' '))}
                                        </p>
                                    )}
                                    {ex.created_by && (
                                        <span className="text-[10px] bg-gold-500/10 text-gold-500 px-1.5 py-0.5 rounded border border-gold-500/20 mt-1 inline-block font-bold">
                                            Personalizado
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(ex); }}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
                                    title="Editar"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(ex.id); }}
                                    data-testid={`delete-exercise-${ex.id}`}
                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                    title="Eliminar"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-[2rem] border border-gray-800 bg-gray-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-gold-500/10">
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
                                    value={form.body_part}
                                    onChange={(e) => setForm({ ...form, body_part: e.target.value })}
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="pecho">Pecho</option>
                                    <option value="espalda">Espalda</option>
                                    <option value="piernas">Piernas</option>
                                    <option value="hombros">Hombros</option>
                                    <option value="bíceps">Bíceps</option>
                                    <option value="tríceps">Tríceps</option>
                                    <option value="antebrazos">Antebrazos</option>
                                    <option value="abdominales">Abdominales</option>
                                    <option value="gemelos">Gemelos</option>
                                    <option value="cardio">Cardio</option>
                                    <option value="cuello">Cuello</option>
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

            <ExerciseDetailsModal
                exercise={viewingExercise}
                onClose={() => setViewingExercise(null)}
            />

            <ConfirmModal
                isOpen={isConfirmDeleteOpen}
                onClose={() => setIsConfirmDeleteOpen(false)}
                onConfirm={confirmDelete}
                title="¿Eliminar ejercicio?"
                message="Esta acción no se puede deshacer y el ejercicio desaparecerá de tu catálogo."
                confirmText="Eliminar"
                isDestructive={true}
            />
        </div>
    )
}
