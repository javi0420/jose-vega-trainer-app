import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { X, Search, Loader2, List, PlusCircle, CheckCircle2, Plus, ChevronRight, Settings, Dumbbell, FileText, MessageSquare } from 'lucide-react'
import { useRoutines } from '../hooks/useRoutines'
import { useClientRoutinesV2 } from '../hooks/useClientRoutines'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function AssignRoutineModal({ client, onClose }) {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { user } = useAuth() // Usar contexto en lugar de getUser()
    const { data: templates, isLoading: isLoadingTemplates } = useRoutines()
    const {
        routines: clientRoutines,
        assignRoutineFromTemplate,
        createEmptyRoutine
    } = useClientRoutinesV2(client?.id)


    const [searchTerm, setSearchTerm] = useState('')
    const [selectedTemplateId, setSelectedTemplateId] = useState(null)

    const [assignmentNotes, setAssignmentNotes] = useState('')
    const [isAssigning, setIsAssigning] = useState(false)

    // Fetch already assigned routines (v3.5)
    const { data: assignedRoutineIds } = useQuery({
        queryKey: ['assigned_routines_check', client?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('assigned_routines')
                .select('routine_id')
                .eq('client_id', client?.id)

            if (error) throw error
            return new Set(data?.map(r => r.routine_id))
        },
        enabled: !!client?.id
    })

    const { data: previewData, isLoading: isLoadingPreview } = useQuery({
        queryKey: ['routine_preview', selectedTemplateId],
        queryFn: async () => {
            if (!selectedTemplateId) return null
            const { data, error } = await supabase
                .from('routine_blocks')
                .select(`
                    id,
                    order_index,
                    routine_exercises (
                        id,
                        exercise_id,
                        custom_exercise_name,
                        default_sets,
                        default_reps,
                        exercises (id, name)
                    )
                `)
                .eq('routine_id', selectedTemplateId)
                .order('order_index')

            if (error) throw error
            return data
        },
        enabled: !!selectedTemplateId
    })

    const filteredTemplates = templates?.filter(t => {
        const term = searchTerm.toLowerCase()
        return (
            t.name.toLowerCase().includes(term) ||
            t.category?.toLowerCase().includes(term) ||
            t.tags?.some(tag => tag.toLowerCase().includes(term))
        )
    })

    const handleAssign = async (templateId) => {
        if (!client?.id) {
            alert('No se pudo identificar al cliente')
            return
        }

        setIsAssigning(true)
        try {
            // Usar user del contexto en lugar de getUser() para evitar 403
            if (!user) throw new Error('No autenticado')

            // Insert into assigned_routines table
            const { data: assignment, error } = await supabase
                .from('assigned_routines')
                .insert({
                    routine_id: templateId,
                    client_id: client.id,
                    assigned_by: user.id,
                    assignment_notes: assignmentNotes.trim() || null
                })
                .select()
                .single()

            if (error) throw error

            alert('✅ Rutina asignada exitosamente al cliente')
            queryClient.invalidateQueries(['assigned_routines_check', client?.id])
            queryClient.invalidateQueries(['routines', client?.id]) // Refresh routines list
            setAssignmentNotes('') // Reset notes
            setSelectedTemplateId(null) // Clear selection
            onClose()
        } catch (err) {
            console.error('Error al asignar:', err)
            alert('Error al asignar: ' + err.message)
        } finally {
            setIsAssigning(false)
        }
    }

    const handleCreateNew = async () => {
        const name = window.prompt('Nombre de la nueva rutina:', 'Nueva Rutina')
        if (name === null) return // Cancelled

        try {
            const newRoutine = await createEmptyRoutine.mutateAsync({ name })
            console.log('Created routine:', newRoutine.id)

            // Auto-assign the new routine to the client so it appears in their list
            const { data: userData } = await supabase.auth.getUser()
            if (userData.user && client?.id) {
                console.log('Auto-assigning routine to client:', client.id)
                const { data: assignData, error: assignError } = await supabase
                    .from('assigned_routines')
                    .insert({
                        routine_id: newRoutine.id,
                        client_id: client.id,
                        assigned_by: userData.user.id
                    })
                    .select()

                if (assignError) {
                    console.error('Error auto-assigning created routine:', assignError)
                    alert(`⚠️ Rutina creada pero no se pudo asignar automáticamente: ${assignError.message}`)
                } else {
                    console.log('Successfully auto-assigned routine:', assignData)
                }
            } else {
                console.warn('Skipping auto-assignment: user or client missing')
            }

            if (window.confirm('Rutina creada con éxito. ¿Ir a la edición?')) {
                navigate(`/app/routines/${newRoutine.id}`)
            }
        } catch (err) {
            console.error('Error creating routine:', err)
            alert('Error al crear: ' + err.message)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/90 backdrop-blur-md p-4 animate-in fade-in duration-300" data-testid="assign-routine-modal">
            <div className="w-full max-w-lg rounded-[2.5rem] border border-gray-800 bg-gray-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative shadow-gold-500/5">

                {/* Decorative background glow */}
                <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gold-500/10 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-gold-500/5 blur-3xl" />

                {/* Header */}
                <div className="relative flex items-center justify-between border-b border-gray-800 p-6 bg-gray-900/50 backdrop-blur-sm">
                    <div>
                        <h2 className="text-2xl font-black text-white leading-tight tracking-tight" data-testid="assign-modal-title">Asignar Rutina</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-gold-500 animate-pulse" />
                            <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">
                                Cliente: <span className="text-white">{client?.full_name}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="group rounded-full p-2.5 text-gray-500 hover:bg-gray-800 hover:text-white transition-all active:scale-90"
                    >
                        <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                    {/* Section: Action Bar - Create New */}
                    <section>
                        <button
                            onClick={handleCreateNew}
                            disabled={createEmptyRoutine.isPending}
                            className="w-full flex items-center justify-center gap-3 p-5 rounded-[1.5rem] bg-gold-500 text-black font-black uppercase tracking-widest text-xs hover:bg-gold-400 active:scale-[0.98] transition-all shadow-lg shadow-gold-500/20 disabled:opacity-50"
                        >
                            {createEmptyRoutine.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin text-black" />
                            ) : (
                                <Plus className="h-5 w-5" />
                            )}
                            Crear desde cero
                        </button>
                    </section>

                    {/* Section: Client Current Routines */}
                    <section>
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Rutinas Asignadas</h3>
                            <span className="text-[10px] font-bold text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded-full border border-gold-500/20">
                                {clientRoutines?.length || 0} TOTAL
                            </span>
                        </div>
                        <div className="space-y-3">
                            {clientRoutines?.length > 0 ? (
                                clientRoutines.map(r => (
                                    <div key={r.id} data-testid={`routine-card-${r.name}`} className="group relative flex items-center gap-4 p-4 rounded-[1.5rem] bg-gray-800/30 border border-gray-700/30 transition-all">
                                        <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-gold-500/10 text-gold-500">
                                            <List className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-white uppercase tracking-tight truncate">{r.name}</h4>
                                            <p className="text-[10px] text-gray-500 font-medium font-mono uppercase">Asignada el {new Date(r.assigned_at || r.created_at).toLocaleDateString()}</p>

                                            {r.client_feedback && (
                                                <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                    <div className="flex items-start gap-2">
                                                        <MessageSquare className="h-3 w-3 text-emerald-500 mt-0.5" />
                                                        <p
                                                            className="text-[10px] text-emerald-400 leading-tight italic"
                                                            data-testid={`client-feedback-${r.id}`}
                                                        >
                                                            {r.client_feedback}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {r.is_assigned && (
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (!window.confirm('¿Seguro que quieres desasignar esta rutina?')) return;

                                                        try {
                                                            const { error } = await supabase
                                                                .from('assigned_routines')
                                                                .delete()
                                                                .eq('id', r.assignment_id);

                                                            if (error) throw error;

                                                            // Invalidate queries to refresh list
                                                            queryClient.invalidateQueries(['routines', client?.id]);
                                                            queryClient.invalidateQueries(['assigned_routines_check', client?.id]);
                                                        } catch (err) {
                                                            console.error(err);
                                                            alert('Error al desasignar');
                                                        }
                                                    }}
                                                    className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-[10px] font-black text-red-500 uppercase tracking-widest border border-transparent hover:border-red-500/50 hover:bg-red-500/20 transition-all active:scale-95"
                                                    title="Desasignar Rutina"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            )}

                                            {/* Action: Manage Routine */}
                                            <button
                                                onClick={() => navigate(`/app/routines/${r.id}`)}
                                                className="flex items-center gap-2 rounded-xl bg-gray-800 px-3 py-2 text-[10px] font-black text-gold-500 uppercase tracking-widest border border-gray-700 hover:border-gold-500/50 hover:bg-gold-500/10 transition-all active:scale-95"
                                            >
                                                <Settings className="h-3 w-3" />
                                                {r.is_assigned ? 'Ver' : 'Gestionar'}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 rounded-3xl border border-dashed border-gray-800 bg-gray-900/30">
                                    <p className="text-xs text-gray-600 font-medium italic font-mono uppercase tracking-tighter">Sin rutinas activas</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Section: Assign from Templates */}
                    <section className="space-y-5">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[10px] font-black text-gold-500 uppercase tracking-[0.2em]">Plantillas Maestras</h3>
                            <div className="h-px flex-1 bg-gradient-to-r from-gold-500/20 to-transparent ml-4" />
                        </div>

                        {/* Search templates - Premium Input */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-500 group-focus-within:text-gold-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar en mis plantillas..."
                                data-testid="routine-search-input"
                                className="w-full rounded-2xl border border-gray-800 bg-gray-950 py-3.5 pl-11 pr-4 text-sm text-white placeholder-gray-600 focus:border-gold-500/50 focus:ring-4 focus:ring-gold-500/5 transition-all outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {isLoadingTemplates ? (
                                <div className="flex flex-col items-center justify-center p-12 gap-3">
                                    <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
                                    <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Cargando...</p>
                                </div>
                            ) : filteredTemplates?.length > 0 ? (
                                filteredTemplates.map(t => (
                                    <div
                                        key={t.id}
                                        data-testid={`routine-template-${t.name}`}
                                        className={`relative overflow-hidden transition-all duration-300 rounded-[1.5rem] border ${selectedTemplateId === t.id
                                            ? 'bg-gray-800 border-gold-500 ring-1 ring-gold-500/50 shadow-lg shadow-gold-500/10'
                                            : 'bg-gray-900 border-gray-800 hover:border-gold-500/40 hover:bg-gray-800/50'
                                            }`}
                                    >
                                        <button
                                            onClick={() => setSelectedTemplateId(selectedTemplateId === t.id ? null : t.id)}
                                            className="w-full flex items-center gap-4 p-4 text-left relative z-10"
                                        >
                                            <div className={`h-12 w-12 flex items-center justify-center rounded-2xl transition-colors duration-300 ${selectedTemplateId === t.id ? 'bg-gold-500 text-black' : 'bg-gold-500/10 text-gold-500'
                                                }`}>
                                                <List className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-sm font-bold transition-colors truncate uppercase tracking-tight ${selectedTemplateId === t.id ? 'text-white' : 'text-white group-hover:text-gold-500'
                                                    }`}>{t.name}</h4>
                                                <p className="text-[10px] text-gray-500 font-medium truncate uppercase tracking-tighter font-mono mb-1.5">
                                                    {t.description || 'Sin descripción detallada'}
                                                </p>
                                                {(t.category || (t.tags && t.tags.length > 0)) && (
                                                    <div className="flex flex-wrap gap-1.5 opacity-90">
                                                        {t.category && (
                                                            <span className="text-[9px] font-black uppercase tracking-wider text-black bg-gold-500 px-1.5 py-0.5 rounded">
                                                                {t.category}
                                                            </span>
                                                        )}
                                                        {t.tags && t.tags.slice(0, 3).map(tag => (
                                                            <span key={tag} className="text-[9px] font-mono text-gray-400 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded">
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                        {t.tags && t.tags.length > 3 && (
                                                            <span className="text-[9px] text-gray-500 px-1 py-0.5">+{t.tags.length - 3}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className={`flex items-center justify-center h-8 w-8 rounded-full transition-all ${selectedTemplateId === t.id ? 'bg-gold-500 text-black' : 'bg-gray-800 text-gray-600'
                                                }`}>
                                                {selectedTemplateId === t.id ? <CheckCircle2 className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </div>
                                        </button>

                                        {/* Expanded Action Area */}
                                        <div className={`
                                            overflow-hidden transition-all duration-300 ease-in-out bg-gray-950/50
                                            ${selectedTemplateId === t.id ? 'max-h-[500px] opacity-100 border-t border-gray-700' : 'max-h-0 opacity-0'}
                                        `}>
                                            <div className="p-4 space-y-4">
                                                {/* Preview Section */}
                                                <div className="space-y-3" data-testid="routine-preview-section">
                                                    <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em]">Vista Previa de Ejercicios</h5>
                                                    {isLoadingPreview ? (
                                                        <div className="flex items-center gap-2 py-2">
                                                            <Loader2 className="h-3 w-3 animate-spin text-gold-500" />
                                                            <span className="text-[10px] text-gray-400 uppercase font-bold">Cargando detalles...</span>
                                                        </div>
                                                    ) : previewData ? (
                                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                                                            {previewData.map((block, bIdx) => (
                                                                <div key={block.id} className="space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[8px] font-black bg-gray-800 text-gray-500 px-1 rounded uppercase">Bloque {bIdx + 1}</span>
                                                                        <div className="h-px flex-1 bg-gray-800" />
                                                                    </div>
                                                                    <div className="pl-2 space-y-1">
                                                                        {block.routine_exercises?.map((ex) => (
                                                                            <div key={ex.id} className="flex items-center justify-between gap-2">
                                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                                    <Dumbbell className="h-2.5 w-2.5 text-gold-500 shrink-0" />
                                                                                    <span className="text-[10px] text-gray-300 font-bold truncate uppercase">
                                                                                        {ex.exercise?.name || ex.exercises?.name || ex.custom_exercise_name || 'Ejercicio'}
                                                                                    </span>
                                                                                </div>
                                                                                <span className="text-[9px] text-gray-500 font-mono whitespace-nowrap">{ex.default_sets}x{ex.default_reps}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-[10px] text-gray-600 italic">No se pudieron cargar los ejercicios</p>
                                                    )}
                                                </div>

                                                {/* Assignment Notes Field */}
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] flex items-center gap-2">
                                                        <FileText className="h-3 w-3" />
                                                        Notas para el Cliente (Opcional)
                                                    </label>
                                                    <textarea
                                                        value={assignmentNotes}
                                                        onChange={(e) => setAssignmentNotes(e.target.value)}
                                                        placeholder="Ej: Enfócate en la técnica, descansa bien entre series..."
                                                        rows={3}
                                                        className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20 resize-none"
                                                    />
                                                </div>

                                                <button
                                                    onClick={() => handleAssign(t.id)}
                                                    disabled={isAssigning || assignedRoutineIds?.has(t.id)}
                                                    className={`w-full rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${assignedRoutineIds?.has(t.id)
                                                        ? 'bg-green-500/20 text-green-500 border border-green-500/50'
                                                        : 'bg-gold-500 text-black hover:bg-gold-400 active:scale-95'
                                                        }`}
                                                >
                                                    {isAssigning ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : assignedRoutineIds?.has(t.id) ? (
                                                        <>
                                                            <CheckCircle2 className="h-4 w-4" />
                                                            Ya Asignada
                                                        </>
                                                    ) : (
                                                        <>
                                                            <PlusCircle className="h-4 w-4" />
                                                            Confirmar Asignación
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 px-4 rounded-[2rem] border border-dashed border-gray-800">
                                    <List className="h-8 w-8 text-gray-700 mx-auto mb-3 opacity-20" />
                                    <p className="text-xs text-gray-600 font-black uppercase tracking-widest">No hay plantillas</p>
                                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">Crea plantillas en tu sección de Mis Plantillas primero.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div >

                {/* Footer Deco */}
                < div className="h-1 w-full bg-gradient-to-r from-transparent via-gold-500/20 to-transparent" />
            </div >
        </div >
    )
}
