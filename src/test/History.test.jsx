import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import History from '../pages/History'
import { useRecentWorkouts } from '../hooks/useWorkouts'
import { MemoryRouter } from 'react-router-dom'

// Mock hooks
vi.mock('../hooks/useWorkouts')
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

describe('History Page', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('renders loading state', () => {
        useRecentWorkouts.mockReturnValue({
            data: null,
            isLoading: true
        })

        render(<MemoryRouter><History /></MemoryRouter>)

        // Check for pulse animation elements (by class or structure)
        // Since we don't have text for loading, we check if workout items are NOT present
        expect(screen.queryByText('Sin historial')).toBeNull()
    })

    test('renders workout list', () => {
        const mockWorkouts = [
            { id: '1', name: 'Entreno A', date: new Date().toISOString(), status: 'completed' },
            { id: '2', name: 'Entreno B', date: new Date().toISOString(), status: 'completed' }
        ]

        useRecentWorkouts.mockReturnValue({
            data: mockWorkouts,
            isLoading: false
        })

        render(<MemoryRouter><History /></MemoryRouter>)

        expect(screen.getByText('Entreno A')).toBeDefined()
        expect(screen.getByText('Entreno B')).toBeDefined()
        expect(screen.getAllByText('Completado')).toHaveLength(2)
    })

    test('renders empty state', () => {
        useRecentWorkouts.mockReturnValue({
            data: [],
            isLoading: false
        })

        render(<MemoryRouter><History /></MemoryRouter>)

        expect(screen.getByText('Sin historial')).toBeDefined()
        expect(screen.getByText('Completa tu primer entreno para verlo aquí.')).toBeDefined()
    })

    test('navigates back on back button click', () => {
        useRecentWorkouts.mockReturnValue({ data: [], isLoading: false })
        render(<MemoryRouter><History /></MemoryRouter>)

        // Select the back button (it's the first button in header)
        const backButton = screen.getAllByRole('button')[0]
        fireEvent.click(backButton)

        expect(mockNavigate).toHaveBeenCalledWith(-1)
    })

    test('navigates to workout detail on item click', () => {
        const mockWorkouts = [
            { id: '123', name: 'Click Me', date: new Date().toISOString(), status: 'completed' }
        ]

        useRecentWorkouts.mockReturnValue({
            data: mockWorkouts,
            isLoading: false
        })

        render(<MemoryRouter><History /></MemoryRouter>)

        const workoutItem = screen.getByText('Click Me').closest('div.group')
        fireEvent.click(workoutItem)

        expect(mockNavigate).toHaveBeenCalledWith('/app/workout/123')
    })
})
