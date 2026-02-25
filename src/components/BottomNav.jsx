import { NavLink } from 'react-router-dom'
import { Home, History, User, List } from 'lucide-react'
import { clsx } from 'clsx'
import { useUserRole } from '../hooks/useUserRole'

export default function BottomNav() {
    const { data: profile } = useUserRole()
    const isTrainer = profile?.role === 'trainer'

    const navItems = [
        { to: '/app', icon: Home, label: 'Inicio', testId: 'nav-btn-home', end: true },
        { to: '/app/routines', icon: List, label: isTrainer ? 'Plantillas' : 'Rutinas', testId: 'nav-btn-routines' },
        ...(!isTrainer ? [{ to: '/app/history', icon: History, label: 'Historial', testId: 'nav-btn-history' }] : []),
        { to: '/app/profile', icon: User, label: 'Perfil', testId: 'nav-btn-profile' }
    ]

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe glass-panel border-t-0 rounded-t-[2.5rem]">
            <div className="flex h-20 items-center justify-around px-4">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        data-testid={item.testId}
                        className={({ isActive }) => clsx(
                            "relative flex h-full flex-1 flex-col items-center justify-center gap-1.5 transition-all duration-300",
                            isActive ? "text-gold-500 scale-110" : "text-gray-500 hover:text-gray-400"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon
                                    className={clsx(
                                        "transition-all duration-300",
                                        isActive ? "h-6 w-6 stroke-[2.5]" : "h-6 w-6 stroke-[1.5]"
                                    )}
                                />
                                <span className={clsx(
                                    "font-bold transition-all duration-300",
                                    isActive ? "text-[10px] opacity-100 mt-0" : "text-[10px] opacity-70 mt-0"
                                )}>
                                    {item.label}
                                </span>

                                {/* Active Indicator Dot */}
                                {isActive && (
                                    <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-gold-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    )
}
