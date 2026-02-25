import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { Lock, Loader2, CheckCircle2 } from 'lucide-react'

export default function UpdatePassword() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const navigate = useNavigate()

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

            // Redirigir después de un breve delay
            setTimeout(() => {
                navigate('/app')
            }, 3000)
        } catch (error) {
            console.error('Error actualizando contraseña:', error)
            toast.error(error.message || 'Error al actualizar la contraseña')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
                <div className="w-full max-激-md rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center shadow-2xl">
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
