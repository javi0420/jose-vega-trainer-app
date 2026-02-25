import React, { useState } from 'react';
import { useCreateRoutine } from '../hooks/useCreateRoutine';

export default function CreateRoutineModal({ onClose }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [tags, setTags] = useState('');
    const { mutateAsync: createRoutine, isLoading, error } = useCreateRoutine();

    const CATEGORIES = ['Fuerza', 'Hipertrofia', 'Volumen', 'Definición', 'Resistencia', 'Movilidad', 'Cardio', 'Híbrido', 'Otro'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createRoutine({
                name,
                description,
                category,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean)
            });
            onClose();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div data-testid="create-routine-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-200">
                <h2 className="text-xl font-bold text-white mb-2">Nueva Plantilla</h2>
                <p className="text-sm text-gray-400 mb-6">Crea una plantilla para acceder rápidamente a tus entrenamientos frecuentes.</p>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 mb-6">
                        <div>
                            <label htmlFor="routine-name" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Nombre</label>
                            <input
                                id="routine-name"
                                className="w-full rounded-lg bg-gray-800 border border-gray-700 h-12 px-4 text-white text-base placeholder-gray-500 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej. Día de Pierna (Hipertrofia)"
                                required
                                autoFocus
                            />
                        </div>
                        <div>
                            <label htmlFor="routine-description" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Descripción <span className="text-gray-600 normal-case tracking-normal">(Opcional)</span></label>
                            <textarea
                                id="routine-description"
                                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-white text-base placeholder-gray-500 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors resize-none h-24"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ej. Enfocado en cuádriceps y gemelos..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="routine-category" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Categoría</label>
                                <select
                                    id="routine-category"
                                    className="w-full rounded-lg bg-gray-800 border border-gray-700 h-12 px-4 text-white text-base focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors appearance-none cursor-pointer"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    <option value="">Seleccionar...</option>
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="routine-tags" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Etiquetas</label>
                                <input
                                    id="routine-tags"
                                    className="w-full rounded-lg bg-gray-800 border border-gray-700 h-12 px-4 text-white text-base placeholder-gray-500 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    placeholder="Ej. pierna, intenso"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 rounded-lg bg-red-900/20 border border-red-900/50 p-3 text-sm text-red-200">
                            Error al crear la rutina. Inténtalo de nuevo.
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            className="flex-1 rounded-xl bg-gray-800 h-12 text-sm font-bold text-gray-300 hover:bg-gray-700 hover:text-white transition-all"
                            onClick={onClose}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 rounded-xl bg-gold-500 h-12 text-sm font-bold text-black hover:bg-gold-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-gold-500/20"
                        >
                            {isLoading ? 'Guardando...' : 'Crear Plantilla'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
