import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, User, Lock, Save, Loader2, LogOut, FileText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUserRole } from '../hooks/useUserRole'
import { supabase } from '../lib/supabase'

export default function Profile() {
    const navigate = useNavigate()
    const { user, signOut } = useAuth()
    const { data: profile, isLoading: isLoadingProfile, refetch: refetchProfile } = useUserRole()

    // Form States
    const [name, setName] = useState('')
    const [isSavingName, setIsSavingName] = useState(false)

    // Password States
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isChangingPassword, setIsChangingPassword] = useState(false)

    useEffect(() => {
        if (profile?.full_name) {
            setName(profile.full_name)
        }
    }, [profile])

    const handleUpdateName = async (e) => {
        e.preventDefault()
        if (!name.trim()) return

        setIsSavingName(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: name })
                .eq('id', user.id)

            if (error) throw error

            await refetchProfile()
            alert('Nombre actualizado correctamente')
        } catch (error) {
            alert('Error actualizando perfil: ' + error.message)
        } finally {
            setIsSavingName(false)
        }
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            alert('Las contraseñas no coinciden')
            return
        }
        if (password.length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres')
            return
        }

        setIsChangingPassword(true)
        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) throw error

            alert('Contraseña actualizada con éxito')
            setPassword('')
            setConfirmPassword('')
        } catch (error) {
            alert('Error actualizando contraseña: ' + error.message)
        } finally {
            setIsChangingPassword(false)
        }
    }

    if (isLoadingProfile) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-950">
                <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-950 px-4 py-6 text-gray-100 font-sans selection:bg-gold-500/30">
            {/* Header */}
            <header className="mb-8 flex items-center gap-4">
                <button
                    onClick={() => navigate('/app')}
                    className="rounded-full h-10 w-10 flex items-center justify-center text-gray-400 hover:bg-gray-800 transition-colors"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-bold text-white">Mi Perfil</h1>
            </header>

            <main className="max-w-xl mx-auto space-y-8">

                {/* Avatar & Role Section */}
                <div className="flex flex-col items-center justify-center py-6">
                    <div className="relative mb-4">
                        <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-gray-800 bg-gray-900 shadow-xl">
                            <img
                                src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'U'}&background=D4AF37&color=000`}
                                alt="Profile"
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <div className="absolute bottom-0 right-0 rounded-full bg-gray-800 p-1.5 border border-gray-700">
                            <User className="h-4 w-4 text-gray-400" />
                        </div>
                    </div>
                    <h2 className="text-lg font-bold text-white">{profile?.full_name}</h2>
                    <span className="mt-1 rounded-full bg-gray-950 border border-gray-800 px-3 py-1 text-xs font-black uppercase tracking-widest text-gold-500">
                        {profile?.role === 'trainer' ? 'Entrenador' : 'Cliente'}
                    </span>
                    <p className="mt-2 text-sm text-gray-500">{user?.email}</p>
                </div>

                {/* Personal Info Form */}
                <section className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
                    <h3 className="mb-4 text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <User className="h-4 w-4" /> Información Personal
                    </h3>
                    <form onSubmit={handleUpdateName} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-400">Nombre Completo</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-xl border border-gray-800 bg-gray-950 h-12 px-4 text-white text-base focus:border-gold-500/50 focus:ring-4 focus:ring-gold-500/5 focus:outline-none placeholder-gray-600 transition-all"
                                placeholder="Tu nombre"
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isSavingName || name === profile?.full_name}
                                className="flex items-center gap-2 h-11 rounded-lg bg-gold-500 px-6 text-sm font-black text-black hover:bg-gold-400 shadow-lg shadow-gold-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isSavingName && <Loader2 className="h-4 w-4 animate-spin" />}
                                Guardar Cambios
                            </button>
                        </div>
                    </form>
                </section>

                {/* Security Form */}
                <section className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
                    <h3 className="mb-4 text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Lock className="h-4 w-4" /> Seguridad
                    </h3>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-400">Nueva Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-xl border border-gray-800 bg-gray-950 h-12 px-4 text-white text-base focus:border-gold-500/50 focus:ring-4 focus:ring-gold-500/5 focus:outline-none placeholder-gray-600 transition-all"
                                placeholder="••••••••"
                                minLength={6}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-400">Confirmar Contraseña</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full rounded-xl border border-gray-800 bg-gray-950 h-12 px-4 text-white text-base focus:border-gold-500/50 focus:ring-4 focus:ring-gold-500/5 focus:outline-none placeholder-gray-600 transition-all"
                                placeholder="••••••••"
                                minLength={6}
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isChangingPassword || !password || !confirmPassword}
                                className="flex items-center gap-2 h-11 rounded-lg bg-gray-800 border border-gray-700 px-6 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isChangingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                                Actualizar Contraseña
                            </button>
                        </div>
                    </form>
                </section>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-gray-800">
                    <Link
                        to="/legal-terms"
                        target="_blank"
                        className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-amber-500 transition-colors"
                    >
                        <FileText className="h-4 w-4" />
                        Política de Privacidad
                    </Link>
                    <span className="hidden sm:block text-gray-700">•</span>
                    <button
                        onClick={signOut}
                        className="flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Cerrar Sesión
                    </button>
                </div>

            </main>
        </div>
    )
}
