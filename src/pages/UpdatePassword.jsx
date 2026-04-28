import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { Lock, Loader2, CheckCircle2 } from 'lucide-react'

import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useUserRole } from '../hooks/useUserRole'

export default function UpdatePassword() {
    const { user, loading: authLoading } = useAuth()
    const { data: profile, isLoading: profileLoading } = useUserRole()
    const queryClient = useQueryClient()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const navigate = useNavigate()

    // Handle redirection after success
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => {
                navigate('/app', { replace: true })
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [success, navigate])

    // Redirect away if user doesn't need to be here
    useEffect(() => {
        // If we just succeeded, DON'T run the "redirect away" logic.
        // The success effect will handle navigation in 2 seconds.
        if (success) return;

        if (!authLoading && !profileLoading) {
            // If not logged in at all, go to login
            if (!user) {
                navigate('/', { replace: true });
                return;
            }

            // If logged in but doesn't have the "requires reset" flag, go to app
            if (profile && profile.requires_password_change === false) {
                navigate('/app', { replace: true });
            }
        }
    }, [user, authLoading, profile, profileLoading, success, navigate]);

    // Show loading state while checking (unless we already succeeded)
    if ((authLoading || profileLoading) && !success) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-950">
                <Loader2 className="h-10 w-10 animate-spin text-gold-500" />
            </div>
        )
    }

    // Don't render the form if we are about to redirect away (not logged in)
    if (!user) return null;

    const handleUpdatePassword = async (e) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden')
            return
        }

        if (password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres')
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) throw error

            setSuccess(true)
            toast.success('Contraseña actualizada con éxito')
            
            // 2. Clear the force password change flag in profiles
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ requires_password_change: false })
                .eq('id', user?.id || (await supabase.auth.getUser()).data.user?.id)

            if (profileError) throw profileError
            
            // 3. Invalidate cache to ensure ProtectedRoute sees the change
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['userRole', user?.id] }),
                queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
            ]);

        } catch (error) {
            console.error('Error actualizando contraseña:', error)
            let errorMessage = error.message || 'Error al actualizar la contraseña';
            
            if (errorMessage.includes('different from the old password')) {
                errorMessage = 'La nueva contraseña debe ser diferente a la anterior';
            }
            
            toast.error(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
                <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center shadow-2xl">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                        <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <h2 className="mb-2 text-2xl font-bold text-white">¡Todo listo!</h2>
                    <p className="text-gray-400">Tu contraseña ha sido actualizada. Te redirigiremos al panel en unos segundos...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500/10 text-gold-500">
                        <Lock className="h-6 w-6" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Nueva contraseña</h1>
                    <p className="mt-2 text-gray-400">Introduce tu nueva clave de acceso</p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4 rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Nueva contraseña</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-white transition-colors focus:border-gold-500 focus:outline-none"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400">Confirmar contraseña</label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-white transition-colors focus:border-gold-500 focus:outline-none"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 font-bold text-black transition-transform hover:scale-[1.02] disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            'Actualizar contraseña'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
