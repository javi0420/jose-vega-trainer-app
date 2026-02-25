import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TrainerDashboard from '../components/TrainerDashboard'
import { AuthProvider } from '../context/AuthContext'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mocks
const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve({ data: [], error: null }))
};

vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'trainer-id', email: 'trainer@example.com' } } }),
            getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'trainer-id', email: 'trainer@example.com' } } } }),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
        },
        from: vi.fn(() => mockQueryBuilder)
    }
}))

// Mock Recharts to avoid sizing issues in JSDOM
vi.mock('recharts', async () => {
    const Original = await vi.importActual('recharts')
    return {
        ...Original,
        ResponsiveContainer: ({ children }) => <div style={{ width: 500, height: 300 }}>{children}</div>
    }
})

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { retry: false }
    }
})

describe('TrainerDashboard v2', () => {
    it('renders without crashing', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <BrowserRouter>
                        <TrainerDashboard />
                    </BrowserRouter>
                </AuthProvider>
            </QueryClientProvider>
        )
        await waitFor(() => {
            expect(screen.getByText(/Panel de Entrenador/i)).toBeInTheDocument()
        })
    })

    it('displays the new stats cards', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <BrowserRouter>
                        <TrainerDashboard />
                    </BrowserRouter>
                </AuthProvider>
            </QueryClientProvider>
        )
        // Check for new stats labels
        await waitFor(() => {
            expect(screen.getByText(/Volumen Semanal/i)).toBeInTheDocument()
            expect(screen.getByText(/Clientes Activos/i)).toBeInTheDocument()
        })
    })
})
