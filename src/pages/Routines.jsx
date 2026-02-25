import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoutines } from '../hooks/useRoutines';
import CreateRoutineModal from '../components/CreateRoutineModal';
import { ArrowLeft, Plus, Copy, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeText } from '../utils/text';

export default function Routines() {
    const { data: routines, isLoading, error } = useRoutines();
    const [showModal, setShowModal] = useState(false);
    const [duplicatingId, setDuplicatingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todas');
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // DEBUG: Ver qué está devolviendo useRoutines
    console.log('DEBUG routines:', routines, 'Type:', typeof routines, 'Is Array:', Array.isArray(routines));

    const CATEGORIES = ['Todas', 'Fuerza', 'Hipertrofia', 'Volumen', 'Definición', 'Resistencia', 'Movilidad', 'Cardio', 'Híbrido', 'Otro'];

    const openModal = () => setShowModal(true);
    const closeModal = () => setShowModal(false);

    const handleDuplicate = async (e, routine) => {
        e.stopPropagation();
        if (duplicatingId) return;

        setDuplicatingId(routine.id);
        try {
            const { data: newRoutineId, error } = await supabase.rpc('duplicate_routine', {
                p_routine_id: routine.id,
                p_new_name: `${routine.name} (Copia)`
            });

            if (error) throw error;

            // Invalidate to refresh list
            queryClient.invalidateQueries(['routines']);
        } catch (err) {
            console.error('Error duplicating routine:', err);
            alert('Error al duplicar la plantilla: ' + err.message);
        } finally {
            setDuplicatingId(null);
        }
    };

    const handleStart = (routineId) => {
        navigate(`/app/workout/new?auth=true&routineId=${routineId}`, { state: { routineId, authorized: true } });
    };

    // Filter routines locally - asegurar que routines siempre sea un array válido
    // Si routines no es un array, convertirlo a array vacío
    const routinesArray = Array.isArray(routines) ? routines : [];
    const filteredRoutines = routinesArray.filter(r => {
        const normalizedSearch = normalizeText(searchTerm)
        const matchesSearch = normalizeText(r.name).includes(normalizedSearch) ||
            normalizeText(r.description || '').includes(normalizedSearch);
        const matchesCategory = selectedCategory === 'Todas' || r.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (error) return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950 text-red-500">
            Error al cargar rutinas
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-950 font-sans text-gray-100 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 glass-panel border-t-0 border-x-0 rounded-b-[2rem] px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/app')}
                            className="rounded-xl p-2 text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-white uppercase">Mis Plantillas</h1>
                            <p className="text-[10px] font-bold text-gold-500/50 uppercase tracking-[0.2em]">Master Templates</p>
                        </div>
                    </div>
                    <button
                        onClick={openModal}
                        data-testid="routine-btn-create-new"
                        className="group flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500 text-black transition-all hover:bg-gold-400 active:scale-95 shadow-lg shadow-gold-500/10"
                        title="Crear Nueva Plantilla"
                    >
                        <Plus className="h-6 w-6" strokeWidth={2.5} />
                    </button>
                </div>
            </header>

            <main className="px-4 py-8 max-w-4xl mx-auto">
                {/* Search and Filter UI */}
                <div className="mb-10 space-y-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar plantillas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            data-testid="routine-input-search"
                            className="w-full rounded-2xl bg-white/5 border border-white/10 px-5 py-4 pl-12 text-white placeholder-gray-500 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-all backdrop-blur-sm"
                        />
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                data-testid={`routine-category-${cat.toLowerCase()}`}
                                className={`whitespace-nowrap rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all border ${selectedCategory === cat
                                    ? 'bg-gold-500 text-black border-gold-500 shadow-lg shadow-gold-500/20'
                                    : 'bg-white/5 text-gray-500 border-white/5 hover:border-white/10 hover:text-white'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gold-500 gap-4">
                        <Loader2 className="h-10 w-10 animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Actualizando catálogo...</p>
                    </div>
                ) : filteredRoutines && filteredRoutines.length > 0 ? (
                    <ul className="grid gap-5 sm:grid-cols-2">
                        {filteredRoutines.map((r) => (
                            <li
                                key={r.id}
                                data-testid={`routine-card-${r.name}`}
                                onClick={() => navigate(`/app/routines/${r.id}`)}
                                className="group relative overflow-hidden rounded-[2.5rem] glass-card cursor-pointer"
                            >
                                <div className="p-7">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                {r.category && (
                                                    <span className="rounded-lg bg-gold-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-gold-500 border border-gold-500/20">
                                                        {r.category}
                                                    </span>
                                                )}
                                                {r.tags?.map(tag => (
                                                    <span key={tag} className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">#{tag}</span>
                                                ))}
                                            </div>
                                            <h2 className="text-lg font-bold text-white group-hover:text-gold-400 transition-colors" data-testid={`routine-name-${r.name}`}>{r.name}</h2>
                                            <p className="mt-1 text-sm leading-relaxed text-gray-400 line-clamp-2 uppercase font-medium tracking-tighter opacity-60">{r.description || 'Sin descripción'}</p>
                                        </div>

                                        <button
                                            onClick={(e) => handleDuplicate(e, r)}
                                            disabled={duplicatingId === r.id}
                                            data-testid={`btn-duplicate-routine-${r.id}`}
                                            className="p-3 rounded-2xl text-gray-500 hover:text-gold-500 hover:bg-gold-500/10 transition-all border border-transparent hover:border-gold-500/20 z-10"
                                            title="Duplicar Plantilla"
                                        >
                                            {duplicatingId === r.id ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <Copy className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>

                                    <div className="mt-6 flex items-center justify-between border-t border-gray-800 pt-5">
                                        <div onClick={() => navigate(`/app/routines/${r.id}`)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 cursor-pointer hover:text-gray-300 transition-all">
                                            <span>Editar plantilla</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                        </div>

                                        <button
                                            data-testid="routine-btn-start"
                                            className="flex h-12 items-center gap-2 rounded-xl bg-gold-500/10 px-6 text-sm font-black uppercase tracking-wider text-gold-500 hover:bg-gold-500 hover:text-black active:scale-95 transition-all border border-gold-500/20"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStart(r.id);
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                            Iniciar
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="mt-12 flex flex-col items-center justify-center text-center p-12 rounded-[3rem] border border-dashed border-gray-800">
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-900 border border-gray-800 shadow-xl">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-widest">Sin Resultados</h3>
                        <p className="mt-3 max-w-xs text-sm text-gray-500 uppercase font-medium tracking-tight">No encontramos plantillas que coincidan con tus filtros.</p>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedCategory('Todas');
                            }}
                            className="mt-8 rounded-2xl border border-gray-700 px-8 py-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:border-gold-500 hover:text-white transition-all"
                        >
                            Limpiar Filtros
                        </button>
                    </div>
                )}
            </main>

            {showModal && <CreateRoutineModal onClose={closeModal} />}
        </div>
    );
}
