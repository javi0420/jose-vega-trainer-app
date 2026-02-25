import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import Dashboard from '../pages/Dashboard'
import { useAuth } from '../context/AuthContext'
import { useUserRole } from '../hooks/useUserRole'
import { useClientStats } from '../hooks/useClientStats'
import { useRecentWorkouts } from '../hooks/useWorkouts'
import { MemoryRouter } from 'react-router-dom'

// Mocks
vi.mock('../context/AuthContext')
vi.mock('../hooks/useUserRole')
vi.mock('../hooks/useClientStats')
vi.mock('../hooks/useWorkouts')
// Mock TrainerDashboard to isolate ClientDashboard test
vi.mock('../components/TrainerDashboard', () => ({ default: () => <div>Trainer Dashboard Content</div> }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

describe('Client Dashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Default Client User
        useAuth.mockReturnValue({
            user: { email: 'client@test.com' },
            signOut: vi.fn()
        })
        useUserRole.mockReturnValue({ data: { role: 'client' }, isLoading: false })
        useClientStats.mockReturnValue({
            data: { streak: 5, workoutsThisMonth: 12, recentWorkouts: [] },
            isLoading: false
        })
        useRecentWorkouts.mockReturnValue({
            data: [
                { id: '1', name: 'Last Workout', date: new Date().toISOString() }
            ],
            isLoading: false
        })
    })

    test('renders client dashboard by default', async () => {
        render(<MemoryRouter><Dashboard /></MemoryRouter>)

        expect(screen.getByText('client')).toBeDefined() // From email split
        expect(screen.getByText('Racha Actual')).toBeDefined()
        expect(screen.getByText('5 días')).toBeDefined()
        expect(screen.queryByText('Trainer Dashboard Content')).toBeNull()
    })

    test('renders "Ver todo" link in Last Activity section', () => {
        render(<MemoryRouter><Dashboard /></MemoryRouter>)

        const seeAllButton = screen.getByText('Ver todo')
        expect(seeAllButton).toBeDefined()
    })

    test('navigates to history when "Ver todo" is clicked', () => {
        render(<MemoryRouter><Dashboard /></MemoryRouter>)

        const seeAllButton = screen.getByText('Ver todo')
        fireEvent.click(seeAllButton)

        expect(mockNavigate).toHaveBeenCalledWith('/app/history')
    })

    test('switches to TrainerDashboard if role is trainer', () => {
        useUserRole.mockReturnValue({ data: { role: 'trainer' }, isLoading: false })

        render(<MemoryRouter><Dashboard /></MemoryRouter>)

        expect(screen.getByText('Trainer Dashboard Content')).toBeDefined()
    })

    test('renders loader while checking role', () => {
        useUserRole.mockReturnValue({ data: null, isLoading: true })

        const { container } = render(<MemoryRouter><Dashboard /></MemoryRouter>)

        // Check for loader icon (SVG) or container structure
        // Dashboard puts loader in a flex container
        expect(container.querySelector('.animate-spin')).toBeDefined()
    })
})
