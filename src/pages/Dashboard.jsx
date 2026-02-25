import { useState } from 'react'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'
import { useRecentWorkouts } from '../hooks/useWorkouts'
import { useUserRole } from '../hooks/useUserRole'
import { Plus, User, Calendar, Dumbbell, History, Loader2, TrendingUp, LogOut, Zap, Activity, ChevronRight, ChevronLeft, ListFilter, X, MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import TrainerDashboard from '../components/TrainerDashboard'
import { useAssignedRoutines } from '../hooks/useAssignedRoutines'

// --- Componente Local: Client Dashboard (Lógica original) ---
// --- Sub-components for Cleanliness ---
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts'
import { useClientStats } from '../hooks/useClientStats'
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, parseISO, startOfMonth, getDaysInMonth, getDay } from 'date-fns'

function MonthCalendarModal({ workouts, onClose }) {
    const today = new Date()
    // Estado para manejar el mes que se está visualizando
    const [selectedMonth, setSelectedMonth] = useState(today)

    const daysInMonth = getDaysInMonth(selectedMonth)
    const firstDayOfMonth = getDay(startOfMonth(selectedMonth)) // 0 (Sun) to 6 (Sat)
    // Adjust to Monday start: (day + 6) % 7
    const firstDayAdjusted = (firstDayOfMonth + 6) % 7

    const currentMonthName = format(selectedMonth, 'MMMM yyyy', { locale: es })

    const workoutDates = new Set(workouts?.map(w => w.date.split('T')[0]))

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    const padding = Array.from({ length: firstDayAdjusted }, (_, i) => i)

    const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

    // Funciones de navegación
    const goToPreviousMonth = () => {
        setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))
    }

    const goToNextMonth = () => {
        setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-sm rounded-[2.5rem] bg-gray-900 border border-white/10 p-8 shadow-2xl animate-in zoom-in-95">
                <div className="mb-6 flex items-center justify-between">
                    <button
                        onClick={goToPreviousMonth}
                        className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-white transition-colors"
                        data-testid="calendar-prev-month"
                        aria-label="Mes anterior"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight capitalize">{currentMonthName}</h3>
                    <button
                        onClick={goToNextMonth}
                        className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-white transition-colors"
                        data-testid="calendar-next-month"
                        aria-label="Mes siguiente"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 text-gray-400 hover:text-white transition-colors z-10"
                    data-testid="calendar-close-btn"
                    aria-label="Cerrar calendario"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="grid grid-cols-7 gap-2 mb-4">
                    {dayNames.map(d => (
                        <div key={d} className="text-center text-[10px] font-black text-gray-500 uppercase">{d}</div>
                    ))}
                    {padding.map(p => <div key={`p-${p}`} />)}
                    {days.map(day => {
                        const dateStr = format(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day), 'yyyy-MM-dd')
                        const isTrained = workoutDates.has(dateStr)
                        const isToday = isSameDay(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day), today)

                        return (
                            <div
                                key={day}
                                className={`
                                    aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-all
                                    ${isTrained ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' : 'bg-white/5 text-gray-400'}
                                    ${isToday && !isTrained ? 'border border-gold-500/50 text-gold-500' : ''}
                                `}
                            >
                                {day}
                            </div>
                        )
                    })}
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-md bg-gold-500" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Entrenado</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

function WeeklyConsistencyChart({ workouts }) {
    if (!workouts) return null

    const today = new Date()
    const start = startOfWeek(today, { weekStartsOn: 1 })
    const end = endOfWeek(today, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start, end })

    const daysData = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const hasWorkout = workouts.some(w => w.date.startsWith(dayStr))
        const isToday = isSameDay(day, today)

        return {
            shortName: format(day, 'EEEEE', { locale: es }), // 'L'
            active: hasWorkout,
            isToday
        }
    })

    return (
        <div className="flex items-center justify-between gap-2">
            {daysData.map((day, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                    <span className={`text-[10px] font-black uppercase ${day.isToday ? 'text-gold-500' : 'text-gray-500'}`}>
                        {day.shortName}
                    </span>
                    <div className={`
                        h-10 w-full rounded-2xl flex items-center justify-center transition-all duration-500
                        ${day.active
                            ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20'
                            : 'bg-white/5 border border-white/5'}
                        ${day.isToday && !day.active ? 'border-gold-500/30' : ''}
                    `}>
                        {day.active && <Zap className="h-4 w-4 fill-current" />}
                    </div>
                </div>
            ))}
        </div>
    )
}

