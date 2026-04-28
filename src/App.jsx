import { useState, useMemo, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import WorkoutEditor from './pages/WorkoutEditor'
import WorkoutDetail from './pages/WorkoutDetail'
import History from './pages/History'
import Progress from './pages/Progress'
import ProtectedRoute from './components/ProtectedRoute'
import { TimerProvider } from './context/TimerContext'
import RestTimerOverlay from './components/RestTimerOverlay'
import ExerciseManagerPage from './pages/ExerciseManagerPage'
import Profile from './pages/Profile'
import { ActiveWorkoutProvider } from './context/ActiveWorkoutContext'
import RouteGuard from './components/RouteGuard'
import Layout from './components/Layout.jsx';
import Routines from './pages/Routines';
import RoutineDetail from './pages/RoutineDetail';
import ScrollToTop from './components/ScrollToTop';
import AssignedRoutines from './pages/AssignedRoutines';
import LegalTerms from './pages/LegalTerms';
import UpdatePassword from './pages/UpdatePassword';
import LegalModal from './components/LegalModal';
import { usePrivacyConsent } from './hooks/usePrivacyConsent';
import { useAuth } from './context/AuthContext';
import { useUserRole } from './hooks/useUserRole';
import { useOfflineSync } from './hooks/useOfflineSync';
import { Toaster } from 'react-hot-toast';
import { useMaintenance } from './hooks/useMaintenance';
import Maintenance from './pages/Maintenance';
import { supabase } from './lib/supabase';
import { useNavigate } from 'react-router-dom';


const queryClient = new QueryClient()

function AuthListener() {
    const navigate = useNavigate();

    useEffect(() => {
        // Escuchamos cambios en la sesión
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("DEBUG: Auth Event:", event);

            if (event === 'PASSWORD_RECOVERY') {
                console.log("DEBUG: PASSWORD_RECOVERY detectado. Forzando navegación a /update-password");
                // Pequeño delay para asegurar que el router está listo
                setTimeout(() => {
                    navigate('/update-password', { replace: true });
                }, 100);
            }

            if (event === 'SIGNED_IN' && window.location.search.includes('type=recovery')) {
                console.log("DEBUG: Login via recovery detectado. Redirigiendo a /update-password");
                navigate('/update-password', { replace: true });
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    return null;
}

function OfflineSyncListener() {
    useOfflineSync();
    return null;
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <ActiveWorkoutProvider>
                    <TimerProvider>
                        <Toaster
                            position="top-center"
                            reverseOrder={false}
                            toastOptions={{
                                style: {
                                    background: '#111827',
                                    color: '#fff',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '1rem',
                                },
                            }}
                        />
                        <BrowserRouter>
                            <OfflineSyncListener />
                            <AuthListener />
                            <ScrollToTop />
                            <MaintenanceGuard />
                            <ConsentGuard />
                            <Routes>
                                <Route path="/" element={<Login />} />
                                <Route path="/maintenance" element={<MaintenanceView />} />

                                {/* Public Legal Terms Route */}
                                <Route path="/legal-terms" element={<LegalTerms />} />



                                {/* Authenticated Routes wrapped in Layout */}
                                <Route path="/update-password" element={<UpdatePassword />} />
                                <Route element={<ProtectedRoute />}>
                                    <Route element={<Layout />}>
                                        <Route path="/app" element={<Dashboard />} />
                                        <Route element={<RouteGuard />}>
                                            <Route path="/app/workout/new" element={<WorkoutEditor />} />
                                        </Route>
                                        <Route path="/app/workout/:id" element={<WorkoutDetail />} />
                                        <Route path="/app/progress" element={<Progress />} />
                                        <Route path="/app/history" element={<History />} />
                                        <Route path="/app/routines" element={<Routines />} />
                                        <Route path="/app/routines/:id" element={<RoutineDetail />} />
                                        <Route path="/app/assigned-routines" element={<AssignedRoutines />} />

                                        {/* Trainer Only Routes */}
                                        <Route element={<ProtectedRoute allowedRoles={['trainer']} />}>
                                            <Route path="/app/exercises" element={<ExerciseManagerPage />} />
                                        </Route>

                                        <Route path="/app/profile" element={<Profile />} />
                                        {/* Redirección por defecto */}
                                        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
                                    </Route>
                                </Route>

                                {/* Catch all */}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </BrowserRouter>
                    </TimerProvider>
                </ActiveWorkoutProvider>
            </AuthProvider>
        </QueryClientProvider>
    )
}

// Consent Guard Component - shows modal when user needs to accept terms
// Only applies to clients, not trainers (who are data controllers)
function ConsentGuard() {
    const location = useLocation();
    const { user } = useAuth();
    const { data: profile, isLoading: roleLoading } = useUserRole();
    const { needsConsent, isLoading: consentLoading } = usePrivacyConsent();
    
    // Don't show on password update route or login to avoid interception
    // Early returns MUST come after all hook declarations
    if (location.pathname.startsWith('/update-password') || location.pathname === '/') return null;

    // Only check consent if user is authenticated
    if (!user) return null;

    // Wait for data to be ready
    if (roleLoading || consentLoading || !profile) return null;

    // Trainers don't need to accept terms (they are data controllers, not subjects)
    if (profile?.role === 'trainer') return null;

    if (!needsConsent) return null;

    return <LegalModal />;
}

// Wrapper for Maintenance page to pass the message
function MaintenanceView() {
    const { message } = useMaintenance();
    return <Maintenance message={message} />;
}

// Global Maintenance Guard
function MaintenanceGuard() {
    const location = useLocation();
    const { user } = useAuth();
    const { data: profile } = useUserRole();
    const { isActive, loading } = useMaintenance();
    const navigate = useNavigate();

    useEffect(() => {
        if (loading) return;

        if (!isActive) {
            if (location.pathname === '/maintenance') {
                navigate('/', { replace: true });
            }
            return;
        }

        // Exceptions (VIP Pass)
        const isAdminEmail = user?.email === import.meta.env.VITE_ADMIN_EMAIL;
        const isAdminRole = profile?.role === 'trainer' || profile?.role === 'admin';
        
        if (isAdminEmail || isAdminRole) {
            return;
        }

        // Allow login/public pages
        if (location.pathname === '/' || location.pathname === '/legal-terms' || location.pathname === '/maintenance') {
            return;
        }

        // If we get here and it's active, redirect to maintenance
        navigate('/maintenance', { replace: true });
    }, [isActive, loading, user, profile?.role, location.pathname, navigate]);

    return null;
}

export default App
