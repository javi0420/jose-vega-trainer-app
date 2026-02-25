import { useState } from 'react'
import { X, Search, Plus, RefreshCw } from 'lucide-react'
import { useExercises } from '../hooks/useExercises'
import { generateUUID } from '../utils/uuid'

export default function ReplaceExerciseModal({ isOpen, onClose, onReplace, activeBlockId, exerciseIndex }) {
    const [searchTerm, setSearchTerm] = useState('')
    const { exercises, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useExercises(searchTerm)

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-gray-950 sm:inset-x-0 sm:bottom-0 sm:top-auto sm:h-[80vh] sm:rounded-t-[2.5rem] sm:border-t sm:border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 p-6 bg-gray-900/50 backdrop-blur-xl rounded-t-[2.5rem]">
                <div className="flex flex-col">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-gold-500" />
                        Reemplazar Ejercicio
                    </h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                        Se conservarán tus series y peso actual
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="rounded-full p-2 text-gray-400 hover:bg-white/5 transition-colors"
                >
                    <X className="h-6 w-6" />
                </button>
            </div>

            {/* Search Bar */}
            <div className="p-6 border-b border-white/5 bg-gray-900/30">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 group-focus-within:text-gold-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar nuevo ejercicio..."
                        className="h-14 w-full rounded-2xl border border-white/5 bg-black/40 pl-12 pr-4 text-white text-lg placeholder-gray-600 focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/50 transition-all font-bold"
                        autoFocus
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                        <div className="h-8 w-8 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
                        <span className="text-xs font-black uppercase tracking-widest">Cargando catálogo...</span>
                    </div>
                ) : exercises?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {exercises.map(ex => (
                            <button
                                key={ex.id}
                                type="button"
                                data-testid={`replace-exercise-item-${ex.id}`}
                                onClick={() => onReplace(activeBlockId, exerciseIndex, ex)}
                                className="group flex items-center gap-4 rounded-2xl p-4 text-left bg-white/5 border border-white/5 hover:bg-gold-500/10 hover:border-gold-500/30 transition-all active:scale-[0.98]"
                            >
                                <div className="flex-1">
                                    <p className="font-black text-white group-hover:text-gold-500 transition-colors uppercase italic tracking-tight">{ex.name}</p>
                                    {ex.muscle_group && (
                                        <span className="inline-block mt-1 rounded-lg bg-black/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-gray-500 border border-white/5 group-hover:border-gold-500/20">
                                            {ex.muscle_group}
                                        </span>
                                    )}
                                </div>
                                <RefreshCw className="h-5 w-5 text-gray-700 group-hover:text-gold-500 transition-all" />
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center text-gray-500">
                        <p className="mb-6 font-bold">No se encontraron resultados para "{searchTerm}"</p>
                        {searchTerm && (
                            <button
                                onClick={() => {
                                    onReplace(activeBlockId, exerciseIndex, {
                                        id: generateUUID(),
                                        name: searchTerm,
                                        muscle_group: 'General',
                                        isAdHoc: true
                                    })
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl bg-gold-500 px-6 py-3 text-sm font-black text-black hover:bg-gold-400 active:scale-95 transition-all shadow-xl shadow-gold-500/20 uppercase tracking-widest"
                            >
                                <Plus className="h-4 w-4" />
                                Usar "{searchTerm}"
                            </button>
                        )}
                    </div>
                )}

                {/* Pagination */}
                {hasNextPage && (
                    <div className="py-6 flex justify-center">
                        <button
                            onClick={() => fetchNextPage()}
                            disabled={isFetchingNextPage}
                            className="px-8 py-3 rounded-xl bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-all"
                        >
                            {isFetchingNextPage ? 'Cargando más...' : 'Ver más ejercicios'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
