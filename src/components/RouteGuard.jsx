import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useEffect } from 'react';
import { useActiveWorkout } from '../context/ActiveWorkoutContext';

/**
 * RouteGuard checks if the user arrived via a valid UI interaction
 * (indicated by location.state.authorized) OR if there is an active workout.
 * If not, redirects to the dashboard.
 */
export default function RouteGuard() {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const authorized = location.state?.authorized || searchParams.get('auth') === 'true';
    const { activeWorkoutId } = useActiveWorkout();

    const isAllowed = authorized || activeWorkoutId;

    useEffect(() => {
        if (!isAllowed) {
            toast.error('Acceso denegado. Por favor usa el menú principal.');
        }
    }, [isAllowed]);

    if (!isAllowed) {
        return <Navigate to="/app" replace />;
    }

    return <Outlet />;
}
