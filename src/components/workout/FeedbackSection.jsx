
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { MessageSquare, CheckCircle2, Save, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'

export default function FeedbackSection({
    workoutId,
    isTrainer,
    feedbackNotes,
    clientNotes,
    trainerFeedbackViewedAt,
    clientFeedbackViewedAt,
    onFeedbackSaved
}) {
    const [trainerFeedback, setTrainerFeedback] = useState(feedbackNotes || '')
    const [clientFeedback, setClientFeedback] = useState(clientNotes || '')
    const [isSavingFeedback, setIsSavingFeedback] = useState(false)
    const [isSavingClientFeedback, setIsSavingClientFeedback] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [isClientSuccess, setIsClientSuccess] = useState(false)

    // Sync state if props change (e.g. after refetch)
    useEffect(() => {
        if (feedbackNotes !== undefined) setTrainerFeedback(feedbackNotes)
        if (clientNotes !== undefined) setClientFeedback(clientNotes)
    }, [feedbackNotes, clientNotes])

    // Auto-mark client notes as viewed for Trainer
    useEffect(() => {
        const autoMark = async () => {
            if (isTrainer && clientNotes && !clientFeedbackViewedAt) {
                try {
                    const { error } = await supabase
                        .from('workouts')
                        .update({ client_feedback_viewed_at: new Date().toISOString() })
                        .eq('id', workoutId);
                    if (error) throw error;
                    if (onFeedbackSaved) onFeedbackSaved(); // Refresh to update badge
                } catch (e) {
                    console.error('Error marking client feedback as viewed:', e);
                }
            }
        }
        autoMark()
    }, [isTrainer, clientNotes, clientFeedbackViewedAt, workoutId, onFeedbackSaved])

    // Auto-mark trainer feedback as viewed for Client -> REMOVED to allow manual confirmation (requested by E2E tests)
    /* 
    useEffect(() => {
        const autoMarkTrainerFeedback = async () => {
             // ... logic removed to restore manual "Confirmar Lectura" button flow 
        }
    }, [])
    */

    const handleSaveFeedback = async () => {
        setIsSavingFeedback(true)
        try {
            const { error } = await supabase
                .from('workouts')
                .update({
                    feedback_notes: trainerFeedback,
                    trainer_feedback_viewed_at: null // Reset for client
                })
                .eq('id', workoutId)

            if (error) throw error

            setIsSuccess(true)
            setTimeout(() => setIsSuccess(false), 3000)
            if (onFeedbackSaved) onFeedbackSaved()
        } catch (err) {
            console.error(err)
            toast.error('Error al guardar el feedback')
        } finally {
            setIsSavingFeedback(false)
        }
    }

    const handleSaveClientFeedback = async () => {
        setIsSavingClientFeedback(true)
        try {
            const { error } = await supabase
                .from('workouts')
                .update({
                    client_notes: clientFeedback,
                    client_feedback_viewed_at: null // Reset for coach
                })
                .eq('id', workoutId)

            if (error) throw error

            setIsClientSuccess(true)
            setTimeout(() => setIsClientSuccess(false), 3000)
            toast.success('Comentario enviado al coach')
            if (onFeedbackSaved) onFeedbackSaved()
        } catch (err) {
            console.error(err)
            toast.error('Error al enviar el mensaje')
        } finally {
            setIsSavingClientFeedback(false)
        }
    }

    const markFeedbackAsViewed = async () => {
        try {
            const { error } = await supabase
                .from('workouts')
                .update({ trainer_feedback_viewed_at: new Date().toISOString() })
                .eq('id', workoutId);

            if (error) throw error;
            if (onFeedbackSaved) onFeedbackSaved();
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <section className="px-2 space-y-4">
            {/* Coach Feedback Box */}
            <div
                data-testid="trainer-feedback-block"
                className={clsx(
                    "rounded-[2rem] border p-6 transition-all shadow-lg",
                    isTrainer
                        ? "border-orange-500/20 bg-orange-500/5 shadow-orange-500/5"
                        : "border-gray-800 bg-gray-900/40"
                )}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={clsx("p-2 rounded-xl", isTrainer ? "bg-orange-500/20 text-orange-400" : "bg-gray-800 text-gray-400")}>
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <h3 className={clsx("font-black uppercase tracking-tight text-sm", isTrainer ? "text-orange-100" : "text-gray-200")}>Instrucciones del Coach</h3>
                    </div>
                    {isTrainer && trainerFeedbackViewedAt && (
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Visto por cliente
                        </span>
                    )}
                </div>

                {isTrainer ? (
                    <div className="space-y-4">
                        <textarea
                            value={trainerFeedback}
                            onChange={(e) => setTrainerFeedback(e.target.value)}
                            placeholder="Escribe instrucciones o feedback..."
                            className="w-full rounded-2xl border border-gray-800 bg-black/40 p-5 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 min-h-[100px] transition-all"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={handleSaveFeedback}
                                disabled={isSavingFeedback}
                                className={clsx(
                                    "flex items-center gap-2 h-11 rounded-xl px-6 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95",
                                    isSuccess ? "bg-emerald-600 shadow-emerald-500/20" : "bg-orange-600 shadow-orange-500/20 hover:bg-orange-500"
                                )}
                            >
                                {isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                                <span data-testid="trainer-feedback-status">{isSuccess ? 'Enviado' : 'Enviar Feedback'}</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {feedbackNotes ? (
                            <>
                                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm font-medium">{feedbackNotes}</p>
                                {!trainerFeedbackViewedAt && (
                                    <button
                                        onClick={markFeedbackAsViewed}
                                        className="mt-4 w-full rounded-xl bg-emerald-500/10 border border-emerald-500/20 h-10 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/20"
                                    >
                                        Confirmar Lectura
                                    </button>
                                )}
                            </>
                        ) : (
                            <p className="text-gray-600 italic text-sm">El coach no ha dejado comentarios aún.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Client Feedback Box */}
            <div className={clsx(
                "rounded-[2rem] border p-6 transition-all shadow-lg",
                !isTrainer
                    ? "border-gold-500/10 bg-gold-500/5 shadow-gold-500/5"
                    : "border-gray-800 bg-gray-900/40"
            )}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={clsx("p-2 rounded-xl", !isTrainer ? "bg-gold-500/20 text-gold-500" : "bg-gray-800 text-gray-400")}>
                            <User className="h-5 w-5" />
                        </div>
                        <h3 className={clsx("font-black uppercase tracking-tight text-sm", !isTrainer ? "text-gold-100" : "text-gray-200")}>Mensajes del Atleta</h3>
                    </div>
                </div>

                {!isTrainer ? (
                    <div className="space-y-4">
                        <textarea
                            value={clientFeedback}
                            onChange={(e) => setClientFeedback(e.target.value)}
                            placeholder="¿Cómo te sentiste? ¿Alguna molestia?..."
                            className="w-full rounded-2xl border border-gray-800 bg-black/40 p-5 text-sm text-white focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 min-h-[80px] transition-all"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={handleSaveClientFeedback}
                                disabled={isSavingClientFeedback}
                                className={clsx(
                                    "flex items-center gap-2 h-11 rounded-xl px-6 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95",
                                    isClientSuccess ? "bg-emerald-600 shadow-emerald-500/20" : "bg-gold-600 shadow-gold-500/40 hover:bg-gold-500"
                                )}
                            >
                                {isClientSuccess ? <CheckCircle2 className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                                <span data-testid="client-feedback-status">{isClientSuccess ? 'Enviado' : 'Enviar Mensaje'}</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {clientNotes ? (
                            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm font-medium">{clientNotes}</p>
                        ) : (
                            <p className="text-gray-600 italic text-sm">El atleta no ha dejado mensajes.</p>
                        )}
                    </div>
                )}
            </div>
        </section>
    )
}
