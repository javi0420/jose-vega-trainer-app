import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ExerciseChart from '../components/ExerciseChart'
import { supabase } from '../lib/supabase'

// Mock Supabase
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn(),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        order: vi.fn(() => ({
                            limit: vi.fn(), // We will mock return value here in tests
                        })),
                    })),
                })),
            })),
        })),
    },
}))

describe('ExerciseChart', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Reset default mock implementation
        supabase.from.mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null })
        }))
    })

    test('renders loading state initially', () => {
        const mockLimit = vi.fn().mockReturnValue(new Promise(() => { }))
        supabase.from.mockImplementation(() => ({
            select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: mockLimit }) }) }) })
        }))

        render(<ExerciseChart exerciseId="123" userId="456" />)
        expect(screen.getByText(/Cargando evolución/i)).toBeDefined()
    })

    test('renders data correctly for weight exercise', async () => {
        const mockData = [
            {
                id: 'be-1',
                sets: [{ weight: 100, reps: 5, completed: true }],
                workout_blocks: {
                    workouts: {
                        id: 'w1',
                        date: '2023-12-01',
                        created_at: '2023-12-01T10:00:00Z',
                        user_id: '456',
                        name: 'Test Workout'
                    }
                }
            }
        ]

        const mockLimit = vi.fn().mockResolvedValue({ data: mockData, error: null })
        supabase.from.mockImplementation(() => ({
            select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: mockLimit }) }) }) })
        }))

        render(<ExerciseChart exerciseId="123" userId="456" />)

        await waitFor(() => {
            expect(screen.queryByText(/Cargando evolución/i)).toBeNull()
        }, { timeout: 3000 })

        const chartContainer = document.querySelector('.recharts-responsive-container')
        expect(chartContainer).toBeDefined()
    })

    test('renders "Registro más reciente" for single record', async () => {
        const mockData = [
            {
                id: 'be-1',
                sets: [{ weight: 120, reps: 5, completed: true }],
                workout_blocks: {
                    workouts: {
                        id: 'w1',
                        date: '2023-12-01',
                        created_at: '2023-12-01T10:00:00Z'
                    }
                }
            }
        ]

        const mockLimit = vi.fn().mockResolvedValue({ data: mockData, error: null })
        supabase.from.mockImplementation(() => ({
            select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: mockLimit }) }) }) })
        }))

        render(<ExerciseChart exerciseId="123" userId="456" />)

        await waitFor(() => {
            expect(screen.getByText(/Registro más reciente/i)).toBeDefined()
            expect(screen.getByText('120')).toBeDefined()
        }, { timeout: 3000 })
    })

    test('renders empty state', async () => {
        const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null })
        supabase.from.mockImplementation(() => ({
            select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: mockLimit }) }) }) })
        }))

        render(<ExerciseChart exerciseId="123" userId="456" />)

        await waitFor(() => {
            expect(screen.getByText(/Sin registros previos/i)).toBeDefined()
        }, { timeout: 3000 })
    })
})
