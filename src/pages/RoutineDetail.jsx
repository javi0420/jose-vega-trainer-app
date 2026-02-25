import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Search, Loader2, X, Dumbbell, Trash2, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useExercises } from '../hooks/useExercises';
import { generateUUID } from '../utils/uuid';
import RoutineBlock from '../components/RoutineBlock';
import { useQueryClient } from '@tanstack/react-query';

import { normalizeText } from '../utils/text';

export default function RoutineDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Modal State - Declarar searchTerm ANTES de usarlo en useExercises
    const [searchTerm, setSearchTerm] = useState('');

    // Fix: Destructure correct properties from the new useExercises hook
    // We pass searchTerm to the hook so server-side search works
    const { exercises, isLoading: isLoadingExercises, fetchNextPage, hasNextPage, isFetchingNextPage } = useExercises(searchTerm);
    const queryClient = useQueryClient();

    const [routine, setRoutine] = useState(null);
    const [blocks, setBlocks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Modal State (resto)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeBlockIdForSuperset, setActiveBlockIdForSuperset] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Edit State
    const [editedName, setEditedName] = useState('');
    const [editedDescription, setEditedDescription] = useState('');
    const [editedCategory, setEditedCategory] = useState('');
    const [editedTags, setEditedTags] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    const CATEGORIES = ['Fuerza', 'Hipertrofia', 'Resistencia', 'Movilidad', 'Cardio', 'Híbrido', 'Otro'];

    // Initial Load
    useEffect(() => {
        let ignore = false;
        const loadRoutine = async () => {
            try {
                // Check for local draft first
                const savedDraft = localStorage.getItem(`routine_draft_${id}`);
                if (savedDraft) {
                    try {
                        const parsed = JSON.parse(savedDraft);
                        if (window.confirm('Tienes cambios sin guardar en esta plantilla. ¿Deseas recuperarlos?')) {
                            setEditedName(parsed.name);
                            setEditedDescription(parsed.description);
                            setEditedCategory(parsed.category);
                            setEditedTags(parsed.tags);
                            setBlocks(parsed.blocks);
                            setIsLoading(false);
                            setRoutine({ id, user_id: parsed.userId }); // Minimal routine stub for owner check
                            return;
                        } else {
                            localStorage.removeItem(`routine_draft_${id}`);
                        }
                    } catch (e) {
                        console.error("Error loading routine draft:", e);
                    }
                }

                const { data, error } = await supabase
                    .from('routines')
                    .select(`
                        *,
                        routine_blocks (
                            id,
                            order_index,
                            routine_exercises (
                                id,
                                custom_exercise_name,
                                position,
                                notes,
                                default_sets,
                                default_reps,
                                default_rpe,
                                target_weight,
                                target_reps,
                                exercises (*)
                            )
                        )
                    `)
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (ignore) return;

                setRoutine(data);
                setEditedName(data.name);
                setEditedDescription(data.description || '');
                setEditedCategory(data.category || '');
                setEditedTags(data.tags ? data.tags.join(', ') : '');

                // Transform to simpler local state
                const sortedBlocks = (data.routine_blocks || [])
                    .sort((a, b) => a.order_index - b.order_index)
                    .map(block => ({
                        id: block.id,
                        exercises: (block.routine_exercises || [])
                            .sort((a, b) => a.position.localeCompare(b.position))
                            .map(re => ({
                                id: re.exercises?.id, // Exercise ID
                                name: re.custom_exercise_name || re.exercises?.name,
                                muscle_group: re.exercises?.muscle_group || 'General',
                                is_active: re.exercises?.is_active ?? true,

                                // Routine config
                                default_sets: re.default_sets || 3,
                                default_reps: re.default_reps || '8-12',
                                default_rpe: re.default_rpe || 8,
                                notes: re.notes || '',

                                // Internal ID for keys? Using index mainly
                                internalId: Math.random().toString(36)
                            }))
                    }));

                setBlocks(sortedBlocks);

            } catch (error) {
                console.error("Error loading routine:", error);
                alert("Error cargando la rutina");
                navigate('/app/routines');
            } finally {
                if (!ignore) setIsLoading(false);
            }
        };

        if (id && user) {
            loadRoutine();
        }
        return () => {
            ignore = true;
        };
    }, [id, user, navigate]);

    // Save Draft and beforeunload guard
    useEffect(() => {
        if (!isLoading && routine) {
            const draft = {
                name: editedName,
                description: editedDescription,
                category: editedCategory,
                tags: editedTags,
                blocks: blocks,
                userId: routine.user_id,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem(`routine_draft_${id}`, JSON.stringify(draft));
        }

        const handleBeforeUnload = (e) => {
            if (blocks.length > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [blocks, editedName, editedDescription, editedCategory, editedTags, id, isLoading, routine]);

    // HANDLERS

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. Update Routine Info (Name/Desc)
            const { error: updateError } = await supabase
                .from('routines')
                .update({
                    name: editedName,
                    description: editedDescription,
                    category: editedCategory,
                    tags: editedTags.split(',').map(t => t.trim()).filter(Boolean),
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (updateError) throw updateError;

            // 2. Replace structure
            // Delete all blocks (cascade deletes exercises)
            const { error: deleteError } = await supabase
                .from('routine_blocks')
                .delete()
                .eq('routine_id', id);

            if (deleteError) throw deleteError;

            // Insert new blocks
            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];

                const { data: blockData, error: blockError } = await supabase
                    .from('routine_blocks')
                    .insert({
                        routine_id: id,
                        order_index: i
                    })
                    .select()
                    .single();

                if (blockError) throw blockError;

                // Insert exercises
                const exerciseInserts = block.exercises.map((ex, idx) => ({
                    block_id: blockData.id,
                    exercise_id: ex.id,
                    custom_exercise_name: ex.id ? null : ex.name, // If no ID, it's custom/ad-hoc (though we usually pick from catalog)
                    position: String.fromCharCode(65 + idx), // A, B, C...
                    notes: ex.notes,
                    default_sets: ex.default_sets,
                    default_reps: ex.default_reps,
                    default_rpe: ex.default_rpe
                }));

                if (exerciseInserts.length > 0) {
                    const { error: exError } = await supabase
                        .from('routine_exercises')
                        .insert(exerciseInserts);

                    if (exError) throw exError;
                }
            }

            // Success - Invalidate cache before navigating
            queryClient.invalidateQueries(['routines']);
            queryClient.invalidateQueries(['routine_preview']);

            if (user?.id === routine?.user_id) {
                localStorage.removeItem(`routine_draft_${id}`);
                navigate('/app/routines');
            } else {
                localStorage.removeItem(`routine_draft_${id}`);
                navigate('/app', { state: { selectedClientId: routine.user_id } });
            }

        } catch (error) {
            console.error("CRITICAL: Error in handleSave:", error);
            console.error("Error stack:", error.stack);
            alert("Error al guardar la rutina: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleteModalOpen(false);

        setIsSaving(true);
        try {
            const { error } = await supabase.from('routines').delete().eq('id', id);
            if (error) throw error;

            if (user?.id === routine?.user_id) {
                navigate('/app/routines');
            } else {
                navigate('/app', { state: { selectedClientId: routine.user_id } });
            }
        } catch (err) {
            console.error(err);
            alert('Error al eliminar: ' + err.message);
            setIsSaving(false);
        }
    };

    const handleAddExercise = (exercise) => {
        if (activeBlockIdForSuperset) {
            // Add to existing block
            setBlocks(prev => prev.map(b => {
                if (b.id === activeBlockIdForSuperset) {
                    return {
                        ...b,
                        exercises: [...b.exercises, {
                            id: exercise.id,
                            name: exercise.name,
                            muscle_group: exercise.muscle_group,
                            default_sets: 3,
                            default_reps: '8-12',
                            default_rpe: 8,
                            notes: '',
                            internalId: generateUUID()
                        }]
                    };
                }
                return b;
            }));
        } else {
            // New Block
            const newBlock = {
                id: generateUUID(), // Temporary ID
                exercises: [{
                    id: exercise.id,
                    name: exercise.name,
                    muscle_group: exercise.muscle_group,
                    default_sets: 3,
                    default_reps: '8-12',
                    default_rpe: 8,
                    notes: '',
                    internalId: generateUUID()
                }]
            };
            setBlocks(prev => [...prev, newBlock]);
        }
        setIsModalOpen(false);
        setSearchTerm('');
        setActiveBlockIdForSuperset(null);
    };

    const updateBlock = (blockId, updatedBlock) => {
        setBlocks(prev => prev.map(b => b.id === blockId ? updatedBlock : b));
    };

    const moveBlock = (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= blocks.length) return;

        setBlocks(prev => {
            const newBlocks = [...prev];
            const temp = newBlocks[index];
            newBlocks[index] = newBlocks[newIndex];
            newBlocks[newIndex] = temp;
            return newBlocks;
        });
    };

    const handleRemoveExercise = (blockId, exerciseIndex) => {
        setBlocks(prev => {
            const blockIndex = prev.findIndex(b => b.id === blockId);
            if (blockIndex === -1) return prev;

            const block = prev[blockIndex];
            if (block.exercises.length <= 1) {
                // Remove block entirely
                return prev.filter(b => b.id !== blockId);
            }

            // Remove exercise from set
            const newExercises = block.exercises.filter((_, idx) => idx !== exerciseIndex);
            const updatedBlock = { ...block, exercises: newExercises };

            const newBlocks = [...prev];
            newBlocks[blockIndex] = updatedBlock;
            return newBlocks;
        });
    };

    const openExerciseModal = (blockId = null) => {
        setActiveBlockIdForSuperset(blockId);
        setIsModalOpen(true);
    };

    // Removed client-side filtering logic as it's now handled by the hook/server
    // const filteredExercises = exercises?.filter(...)

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
            <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-800 bg-gray-950/95 px-3 py-3 backdrop-blur-xl">
                <div className="flex flex-1 items-center gap-2 min-w-0">
                    <button onClick={() => navigate('/app/routines')} className="flex-shrink-0 rounded-xl p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-all">
                        <ArrowLeft className="h-6 w-6" />
                    </button>

                    <div className="flex-1 min-w-0">
                        {isEditingTitle ? (
                            <div
                                className="flex flex-col gap-1.5 pr-2"
                                onBlur={(e) => {
                                    // Only close if the new focus target is OUTSIDE this container
                                    if (!e.currentTarget.contains(e.relatedTarget)) {
                                        setIsEditingTitle(false);
                                    }
                                }}
                            >
                                <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    className="bg-gray-800 text-white font-bold text-lg px-2 py-1 rounded border border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500 w-full"
                                    autoFocus
                                    data-testid="routine-name-input"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            setIsEditingTitle(false);
                                        }
                                    }}
                                />
                                <div className="flex flex-col gap-1">
                                    <input
                                        type="text"
                                        value={editedDescription}
                                        onChange={(e) => setEditedDescription(e.target.value)}
                                        placeholder="Descripción corta..."
                                        className="bg-gray-800 text-gray-400 text-[10px] px-2 py-1 rounded border border-gray-700 focus:outline-none w-full"
                                    />
                                    <select
                                        value={editedCategory}
                                        onChange={(e) => setEditedCategory(e.target.value)}
                                        className="bg-gray-800 text-[10px] text-gold-500 font-bold px-2 py-1 rounded border border-gray-700 focus:outline-none w-full"
                                    >
                                        <option value="">Sin Categoría</option>
                                        {CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="group cursor-pointer rounded-lg hover:bg-gray-800/30 px-1 -ml-1 transition-colors min-w-0"
                                data-testid="routine-name-edit"
                                onClick={() => setIsEditingTitle(true)}
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <h1 data-testid="routine-title-header" className="text-sm sm:text-lg font-bold tracking-tight text-white truncate">{editedName || routine?.name}</h1>
                                    <Pencil className="h-3 w-3 text-gray-600 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                                </div>
                                <p className="text-[10px] text-gray-500 truncate mt-0.5">
                                    {editedDescription || routine?.description || 'Sin descripción'}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
                            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                <span className="h-1.5 w-1.5 rounded-full bg-gold-500 animate-pulse shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{blocks.length} Bloques</p>
                            </div>

                            {user?.id === routine?.user_id ? (
                                <span className="inline-flex items-center rounded-lg bg-gold-500/10 px-2 py-0.5 text-[9px] font-black text-gold-500 border border-gold-500/20 uppercase tracking-tighter">
                                    Plantilla Maestra
                                </span>
                            ) : (
                                <span className="inline-flex items-center rounded-lg bg-blue-500/10 px-2 py-0.5 text-[9px] font-black text-blue-400 border border-blue-500/20 uppercase tracking-tighter">
                                    Rutina Asignada
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        disabled={isSaving}
                        className="p-2 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent active:scale-95"
                        title="Eliminar"
                        data-testid="btn-delete-routine"
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        data-testid="routine-btn-save"
                        className="flex h-12 items-center gap-1.5 rounded-xl bg-gold-500 px-4 text-[10px] font-black text-black hover:bg-gold-400 active:scale-90 disabled:opacity-50 transition-all shadow-lg shadow-gold-500/20 uppercase"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        <span className="hidden sm:inline text-xs">Guardar</span>
                        <span className="sm:hidden text-xs">OK</span>
                    </button>
                </div>
            </header>

            <main className="p-4 flex-1">
                {blocks.length === 0 ? (
                    <div className="mt-8 flex flex-col items-center justify-center text-center text-gray-500">
                        <div className="mb-4 rounded-full bg-gray-900 p-4 ring-1 ring-gray-800">
                            <Dumbbell className="h-8 w-8 opacity-50" />
                        </div>
                        <p>Esta rutina está vacía.</p>
                        <button
                            onClick={() => openExerciseModal(null)}
                            data-testid="routine-btn-add-exercise"
                            className="mt-6 flex h-14 items-center gap-2 rounded-2xl bg-gold-500/10 border border-gold-500/30 px-8 text-gold-500 font-black tracking-widest uppercase text-xs shadow-lg shadow-gold-500/5 hover:bg-gold-500/20 transition-all active:scale-95"
                        >
                            <Plus className="h-5 w-5" />
                            <span>Añadir Primer Ejercicio</span>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {blocks.map((block, index) => (
                            <RoutineBlock
                                key={block.id}
                                block={block}
                                blockIndex={index}
                                isFirst={index === 0}
                                isLast={index === blocks.length - 1}
                                updateBlock={(id, data) => updateBlock(id, data)}
                                onMoveBlock={(dir) => moveBlock(index, dir)}
                                onAddExerciseToBlock={() => openExerciseModal(block.id)}
                                onRemoveExercise={(exIndex) => handleRemoveExercise(block.id, exIndex)}
                            />
                        ))}

                        <button
                            onClick={() => openExerciseModal(null)}
                            data-testid="routine-btn-add-exercise"
                            className="group mt-8 flex w-full h-20 items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-gray-800 bg-gray-900/50 text-gray-500 hover:border-gold-500/50 hover:text-gold-500 hover:bg-gold-500/5 transition-all active:scale-[0.98]"
                        >
                            <Plus className="h-6 w-6" />
                            <span className="text-xl font-black tracking-[0.1em] uppercase">Añadir Ejercicio</span>
                        </button>
                    </div>
                )}
            </main>

            {/* Exercise Selector Modal (Copied from WorkoutEditor - consider refactoring) */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950 sm:inset-x-0 sm:bottom-0 sm:top-auto sm:h-[80vh] sm:rounded-t-2xl sm:border-t sm:border-gray-800">
                        <div className="flex items-center justify-between border-b border-gray-800 p-4">
                            <h2 className="text-lg font-bold text-white">Añadir a Rutina</h2>
                            <button onClick={() => setIsModalOpen(false)} className="rounded-full p-2 text-gray-400 hover:bg-gray-800">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 group-focus-within:text-gold-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Buscar ejercicio..."
                                    className="w-full rounded-2xl border border-gray-800 bg-gray-950 py-4 pl-12 pr-4 text-sm text-white placeholder-gray-600 focus:border-gold-500/50 focus:ring-4 focus:ring-gold-500/5 transition-all outline-none"
                                    autoFocus
                                    data-testid="routine-exercise-search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {isLoadingExercises ? (
                                <div className="px-4 py-8 text-center text-gray-500">Cargando catálogo...</div>
                            ) : exercises?.length > 0 ? (
                                <>
                                    <ul className="space-y-1">
                                        {exercises.map(ex => (
                                            <li key={ex.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddExercise(ex)}
                                                    data-testid={`exercise-select-btn-${ex.id}`}
                                                    data-exercise-name={ex.name}
                                                    className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left hover:bg-gray-900 active:bg-gray-800"
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-200">{ex.name}</p>
                                                        {ex.muscle_group && (
                                                            <span className="inline-block rounded bg-gray-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                                                                {ex.muscle_group}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <Plus className="h-5 w-5 text-gray-600" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                    {/* Infinite Scroll / Load More */}
                                    {hasNextPage && (
                                        <div className="pt-4 flex justify-center pb-8">
                                            <button
                                                onClick={() => fetchNextPage()}
                                                disabled={isFetchingNextPage}
                                                className="px-4 py-2 text-sm text-gold-500 hover:text-gold-400 disabled:opacity-50"
                                            >
                                                {isFetchingNextPage ? 'Cargando más...' : 'Cargar más ejercicios'}
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="px-4 py-8 text-center text-gray-500">
                                    <p>No se encontraron ejercicios.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
            {/* Deletion Summary Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in">
                    <div className="w-full max-w-sm rounded-[2.5rem] bg-gray-900 border border-white/10 p-8 shadow-2xl animate-in zoom-in-95">
                        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 mx-auto">
                            <Trash2 className="h-8 w-8" />
                        </div>

                        <h3 className="text-xl font-black text-white text-center uppercase tracking-tight mb-2">Eliminar Plantilla</h3>
                        <p className="text-xs text-center text-gray-500 font-bold uppercase tracking-widest mb-8">Esta acción no se puede deshacer</p>

                        <div className="space-y-4 mb-8 bg-white/5 rounded-2xl p-6 border border-white/5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nombre</span>
                                <span className="text-xs font-bold text-white truncate max-w-[150px]">{editedName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Contenido</span>
                                <span className="text-xs font-bold text-white">{blocks.length} Bloques</span>
                            </div>
                            <div className="pt-2 border-t border-white/5">
                                <p className="text-[9px] text-gray-500 leading-relaxed font-bold italic">
                                    Nota: Los clientes que ya tienen esta rutina asignada no se verán afectados.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleDelete}
                                className="w-full rounded-2xl bg-red-600 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                            >
                                Confirmar Borrado
                            </button>
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="w-full rounded-2xl bg-gray-800 py-4 text-sm font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
