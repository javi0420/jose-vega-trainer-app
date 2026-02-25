import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ExerciseCatalog from '../components/ExerciseCatalog'
import { useExercises } from '../hooks/useExercises'

// Mock Hooks
vi.mock('../hooks/useExercises')

describe('ExerciseCatalog', () => {
    const mockExercises = [
        { id: '1', name: 'Press Banca', muscle_group: 'pecho', created_by: 'user1' },
        { id: '2', name: 'Sentadilla', muscle_group: 'pierna', created_by: null }
    ]

    const mockCreate = vi.fn()
    const mockUpdate = vi.fn()
    const mockDelete = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        useExercises.mockReturnValue({
            data: mockExercises,
            isLoading: false,
            createExercise: { mutateAsync: mockCreate },
            updateExercise: { mutateAsync: mockUpdate },
            deleteExercise: { mutateAsync: mockDelete }
        })
        // Mock window.confirm
        window.confirm = vi.fn(() => true)
        window.alert = vi.fn()
    })

    test('renders exercise list', () => {
        render(<ExerciseCatalog />)
        expect(screen.getByText('Press Banca')).toBeDefined()
        expect(screen.getByText('Sentadilla')).toBeDefined()
    })

    test('filters exercises ignoring accents', () => {
        render(<ExerciseCatalog />)
        const searchInput = screen.getByPlaceholderText(/Buscar ejercicio/i)

        // Buscar "pierna" debería encontrar "pierna" (aunque no tenga tildes en el mock)
        fireEvent.change(searchInput, { target: { value: 'piérná' } })
        expect(screen.getByText('Sentadilla')).toBeDefined()
        expect(screen.queryByText('Press Banca')).toBeNull()

        // Buscar "sentadilla" con tilde
        fireEvent.change(searchInput, { target: { value: 'sentadillá' } })
        expect(screen.getByText('Sentadilla')).toBeDefined()
    })

    test('opens create modal and submits form', async () => {
        render(<ExerciseCatalog />)

        const createBtn = screen.getByText('Nuevo Ejercicio')
        fireEvent.click(createBtn)

        expect(screen.getByText('Nuevo Ejercicio', { selector: 'h3' })).toBeDefined()

        const nameInput = screen.getByPlaceholderText(/Ej: Press de Banca/i)
        const muscleSelect = screen.getByRole('combobox') // Assuming it's the only select or labeled

        fireEvent.change(nameInput, { target: { value: 'Dominadas' } })
        fireEvent.change(muscleSelect, { target: { value: 'espalda' } })

        const submitBtn = screen.getByText('Crear Ejercicio')
        fireEvent.click(submitBtn)

        await waitFor(() => {
            expect(mockCreate).toHaveBeenCalledWith({
                name: 'Dominadas',
                muscle_group: 'espalda'
            })
        })
    })

    test('deletes exercise', async () => {
        render(<ExerciseCatalog />)

        // Find delete buttons. Assuming there are 2 (one for each exercise)
        // We select the first one
        const deleteBtns = screen.getAllByTitle('Eliminar')
        fireEvent.click(deleteBtns[0])

        expect(window.confirm).toHaveBeenCalled()

        await waitFor(() => {
            expect(mockDelete).toHaveBeenCalledWith('1')
        })
    })

    test('opens edit modal', () => {
        render(<ExerciseCatalog />)

        const editBtns = screen.getAllByTitle('Editar')
        fireEvent.click(editBtns[0])

        expect(screen.getByText('Editar Ejercicio')).toBeDefined()
        expect(screen.getByDisplayValue('Press Banca')).toBeDefined()
    })
})
