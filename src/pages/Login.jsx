import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Lock, Mail, Loader2 } from 'lucide-react'

export default function Login() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (signInError) throw signInError

            // Check if user is active
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('is_active')
                    .eq('id', user.id)
                    .single()

                if (profileError) {
                    console.error('Error checking profile status:', profileError)
                } else if (profile && profile.is_active === false) {
                    await supabase.auth.signOut()
                    throw new Error('Esta cuenta ha sido desactivada. Contacta con tu entrenador.')
                }
            }

            navigate('/app')
        } catch (err) {
            console.error('Login error:', err)
            setError(err.message || 'Error al iniciar sesión.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-gray-900 p-8 shadow-xl border border-gray-800">
                <div className="text-center">
                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                        <img
                            src="/logo-jose-vega-ui.png"
                            alt="Jose Vega Trainer"
                            className="h-24 w-24 rounded-full object-cover border-4 border-gold-500 shadow-lg shadow-gold-500/20"
                        />
                    </div>
                    {/* Título */}
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Jose Vega Trainer</h2>
                    <p className="mt-2 text-sm text-gray-400">Acceso exclusivo para miembros</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-4 rounded-md shadow-sm">
                        <div>
                            <label htmlFor="email" className="sr-only">Email</label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Mail className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    data-testid="login-input-email"
                                    className="block w-full rounded-lg border border-gray-700 bg-gray-800 h-12 pl-10 text-gray-100 text-base placeholder-gray-500 focus:border-gold-500 focus:ring-gold-500"
                                    placeholder="nombre@ejemplo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Contraseña</label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Lock className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    data-testid="login-input-password"
                                    className="block w-full rounded-lg border border-gray-700 bg-gray-800 h-12 pl-10 text-gray-100 text-base placeholder-gray-500 focus:border-gold-500 focus:ring-gold-500"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-md bg-red-900/50 p-4 text-sm text-red-200 border border-red-800">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            data-testid="login-btn-submit"
                            className="group relative flex w-full h-12 items-center justify-center rounded-lg bg-gold-500 px-4 text-base font-bold text-black hover:bg-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-70 transition-all shadow-lg shadow-gold-500/20"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
