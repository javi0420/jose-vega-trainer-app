import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WorkoutDetail from '../pages/WorkoutDetail'
import { supabase } from '../lib/supabase' // This will be mocked

// Mock Supabase
vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
        auth: { getUser: vi.fn() }
    }
}))

// Mock Child Components
vi.mock('../components/ExerciseChart', () => ({
    default: () => <div data-testid="exercise-chart">Mock Chart</div>
}))

// Mock Data
const mockSupersetWorkout = {
    id: 'w-123',
    name: 'Superset Leg Day',
    created_at: '2023-01-01T10:00:00Z',
    user_id: 'u-1',
    profiles: { full_name: 'Test Athlete', avatar_url: null },
    workout_blocks: [
        {
            id: 'b-1',
            order_index: 0,
            block_exercises: [
                {
                    id: 'be-1',
                    position: 'A',
                    exercises: { id: 'ex-1', name: 'Sentadilla', muscle_group: 'legs' },
                    sets: [{ id: 's-1', weight: 100, reps: 5, completed: true }]
                },
                {
                    id: 'be-2',
                    position: 'B',
                    exercises: { id: 'ex-2', name: 'Extensiones', muscle_group: 'legs' },
                    sets: [{ id: 's-2', weight: 50, reps: 12, completed: true }]
                }
            ]
        }
    ]
}

const renderWithClient = (ui) => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
    })
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/workout/w-123']}>
                <Routes>
                    <Route path="/workout/:id" element={ui} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    )
}

describe('WorkoutDetail', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders a superset correctly (multiple exercises)', async () => {
        // Setup Mock Response
        const selectMock = vi.fn().mockReturnThis()
        const eqMock = vi.fn().mockReturnThis()
        const singleMock = vi.fn().mockResolvedValue({ data: mockSupersetWorkout, error: null })

        supabase.from.mockReturnValue({
            select: selectMock,
            eq: eqMock,
            single: singleMock
        })

        renderWithClient(<WorkoutDetail />)

        // Wait for loading to finish
        // Spinner is present but has no text, so we wait for content directly

        await waitFor(() => expect(screen.getByText('Superset Leg Day')).toBeInTheDocument())

        // 1. Verify Header
        expect(screen.getByText('Superset Leg Day')).toBeInTheDocument()
        expect(screen.getByText('Test Athlete')).toBeInTheDocument()

        // 2. Verify Superset Badge
        expect(screen.getByText('Superset')).toBeInTheDocument()

        // 3. Verify Both Exercises are shown
        expect(screen.getByText('Sentadilla')).toBeInTheDocument()
        expect(screen.getByText('Extensiones')).toBeInTheDocument()

        // Verify Positions
        expect(screen.getByText('A')).toBeInTheDocument()
        expect(screen.getByText('B')).toBeInTheDocument()
    })
})
