import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useActiveWorkout } from '../context/ActiveWorkoutContext'
import { useUserRole } from '../hooks/useUserRole'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ allowedRoles }) {
    const { user, loading: authLoading } = useAuth()
    const { activeWorkoutId } = useActiveWorkout()
    const { data: profile, isLoading: roleLoading } = useUserRole()

    if (authLoading || (user && roleLoading)) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-950">
                <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
            </div>
        )
    }

    if (!user && !activeWorkoutId) {
        return <Navigate to="/" replace />
    }

    // Force Password Change Check
    if (profile?.requires_password_change && window.location.pathname !== '/update-password') {
        return <Navigate to="/update-password" replace />
    }

    // Bloqueo inverso: Si NO necesita cambiar clave y entra a la ruta de cambio
    if (!profile?.requires_password_change && window.location.pathname === '/update-password') {
        return <Navigate to="/app" replace />
    }

    // Role Check
    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        // User not authorized for this route
        return <Navigate to="/app" replace />
    }

    return <Outlet />
}
