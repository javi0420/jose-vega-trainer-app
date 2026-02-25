import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import WorkoutBlock from '../components/WorkoutBlock'
import { TimerProvider } from '../context/TimerContext'

// Mock Supabase with chainable query builder
const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [] }),
    single: vi.fn().mockResolvedValue({ data: null })
};

vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } })
        },
        from: vi.fn(() => mockQueryBuilder)
    }
}))

// Mock TimerContext properly to spy on startTimer
const startTimerMock = vi.fn()
vi.mock('../context/TimerContext', async () => {
    const actual = await vi.importActual('../context/TimerContext')
    return {
        ...actual,
        useTimer: () => ({
            startTimer: startTimerMock,
            timeLeft: 0,
            isActive: false
        })
    }
})

describe('WorkoutBlock - Timer Integration', () => {
    const mockUpdateBlock = vi.fn()
    const mockBlock = {
        id: 'block-1',
        exercises: [{
            id: 'ex-1',
            name: 'Press Banca',
            muscle_group: 'Pecho',
            target_rest_time: 120, // 2 minutes
            sets: [
                { id: 'set-1', setNumber: 1, weight: 100, reps: 10, completed: false, rest_seconds: '' },
                { id: 'set-2', setNumber: 2, weight: 100, reps: 10, completed: false, rest_seconds: '' }
            ]
        }]
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('displays the configured rest time in the header', () => {
        render(
            <TimerProvider>
                <WorkoutBlock block={mockBlock} updateBlock={mockUpdateBlock} />
            </TimerProvider>
        )
        // Should show "Descanso: 2m 0s"
        expect(screen.getByText(/Descanso: 2m 0s/i)).toBeDefined()
    })

    it('opens timer settings popover on click', () => {
        render(
            <TimerProvider>
                <WorkoutBlock block={mockBlock} updateBlock={mockUpdateBlock} />
            </TimerProvider>
        )

        const timerBtn = screen.getByText(/Descanso:/i)
        fireEvent.click(timerBtn)

        // Check for popover content
        expect(screen.getByText('Configurar Descanso')).toBeDefined()
        expect(screen.getByText('Iniciar Timer')).toBeDefined()
    })

    it('updates target_rest_time when preset is clicked', () => {
        render(
            <TimerProvider>
                <WorkoutBlock block={mockBlock} updateBlock={mockUpdateBlock} />
            </TimerProvider>
        )

        // Open popover
        fireEvent.click(screen.getByText(/Descanso:/i))

        // Click "60s" or "1m" preset (logic: 60 >= 60 ? 1m)
        const preset60 = screen.getByText('1m')
        fireEvent.click(preset60)

        // Verify updateBlock was called with new time
        expect(mockUpdateBlock).toHaveBeenCalled()
        const updatedBlock = mockUpdateBlock.mock.calls[0][1]
        expect(updatedBlock.exercises[0].target_rest_time).toBe(60)
    })

    it('activates timer manually via "Iniciar Timer" button', () => {
        render(
            <TimerProvider>
                <WorkoutBlock block={mockBlock} updateBlock={mockUpdateBlock} />
            </TimerProvider>
        )

        // Open popover
        fireEvent.click(screen.getByText(/Descanso:/i))

        // Click Start
        const startBtn = screen.getByText('Iniciar Timer')
        fireEvent.click(startBtn)

        expect(startTimerMock).toHaveBeenCalledWith(120) // Original configured time
    })

    it('activates timer automatically when set is completed (Last set logic)', async () => {
        // Needs a bit more complex setup for the "LastExercise" check
        // In this case we only have 1 exercise so it IS the last exercise.

        render(
            <TimerProvider>
                <WorkoutBlock block={mockBlock} updateBlock={mockUpdateBlock} />
            </TimerProvider>
        )

        // Find the "Check" button for the first set
        // The check button is inside a container. We can look for the button containing the Check icon.
        // Or simpler: getAllByRole('button') and filter/index. 
        // Best approach: add aria-label or testid in implementation, but for now rely on structure.
        // It's the check button at the end of the row.

        const buttons = screen.getAllByRole('button')
        // We know the structure: removeSet(x2), toggleComplete(x2)
        // Actually, let's use the container class logic or just assume the last but one is the check.
        // Let's modify component to add testId or find by icon SVG class?
        // Simpler: The check button changes style based on 'completed'.

        // Let's rely on finding standard buttons. Actually, adding a data-testid to the check button in real code is best practice, 
        // but I can't modify code just for this without user request (well, I can, user asked for tests).
        // I'll try to find by locating the row.

        // Find the "Check" button for the first set using data-testid
        const checkBtns = screen.getAllByTestId('workout-btn-complete-set')
        fireEvent.click(checkBtns[0])

        // Check if startTimer was called
        // Default rest is 120s
        expect(startTimerMock).toHaveBeenCalledWith(120)
    })
})
