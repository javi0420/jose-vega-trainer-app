import { useState, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    Users,
    Activity,
    ChevronRight,
    Dumbbell,
    FileText,
    Zap,
    CheckCircle2,
    ListFilter,
    X,
    LogOut,
    TrendingUp,
    Search,
    Plus,
    Edit2,
    Trash2,
    Loader2,
    ShieldCheck,
    ShieldAlert,
    MessageSquare
} from 'lucide-react'
import { useClients } from '../hooks/useClients'
import { useTrainerActivity } from '../hooks/useTrainerActivity'
import { useTrainerStats } from '../hooks/useTrainerStats'
import { useUserRole } from '../hooks/useUserRole'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useManageClients } from '../hooks/useManageClients'
import AssignRoutineModal from './AssignRoutineModal'
import ClientRow from './ClientRow'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabase'

// --- Sub-components ---

function StatCard({ label, value, icon: Icon, color, trend }) {
    return (
        <div className="flex flex-col rounded-2xl border border-gray-800 bg-gray-900/50 p-4 backdrop-blur-sm">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${color.bg} ${color.text}`}>
                <Icon className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            {trend && <p className="mt-1 text-[10px] text-emerald-400 font-bold">{trend}</p>}
        </div>
    )
}

function BusinessActivityChart({ data }) {
    if (!data) return <div className="h-full flex items-center justify-center text-gray-500 text-xs">Cargando datos...</div>

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A1A1A" />
                <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#666666', fontSize: 10 }}
                    dy={10}
                />
                <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #1F2937', backgroundColor: '#0A0A0A', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ color: '#D4AF37', fontWeight: 'bold' }}
                    cursor={{ stroke: '#D4AF37', strokeWidth: 1 }}
                />
                <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#D4AF37"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}

export default function TrainerDashboard() {
    const navigate = useNavigate()
    const location = useLocation()
    const { signOut } = useAuth()
    const { data: profile } = useUserRole()
    const { data: clients, isLoading: isLoadingClients } = useClients()
    const { data: activity, isLoading: isLoadingActivity } = useTrainerActivity()
    const { data: stats } = useTrainerStats()
    const { createClient, updateClient, unlinkClient, deleteClientPermanently, toggleClientStatus } = useManageClients()

    // States
    const [activityTab, setActivityTab] = useState('all') // 'all', 'workouts', 'checkins'
    const [selectedClientId, setSelectedClientId] = useState(null)
    const [isClientModalOpen, setIsClientModalOpen] = useState(false)
    const [editingClient, setEditingClient] = useState(null)
    const [clientForm, setClientForm] = useState({ fullName: '', email: '' })
    const [searchQuery, setSearchQuery] = useState('')
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
    const [clientToAssign, setClientToAssign] = useState(null)
    const [hasPreSelected, setHasPreSelected] = useState(false)

    const handleGenerateMagicLink = async (client) => {
        if (!client?.id) {
            toast.error('El cliente no tiene un ID válido');
            return;
        }

        try {
            // USAMOS FETCH NATIVO PARA EL "DOUBLE BYPASS" (EVITAR ERROR 401)
            // Esto evita que el cliente de Supabase inyecte headers de Auth corruptos.
            const PROJECT_URL = import.meta.env.VITE_SUPABASE_URL;

            const response = await fetch(`${PROJECT_URL}/functions/v1/generate-recovery-link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    // Importante: No enviamos Authorization para que el "verify_jwt = false" funcione sin ruido
                },
                body: JSON.stringify({ userId: client.id })
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error('Error al generar el link: ' + (data.error || response.statusText));
                return;
            }

            if (data?.action_link) {
                try {
                    await navigator.clipboard.writeText(data.action_link);
                } catch (err) {
                    console.warn('Clipboard copy failed:', err);
                }
                toast.success('Link de acceso copiado con éxito');
            } else {
                toast.error('No se pudo obtener el link de acceso');
            }
        } catch (err) {
            console.error('Error in handleGenerateMagicLink:', err);
            toast.error('Ocurrió un error inesperado al generar el link');
        }
    };

    // Handle selectedClientId from navigation state
    useEffect(() => {
        if (location.state?.selectedClientId && !hasPreSelected) {
            setSelectedClientId(location.state.selectedClientId)
            setHasPreSelected(true)
        }
    }, [location.state, hasPreSelected])

    // Derived Review Count Logic
    const pendingReviewsCount = useMemo(() => {
        if (!activity) return 0
        return activity.filter(w => w.status === 'completed' && !w.feedback_notes).length
    }, [activity])

    const unreadMessagesCount = useMemo(() => {
        if (!activity) return 0
        return activity.filter(w => w.client_notes && !w.client_feedback_viewed_at).length
    }, [activity])

    // Filter Logic
    const filteredClients = useMemo(() => {
        if (!clients) return []
        return clients.filter(c =>
            (c.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.email || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [clients, searchQuery])

    const filteredActivity = activity?.filter(item => {
        if (!item) return false // Skip null/undefined items
        if (selectedClientId && item.user_id !== selectedClientId) return false
        if (activityTab === 'checkins') return false
        if (activityTab === 'workouts') return true
        return true
    })

    const handleClientClick = (clientId) => {
        if (selectedClientId === clientId) setSelectedClientId(null)
        else setSelectedClientId(clientId)
    }

    const openCreateModal = () => {
        setEditingClient(null)
        setClientForm({ fullName: '', email: '' })
        setIsClientModalOpen(true)
    }

    const openEditModal = (e, client) => {
        e.stopPropagation()
        setEditingClient(client)
        setClientForm({ fullName: client.full_name, email: client.email || '' })
        setIsClientModalOpen(true)
    }

    const handleDeleteClient = async (e, client) => {
        e.stopPropagation()
        const confirmUnlink = window.confirm(`¿Quieres desvincular a ${client.full_name}? \n\n(Seguirá existiendo en la base de datos pero no aparecerá en tu lista)`)

        if (confirmUnlink) {
            const hardDelete = window.confirm(`¿Deseas ELIMINAR PERMANENTEMENTE a ${client.full_name} y toda su información de la base de datos? \n\nESTA ACCIÓN NO SE PUEDE DESHACER.`)

            try {
                if (hardDelete) {
                    await deleteClientPermanently.mutateAsync(client.id)
                } else {
                    await unlinkClient.mutateAsync(client.id)
                }
            } catch (err) {
                alert(err.message || 'Error al procesar la solicitud')
            }
        }
    }

    const handleToggleStatus = async (client) => {
        const isCurrentlyActive = client.is_active !== false
        const action = isCurrentlyActive ? 'DESACTIVAR' : 'ACTIVAR'
        const newStatus = !isCurrentlyActive

        if (window.confirm(`¿Quieres ${action} a ${client.full_name}?`)) {
            try {
                await toggleClientStatus.mutateAsync({ id: client.id, isActive: newStatus })
                toast.success(`Cliente ${newStatus ? 'activado' : 'desactivado'} con éxito`);
            } catch (err) {
                console.error('Error toggling status:', err)
                toast.error(err.message || 'Error al cambiar estado')
            }
        }
    }

    const handleOpenAssign = (e, client) => {
        e.stopPropagation()
        setClientToAssign(client)
        setIsAssignModalOpen(true)
    }

    const handleSubmitClient = async (e) => {
        e.preventDefault()
        try {
            if (editingClient) {
                await updateClient.mutateAsync({
                    id: editingClient.id,
                    fullName: clientForm.fullName,
                    email: clientForm.email
                })
            } else {
                await createClient.mutateAsync({
                    fullName: clientForm.fullName,
                    email: clientForm.email
                })
            }
            if (!editingClient) {
                alert(`¡Cliente creado con éxito! \n\nAcceso inicial: \n- Correo: ${clientForm.email} \n- Contraseña: ${import.meta.env.VITE_DEFAULT_PASSWORD} \n\nIndica al cliente que puede cambiarla una vez dentro desde su perfil.`)
            }
            setIsClientModalOpen(false)
        } catch (err) {
            alert(err.message || 'Error al guardar cliente')
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100 font-sans selection:bg-gold-500/30">
            {/* Header Entrenador */}
            <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-[10px] text-gray-500 font-black tracking-widest uppercase">
                            Panel de Entrenador
                        </span>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            {profile?.full_name || 'Entrenador'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={signOut}
                            className="rounded-full bg-gray-900 p-2 text-gray-400 border border-gray-800 hover:text-white hover:border-gray-600 transition-all"
                            aria-label="Cerrar sesión"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                        <div
                            onClick={() => navigate('/app/profile')}
                            aria-label="Perfil"
                            role="button"
                            className="h-10 w-10 overflow-hidden rounded-full border-2 border-gold-500 bg-gray-800 shadow-md shadow-gold-500/20 cursor-pointer hover:border-gold-400 transition-all"
                        >
                            <img
                                src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'T'}&background=D4AF37&color=000`}
                                alt="Profile"
                                className="h-full w-full object-cover"
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 space-y-8 p-6 max-w-7xl mx-auto w-full">

                {/* 1. Overview Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Stats Cards */}
                    <StatCard
                        label="Clientes Activos"
                        value={clients?.length || 0}
                        icon={Users}
                        color={{ bg: 'bg-gold-500/10', text: 'text-gold-500' }}
                        trend="+2" // Mock trend
                    />
                    <StatCard
                        label="Volumen Semanal"
                        value={stats?.totalWorkoutsLast7Days || 0}
                        icon={Zap}
                        color={{ bg: 'bg-emerald-500/10', text: 'text-emerald-400' }}

                    />
                    <StatCard
                        label="Mensajes"
                        value={unreadMessagesCount}
                        icon={MessageSquare}
                        color={{
                            bg: unreadMessagesCount > 0 ? 'bg-blue-500/10' : 'bg-gray-800',
                            text: unreadMessagesCount > 0 ? 'text-blue-400' : 'text-gray-400'
                        }}
                    />

                    {/* Chart Card (Spans 1 on Mobile, but fits in grid) */}
                    <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4 lg:col-span-1 flex flex-col">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-400 uppercase">Actividad (7d)</span>
                            <Activity className="h-4 w-4 text-gold-500" />
                        </div>
                        <div className="h-24 flex-1">
                            <BusinessActivityChart data={stats?.chartData} />
                        </div>
                    </div>
                </section>

                {/* Quick Actions */}
                <section>
                    <button
                        onClick={() => navigate('/app/exercises')}
                        className="flex items-center gap-3 rounded-2xl bg-gray-900/50 border border-gray-800 px-6 py-4 hover:bg-gray-800 hover:border-gold-500/30 transition-all group"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/10 text-gold-500 group-hover:scale-110 transition-transform">
                            <Dumbbell className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-white group-hover:text-gold-500 transition-colors">Catálogo de Ejercicios</h3>
                            <p className="text-xs text-gray-500">Gestionar base de datos global</p>
                        </div>
                        <ChevronRight className="ml-auto h-5 w-5 text-gray-600 group-hover:text-gold-500" />
                    </button>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 2. Clients List (Rich) */}
                    <section className="lg:col-span-1 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Users className="h-5 w-5 text-gold-500" />
                                Mis Clientes
                            </h2>
                            <button
                                onClick={openCreateModal}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500/10 text-gold-500 hover:bg-gold-500 hover:text-black transition-all shadow-sm border border-gold-500/20"
                                title="Añadir Cliente"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar cliente..."
                                className="w-full rounded-xl border border-gray-800 bg-gray-900 py-2.5 pl-9 pr-4 text-sm text-white placeholder-gray-500 focus:border-gold-500 focus:outline-none transition-all"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            {isLoadingClients ? (
                                [1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-900" />)
                            ) : filteredClients.length > 0 ? (
                                filteredClients.map((client) => (
                                    <ClientRow
                                        key={client.id}
                                        client={client}
                                        isSelected={selectedClientId === client.id}
                                        onSelect={handleClientClick}
                                        onEdit={() => openEditModal({ stopPropagation: () => { } }, client)}
                                        onDelete={() => handleDeleteClient({ stopPropagation: () => { } }, client)}
                                        onToggleStatus={() => handleToggleStatus(client)}
                                        onAssignRoutine={() => handleOpenAssign({ stopPropagation: () => { } }, client)}
                                        onGenerateMagicLink={() => handleGenerateMagicLink(client)}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-center text-sm text-gray-500">No se encontraron clientes.</p>
                                    <button
                                        onClick={openCreateModal}
                                        className="mt-2 text-xs text-gold-500 hover:underline"
                                    >
                                        Crear primer cliente
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 3. Activity Feed (Main Content) */}
                    <section className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Activity className="h-5 w-5 text-gold-500" />
                                Feed de Actividad
                            </h2>

                            {/* Filter Chips */}
                            <div className="flex gap-2 bg-gray-900/50 p-1 rounded-lg border border-gray-800">
                                {['all', 'workouts', 'checkins'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActivityTab(tab)}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activityTab === tab
                                            ? 'bg-gray-800 text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-300'
                                            }`}
                                    >
                                        {tab === 'all' ? 'Todo' : tab === 'workouts' ? 'Workouts' : 'Checks'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedClientId && (
                            <div className="mb-4 flex items-center justify-between rounded-lg bg-gold-500/10 border border-gold-500/20 px-4 py-2">
                                <span className="text-xs font-semibold text-gold-200">
                                    Filtrando por: <span className="text-white font-black uppercase tracking-tighter">{clients?.find(c => c.id === selectedClientId)?.full_name}</span>
                                </span>
                                <button onClick={() => setSelectedClientId(null)} className="text-gold-500 hover:text-white">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        <div className="space-y-3">
                            {isLoadingActivity ? (
                                [1, 2, 3, 4].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-900" />)
                            ) : filteredActivity && filteredActivity.length > 0 ? (
                                filteredActivity.map(workout => (
                                    <div
                                        key={workout.id}
                                        onClick={() => navigate(`/app/workout/${workout.id}`)}
                                        className="group relative flex gap-4 rounded-2xl border border-gray-800 bg-gray-900/50 p-4 hover:border-gold-500/30 hover:bg-gray-900 transition-all cursor-pointer overflow-hidden"
                                    >
                                        {/* Status Line */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${workout.feedback_notes ? 'bg-emerald-500/50' : 'bg-orange-500/50'}`} />

                                        {/* Avatar / Icon */}
                                        <div className="flex-shrink-0">
                                            <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-gray-800">
                                                <img
                                                    src={workout.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${workout.profiles?.full_name}&background=D4AF37&color=000`}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="text-sm font-bold text-white group-hover:text-gold-500 transition-colors uppercase tracking-tight">
                                                        {workout.name}
                                                    </h4>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {workout.profiles?.full_name} • {formatDistanceToNow(new Date(workout.date || workout.created_at), { addSuffix: true, locale: es })}
                                                    </p>
                                                </div>
                                                {/* Status Badge */}
                                                {!workout.feedback_notes ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-400 border border-orange-500/20">
                                                        <FileText className="h-3 w-3" /> Revisar
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                                                        <CheckCircle2 className="h-3 w-3" /> Hecho
                                                    </span>
                                                )}
                                                {workout.client_notes && !workout.client_feedback_viewed_at && (
                                                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-gray-900 animate-pulse" />
                                                )}
                                                {workout.client_notes && (
                                                    <MessageSquare className="h-4 w-4 text-blue-400 ml-2" />
                                                )}
                                            </div>

                                            {/* Quick Stats Row (Optional Placeholder) */}
                                            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                                                <span className="flex items-center gap-1"><Dumbbell className="h-3.5 w-3.5" /> 5 Ejercicios</span>
                                                <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> 45 min</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-2xl border border-dashed border-gray-800 p-12 text-center">
                                    <Activity className="mx-auto h-10 w-10 text-gray-600 mb-3" />
                                    <h3 className="text-sm font-medium text-gray-300">No hay actividad reciente</h3>
                                    <p className="text-xs text-gray-500 mt-1">Tus clientes están tomando un descanso.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>

            {/* Client Management Modal */}
            {isClientModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">
                                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
                            </h2>
                            <button
                                onClick={() => setIsClientModalOpen(false)}
                                className="rounded-full p-2 text-gray-500 hover:bg-gray-800 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitClient} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={clientForm.fullName}
                                    onChange={(e) => setClientForm(prev => ({ ...prev, fullName: e.target.value }))}
                                    placeholder="Ej: Juan Pérez"
                                    className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none focus:ring-4 focus:ring-gold-500/5 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Correo Electrónico</label>
                                <input
                                    type="email"
                                    required
                                    value={clientForm.email}
                                    onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="ejemplo@email.com"
                                    className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none transition-all"
                                />
                            </div>

                            <div className="pt-4 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsClientModalOpen(false)}
                                    className="flex-1 rounded-xl border border-gray-800 py-3 text-sm font-semibold text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={createClient.isPending || updateClient.isPending}
                                    className="flex-1 rounded-xl bg-gold-500 py-3 text-sm font-black text-black hover:bg-gold-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold-500/20"
                                >
                                    {(createClient.isPending || updateClient.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {editingClient ? 'Guardar Cambios' : 'Crear Cliente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Routine Assignment Modal */}
            {isAssignModalOpen && (
                <AssignRoutineModal
                    client={clientToAssign}
                    onClose={() => setIsAssignModalOpen(false)}
                />
            )}
        </div>
    )
}
