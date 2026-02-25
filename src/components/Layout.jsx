import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import RestTimerOverlay from './RestTimerOverlay'
import ActiveWorkoutBar from './ActiveWorkoutBar'

export default function Layout() {
    const location = useLocation()

    // Hide BottomNav in Workout Editor to prevent accidental exit
    // Also hide in WorkoutDetail? Usually users want to go back to History. 
    // Let's keep it visible in Detail, hide in Editor (New/Edit).
    const isEditor = location.pathname.includes('/workout/new')

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-gold-500/30">
            {/* Main Content Area */}
            <main className={`${!isEditor ? 'pb-28' : ''}`}>
                <Outlet />
            </main>

            {/* Global Overlays */}
            <RestTimerOverlay />
            <ActiveWorkoutBar />

            {/* Bottom Navigation */}
            {!isEditor && <BottomNav />}
        </div>
    )
}