function StatCard({ label, value, icon: Icon, color, subtext }) {
    return (
        <div className="flex flex-col rounded-[2.5rem] glass-card p-6 border-white/5">
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${color.bg} ${color.text}`}>
                <Icon className="h-6 w-6 stroke-[2]" />
            </div>
            <span className="text-3xl font-black text-white tracking-tighter mb-1">{value}</span>
            <p className="text-[10px] font-black text-gold-500/50 uppercase tracking-[0.2em]">{label}</p>
            {subtext && <p className="mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{subtext}</p>}
        </div>
    )
}

function ClientDashboard({ profile }) {
    const navigate = useNavigate()
    const { user, signOut } = useAuth()
    const { data: stats, isLoading: isLoadingStats } = useClientStats()
    const { data: recentWorkouts, isLoading: isLoadingHistory } = useRecentWorkouts()
    const { data: assignments } = useAssignedRoutines()
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)

    // Count new (unviewed) assignments
    const newAssignmentsCount = assignments?.filter(a => !a.viewed_at).length || 0

    // Helper para formatear fecha relativa
    const formatDate = (dateString) => {
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: es })
        } catch (e) {
            return 'Fecha desconocida'
        }
    }

    const displayName = profile?.full_name || user?.email?.split('@')[0]

    return (
        <div className="min-h-screen bg-gray-950 px-5 pt-6 text-gray-100 font-sans selection:bg-gold-500/30">
            {/* 1. Top Bar */}
            <header className="mb-8 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Bienvenido de vuelta,</span>
                    <h1 className="text-xl font-bold text-white">{displayName}</h1>
                </div>
                <button
                    onClick={signOut}
                    className="rounded-full bg-gray-900 p-2 text-gray-400 border border-gray-800 hover:text-white hover:border-gray-600 transition-all"
                    aria-label="Cerrar sesión"
                >
                    <LogOut className="h-5 w-5" />
                </button>
            </header>

            {/* 2. Stats Row */}
            <section className="mb-8 grid grid-cols-2 gap-3">
                {isLoadingStats ? (
                    <>
                        <div className="h-28 animate-pulse rounded-2xl bg-gray-900" />
                        <div className="h-28 animate-pulse rounded-2xl bg-gray-900" />
                    </>
                ) : (
                    <>
                        <StatCard
                            label="Racha Actual"
                            value={stats?.streak ? `${stats.streak} ${stats.streak === 1 ? 'día' : 'días'}` : '0 días'}
                            icon={Zap}
                            color={{ bg: 'bg-orange-500/10', text: 'text-orange-400' }}
                            subtext={stats?.streak > 0 ? "¡Mantén el ritmo!" : "¡Empieza hoy!"}
                        />
                        <div onClick={() => setIsCalendarOpen(true)} className="cursor-pointer active:scale-95 transition-transform">
                            <StatCard
                                label="Este Mes"
                                value={stats?.workoutsThisMonth || 0}
                                icon={Calendar}
                                color={{ bg: 'bg-gold-500/10', text: 'text-gold-500' }}
                                subtext="Entrenamientos"
                            />
                        </div>
                    </>
                )}
            </section>

            {/* 3. Consistency Chart & Weekly Goal */}
            <section className="mb-8 rounded-[2.5rem] glass-card p-8 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex flex-col">
                            <h2 className="text-sm font-black text-white uppercase tracking-[0.1em] flex items-center gap-2">
                                <Activity className="h-4 w-4 text-gold-500" />
                                Consistencia Semanal
                            </h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Lunes - Domingo</p>
                        </div>
                    </div>
                    {isLoadingStats ? (
                        <div className="h-24 w-full animate-pulse bg-white/5 rounded-2xl" />
                    ) : (
                        <WeeklyConsistencyChart workouts={stats?.recentWorkouts} />
                    )}
                </div>
                {/* Background Decor */}
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold-500/5 blur-3xl opacity-50" />
            </section>

            {/* 4. Action Grid (Big Cards) */}
            <section className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                    data-testid="new-workout-btn"
                    onClick={() => navigate('/app/workout/new?auth=true', { state: { authorized: true } })}
                    className="group relative h-40 w-full overflow-hidden rounded-[2.5rem] bg-gold-500 p-6 text-left shadow-2xl shadow-gold-500/20 transition-all active:scale-[0.98]"
                >
                    <div className="absolute -right-4 -top-4 text-black/10 group-hover:rotate-12 transition-transform duration-500">
                        <Dumbbell className="h-32 w-32" />
                    </div>
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div className="rounded-2xl bg-black/10 p-3 w-fit backdrop-blur-md mb-2 border border-black/5">
                            <Plus className="h-5 w-5 text-black stroke-[3]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-black uppercase tracking-tight">Nuevo Entreno</h3>
                            <p className="text-black/50 text-[10px] font-black uppercase tracking-widest">Registrar hoy</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => navigate('/app/assigned-routines')}
                    data-testid="assigned-routines-btn"
                    className="relative flex h-40 flex-col justify-between rounded-[2.5rem] glass-card p-6 text-left transition-all active:scale-95 group"
                >
                    {newAssignmentsCount > 0 && (
                        <div className="absolute -top-2 -right-2 bg-gold-500 text-black text-xs font-black rounded-full h-7 w-7 flex items-center justify-center shadow-lg shadow-gold-500/40 z-20 border-2 border-gray-950">
                            {newAssignmentsCount}
                        </div>
                    )}
                    <div className="h-12 w-12 rounded-2xl bg-gold-500/10 flex items-center justify-center text-gold-500 mb-2 border border-gold-500/20 group-hover:bg-gold-500/20 transition-colors">
                        <Dumbbell className="h-6 w-6 stroke-[2]" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-gold-500 transition-colors">Asignadas</h3>
                        <p className="text-[10px] font-black text-gold-500/50 uppercase tracking-widest">Por tu entrenador</p>
                    </div>
                </button>

                <button
                    onClick={() => navigate('/app/progress')}
                    data-testid="progress-btn"
                    className="flex h-32 flex-col justify-between rounded-[2rem] glass-card p-5 text-left transition-all active:scale-95 group"
                >
                    <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                        <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-md font-black text-white uppercase tracking-tight group-hover:text-emerald-400 transition-colors">Progreso</h3>
                        <p className="text-[10px] font-black text-emerald-500/40 uppercase tracking-widest">Ver historial</p>
                    </div>
                </button>

                <button
                    onClick={() => navigate('/app/routines')}
                    data-testid="routines-btn"
                    className="flex h-32 flex-col justify-between rounded-[2rem] glass-card p-5 text-left transition-all active:scale-95 group"
                >
                    <div className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 mb-2 border border-white/5 group-hover:bg-white/10 transition-colors">
                        <ListFilter className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-md font-black text-white uppercase tracking-tight group-hover:text-gold-500 transition-colors">Crea tus rutinas</h3>
                        <p className="text-[10px] font-black text-gold-500/50 uppercase tracking-widest">Gestor de plantillas</p>
                    </div>
                </button>
            </section>

            {/* 5. Last Activity (Simplified) */}
            <section className="pb-12">
                <div className="flex items-center justify-between mb-6 px-1">
                    <div className="flex flex-col">
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.1em] flex items-center gap-2">
                            <History className="h-4 w-4 text-gray-400" />
                            Última Actividad
                        </h2>
                    </div>
                    <button
                        onClick={() => navigate('/app/history')}
                        className="text-xs font-black text-gold-500 hover:text-gold-400 transition-colors uppercase tracking-widest"
                    >
                        Ver todo
                    </button>
                </div>
                {isLoadingHistory ? (
                    <div className="h-20 w-full animate-pulse rounded-[2rem] bg-white/5" />
                ) : recentWorkouts && recentWorkouts.length > 0 ? (
                    <div className="space-y-4">
                        {recentWorkouts.slice(0, 3).map(workout => (
                            <div
                                key={workout.id}
                                onClick={() => navigate(`/app/workout/${workout.id}`)}
                                className={clsx(
                                    "flex items-center justify-between rounded-[2rem] p-5 group relative transition-all border",
                                    workout.feedback_notes && !workout.trainer_feedback_viewed_at
                                        ? "border-l-4 border-l-yellow-500 border-y-yellow-500/10 border-r-yellow-500/10 bg-yellow-500/10 shadow-[0_0_20px_-5px_rgba(234,179,8,0.3)] overflow-hidden"
                                        : "glass-card hover:bg-gray-800/10"
                                )}
                            >
                                {/* feedback-chip */}
                                {workout.feedback_notes && !workout.trainer_feedback_viewed_at && (
                                    <div
                                        data-testid="feedback-chip"
                                        className="absolute top-0 right-0 bg-yellow-500 text-black text-[10px] font-black px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm z-10"
                                    >
                                        <MessageCircle className="w-3 h-3" />
                                        <span>FEEDBACK</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/10 text-gold-500 border border-gold-500/10 group-hover:bg-gold-500/20 transition-colors">
                                        <Dumbbell className="h-6 w-6 stroke-[2]" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-white text-sm uppercase tracking-tight group-hover:text-gold-500 transition-colors">{workout.name}</h4>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{formatDate(workout.date)}</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-700 group-hover:text-gold-500 transition-colors" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-[2.5rem] bg-white/5 p-12 text-center border border-dashed border-white/10">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">No hay actividad reciente.</p>
                    </div>
                )}
            </section>
            {/* 6. Calendar Modal */}
            {isCalendarOpen && (
                <MonthCalendarModal
                    workouts={stats?.recentWorkouts}
                    onClose={() => setIsCalendarOpen(false)}
                />
            )}
        </div>
    )
}

// --- Componente Principal (Role Switcher) ---
export default function Dashboard() {
    const { data: profile, isLoading } = useUserRole()

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gold-500">
                <Loader2 className="h-10 w-10 animate-spin" />
            </div>
        )
    }

    if (profile?.role === 'trainer') {
        return <TrainerDashboard />
    }

    // Default to Client Dashboard
    return <ClientDashboard profile={profile} />
}
