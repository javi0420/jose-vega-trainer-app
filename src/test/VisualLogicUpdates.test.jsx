import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import WorkoutEditor from '../pages/WorkoutEditor'
import { AuthContext } from '../context/AuthContext'
import { ActiveWorkoutProvider } from '../context/ActiveWorkoutContext' // Real Provider
import { BrowserRouter } from 'react-router-dom'

// Mocks
vi.mock('../hooks/useExercises', () => ({
    useExercises: () => ({
        data: [
            { id: 'ex-1', name: 'Press Banca', muscle_group: 'pecho' }
        ],
        isLoading: false,
        createExercise: { mutateAsync: vi.fn() }
    })
}))

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
    value: {
        randomUUID: () => 'uuid-' + Math.random().toString(36).substr(2, 9)
    }
});

// Mock LocalStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value.toString(); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });


const renderWithProviders = (ui) => {
    return render(
        <AuthContext.Provider value={{ user: { id: 'test-user' } }}>
            <ActiveWorkoutProvider>
                <BrowserRouter>
                    {ui}
                </BrowserRouter>
            </ActiveWorkoutProvider>
        </AuthContext.Provider>
    )
}

describe('Visual & Logic Updates', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.clear()
    })

    it('shows updated button labels (Visuals)', () => {
        renderWithProviders(<WorkoutEditor />)

        // "Finalizar" instead of "Guardar"
        expect(screen.getByText('Finalizar')).toBeInTheDocument()

        // "Añadir Ejercicio" text in FAB
        const fab = screen.getByLabelText('Añadir ejercicio')
        expect(fab).toHaveTextContent('Añadir Ejercicio')
        expect(fab).toHaveClass('px-6') // Check for pill shape padding
    })

    it('supports adding Ad-hoc exercises (Logic)', async () => {
        renderWithProviders(<WorkoutEditor />)

        // Open Modal
        fireEvent.click(screen.getByLabelText('Añadir ejercicio'))

        // Type non-existent exercise
        const searchInput = screen.getByPlaceholderText('Buscar ejercicio...')
        fireEvent.change(searchInput, { target: { value: 'Ejercicio Inventado' } })

        // Check for "Usar ... (Solo este entreno)" button
        const adHocBtn = await screen.findByText((content, element) => {
            return content.includes('Usar "Ejercicio Inventado"') && content.includes('(Solo este entreno)')
        })
        expect(adHocBtn).toBeInTheDocument()

        // Click it
        fireEvent.click(adHocBtn)

        // Verify it is added to the editor
        expect(screen.getByText('Ejercicio Inventado')).toBeInTheDocument()
        // Verify it's effectively an ad-hoc (no link to logic here, but UI shows it)
    })

    it('persists draft to localStorage (Persistence)', async () => {
        const { unmount } = renderWithProviders(<WorkoutEditor />)

        // Add an exercise
        fireEvent.click(screen.getByLabelText('Añadir ejercicio'))
        fireEvent.click(screen.getByText('Press Banca'))

        expect(screen.getByText('Press Banca')).toBeInTheDocument()

        // Unmount (simulating leaving page)
        unmount()

        // Check LocalStorage
        const saved = localStorage.getItem('draft_workout')
        expect(saved).not.toBeNull()
        expect(JSON.parse(saved).blocks).toHaveLength(1)

        // Re-render
        renderWithProviders(<WorkoutEditor />)

        // Should auto-load
        expect(screen.getByText('Press Banca')).toBeInTheDocument()
    })
})
