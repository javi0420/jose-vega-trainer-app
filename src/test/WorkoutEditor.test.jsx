import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'

// Mocks for Contexts
const { mockStartTimer, mockStartWorkout, mockDiscardWorkout, mockUser } = vi.hoisted(() => ({
    mockStartTimer: vi.fn(),
    mockStartWorkout: vi.fn(),
    mockDiscardWorkout: vi.fn(),
    mockUser: { id: 'test-user' }
}))

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ user: mockUser, loading: false })
}))

vi.mock('../context/ActiveWorkoutContext', () => ({
    useActiveWorkout: () => ({
        activeWorkoutId: 'draft',
        workoutStartedAt: Date.now(),
        workoutDuration: 0,
        startWorkout: mockStartWorkout,
        discardWorkout: mockDiscardWorkout
    }),
    ActiveWorkoutProvider: ({ children }) => children
}))

vi.mock('../context/TimerContext', () => ({
    useTimer: () => ({
        startTimer: mockStartTimer,
        stopTimer: vi.fn(),
        isActive: false
    }),
    TimerProvider: ({ children }) => children
}))

vi.mock('../hooks/useExercises', () => ({
    useExercises: () => ({
        exercises: [
            { id: 'ex-1', name: 'Press Banca', muscle_group: 'pecho' },
            { id: 'ex-2', name: 'Aperturas', muscle_group: 'pecho' }
        ],
        isLoading: false
    })
}))

// Mock crypto.randomUUID for predictable IDs
let uuidCounter = 0;
vi.stubGlobal('crypto', {
    randomUUID: () => {
        const id = `uuid-${uuidCounter}`;
        uuidCounter++;
        return id;
    }
});

// Component import AFTER mocks
import WorkoutEditor from '../pages/WorkoutEditor'

const renderWithProviders = (ui) => {
    return {
        user: userEvent.setup(),
        ...render(
            <BrowserRouter>
                {ui}
            </BrowserRouter>
        )
    }
}

// describe('WorkoutEditor', ...

describe('WorkoutEditor', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.clear()
        uuidCounter = 0
    })

    it('renders empty state initially', () => {
        renderWithProviders(<WorkoutEditor />)
        expect(screen.getByText('Entrenamiento de Tarde')).toBeInTheDocument()
        expect(screen.getByText('Tu rutina está vacía.')).toBeInTheDocument()
    })

    it('can add an exercise (Single Block)', async () => {
        const { user } = renderWithProviders(<WorkoutEditor />)

        // Open Modal
        const fab = screen.getByTestId('btn-add-block')
        await user.click(fab)

        // Select Exercise from catalogue
        const exerciseBtn = screen.getByTestId('exercise-item-ex-1')
        await user.click(exerciseBtn)

        // Check it is added to the routine
        expect(screen.queryByText('Tu rutina está vacía.')).not.toBeInTheDocument()
        // Here we use queryAllByText or just check it exists in the document
        expect(screen.getAllByText('Press Banca').length).toBeGreaterThan(0)
    })

    it('can create a Superset (Group Exercises)', async () => {
        const { user } = renderWithProviders(<WorkoutEditor />)

        // 1. Add first exercise (creates block uuid-0?)
        const fab = screen.getByTestId('btn-add-block')
        await user.click(fab)
        await user.click(screen.getByTestId('exercise-item-ex-1'))

        // 2. Click "Agrupar Ejercicio" (Superserie) on block uuid-0
        const groupBtn = screen.getByTestId('btn-add-exercise-to-block-uuid-0')
        await user.click(groupBtn)

        // 3. Select second exercise
        await user.click(screen.getByTestId('exercise-item-ex-2'))

        // 4. Verify both are present in routine
        expect(screen.getAllByText('Press Banca').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Aperturas').length).toBeGreaterThan(0)

        // Verify positions (A and B)
        expect(screen.getByText('A')).toBeInTheDocument()
        expect(screen.getByText('B')).toBeInTheDocument()
    })

    it('can remove an exercise from a Superset', async () => {
        const { user } = renderWithProviders(<WorkoutEditor />)

        // Setup: Add Superset (Block uuid-0)
        const fab = screen.getByTestId('btn-add-block')
        await user.click(fab)
        await user.click(screen.getByTestId('exercise-item-ex-1'))
        await user.click(screen.getByTestId('btn-add-exercise-to-block-uuid-0'))
        await user.click(screen.getByTestId('exercise-item-ex-2'))

        // Verify setup
        expect(screen.getAllByText('Aperturas').length).toBeGreaterThan(0)

        // Open Kebab Menu for the second exercise (index 1) in block uuid-0
        const kebab = screen.getByTestId('exercise-kebab-menu-uuid-0-1')
        await user.click(kebab)

        // Remove 'Aperturas' (Position B)
        const removeBtn = await screen.findByText('Eliminar ejercicio')
        await user.click(removeBtn)

        // Verify Removal
        await waitFor(() => {
            expect(screen.queryAllByText('Aperturas').length).toBe(0)
        })
        expect(screen.getAllByText('Press Banca').length).toBeGreaterThan(0)
    })

    it('deletes block if last exercise is removed', async () => {
        const { user } = renderWithProviders(<WorkoutEditor />)

        // Add 1 exercise (Block uuid-0)
        const fab = screen.getByTestId('btn-add-block')
        await user.click(fab)
        await user.click(screen.getByTestId('exercise-item-ex-1'))

        // Open Kebab Menu for the first exercise (index 0) in block uuid-0
        const kebab = screen.getByTestId('exercise-kebab-menu-uuid-0-0')
        await user.click(kebab)

        // Remove it
        const removeBtn = await screen.findByText('Eliminar ejercicio')
        await user.click(removeBtn)

        // Should be empty again
        await waitFor(() => {
            expect(screen.getByText('Tu rutina está vacía.')).toBeInTheDocument()
        })
    })

    it('can set global rest time through header modal', async () => {
        const { user } = renderWithProviders(<WorkoutEditor />)

        // 1. Add an exercise to have a block
        const fab = screen.getByTestId('btn-add-block')
        await user.click(fab)
        await user.click(screen.getByTestId('exercise-item-ex-1'))

        // 2. Click global timer icon in header
        const globalTimerBtn = screen.getByTestId('btn-global-rest')
        await user.click(globalTimerBtn)

        // 3. Verify modal is open (using findBy to wait for transition)
        expect(await screen.findByText('Descanso Global')).toBeInTheDocument()

        // 4. Click a preset (30s)
        const preset30 = screen.getByText('30s')
        await user.click(preset30)

        // 5. Apply
        const applyBtn = screen.getByText('Aplicar a todos')
        await user.click(applyBtn)

        // 6. Verify block update (30s -> 0m 30s)
        expect(screen.getByText(/Descanso: 0m 30s/i)).toBeInTheDocument()
    })
})
