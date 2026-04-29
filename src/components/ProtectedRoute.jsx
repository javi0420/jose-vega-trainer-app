import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useActiveWorkout } from '../context/ActiveWorkoutContext'
import { useUserRole } from '../hooks/useUserRole'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ allowedRoles }) {
    const { user, loading: authLoading } = useAuth()
    const { activeWorkoutId } = useActiveWorkout()
    const { data: profile, isLoading: roleLoading, isError } = useUserRole()
    const location = useLocation()

    if (authLoading || (user && roleLoading)) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-950">
                <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
            </div>
        )
    }

    if (!user && !activeWorkoutId) {
        return <Navigate to="/" replace state={{ from: location }} />
    }

    // Salvaguarda: Si hay error de red cargando el perfil, no forzar redirecciones sensibles
    if (user && isError) return <Outlet />

    if (profile?.requires_password_change && location.pathname !== '/update-password') {
        return <Navigate to="/update-password" replace />
    }

    if (!profile?.requires_password_change && location.pathname === '/update-password') {
        return <Navigate to="/app" replace />
    }

    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        return <Navigate to="/app" replace />
    }

    return <Outlet />
}
