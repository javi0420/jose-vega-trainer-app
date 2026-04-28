import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ExerciseCatalog from '../components/ExerciseCatalog'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a query client for testing
const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
})

const renderWithProviders = (ui) => {
    return render(
        <QueryClientProvider client={queryClient}>
            {ui}
        </QueryClientProvider>
    )
}

// Mock the hook so we can inject specific exercise states
const mockExercises = [
    {
        id: 'ex-1',
        name: 'Press de Banca',
        body_part: 'pecho',
        target_muscle: 'pectoral',
        equipment: 'barbell',
        gif_url: 'https://example.com/press.gif',
        instructions: ['Step 1', 'Step 2']
    },
    {
        id: 'ex-2',
        name: 'Ejercicio Sin Imagen',
        body_part: 'espalda',
        target_muscle: 'dorsal',
        equipment: 'ninguno',
        gif_url: null,
        instructions: []
    }
]

vi.mock('../hooks/useExercises', () => ({
    useExercises: () => ({
        exercises: mockExercises,
        isLoading: false,
        createExercise: { mutateAsync: vi.fn() },
        updateExercise: { mutateAsync: vi.fn() },
        deleteExercise: { mutateAsync: vi.fn() },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false
    })
}))

describe('ExerciseUI features', () => {

    it('Test de Renderizado de Imagen: renderiza la imagen sin filtros si existe gif_url', () => {
        renderWithProviders(<ExerciseCatalog />)

        // Find the image for "Press de Banca"
        const img = screen.getByAltText('Press de Banca')
        expect(img).toBeInTheDocument()

        // Filter checking has been removed as the UI no longer uses filters on exercise images
    })

    it('Test de Fallback: renderiza el fallback (Dumbbell icon) cuando el ejercicio NO tiene gif_url', () => {
        const { container } = renderWithProviders(<ExerciseCatalog />)

        // Ensure "Ejercicio Sin Imagen" card is present
        expect(screen.getByText('Ejercicio Sin Imagen')).toBeInTheDocument()

        // Because `null` gif_url won't render an img, the image tag count should be exactly 1 (for the first exercise)
        const images = container.querySelectorAll('img')
        expect(images.length).toBe(1)

        // Specifically look for the dumbbell icon inside the card, but since it's an SVG we can check the fallback container
        const cards = screen.getAllByRole('heading', { level: 3 })
        const missingImageCard = Array.from(cards).find(h => h.textContent === 'Ejercicio Sin Imagen').closest('.group')

        // Assert the fallback div is present inside this specific card
        const fallbackDiv = missingImageCard.querySelector('div.bg-gray-800.shrink-0')
        expect(fallbackDiv).toBeInTheDocument()
        expect(fallbackDiv.querySelector('svg')).toBeInTheDocument() // The Dumbbell SVGs
    })

    it('Test de Interacción del Modal: abrir modal de detalles y mostrar titulo e instrucciones', () => {
        renderWithProviders(<ExerciseCatalog />)

        // Ensure modal is closed initially
        expect(screen.queryByText('Step 1')).not.toBeInTheDocument()

        // Click the "Press de Banca" card
        const exerciseText = screen.getByText('Press de Banca')
        fireEvent.click(exerciseText.closest('.cursor-pointer'))

        // Verify Modal Opens and shows Title
        // The modal h2 should appear uppercase
        const modalTitle = screen.getByRole('heading', { level: 2, name: /Press de Banca/i })
        expect(modalTitle).toBeInTheDocument()

        // Verify Instructions section
        expect(screen.getByText('Instrucciones')).toBeInTheDocument()
        expect(screen.getByText('Step 1')).toBeInTheDocument()
        expect(screen.getByText('Step 2')).toBeInTheDocument()
    })
})
