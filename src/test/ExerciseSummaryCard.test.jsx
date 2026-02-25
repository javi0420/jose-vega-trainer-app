import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ExerciseSummaryCard from '../components/summary/ExerciseSummaryCard.jsx'

describe('ExerciseSummaryCard', () => {
    const mockExercise = {
        name: 'Bench Press',
        muscle_group: 'chest'
    }

    it('renders correctly with valid sets', () => {
        const sets = [
            { id: 1, weight: 100, reps: 5, completed: true },
            { id: 2, weight: 100, reps: 3, completed: true }
        ]

        render(<ExerciseSummaryCard exercise={mockExercise} sets={sets} />)

        expect(screen.getByText('Bench Press')).toBeDefined()
        expect(screen.getByText('chest')).toBeDefined()
        expect(screen.getByText(/100kg . 5/)).toBeDefined() // Best set (flexible for × or x)
        expect(screen.getByText(/800/)).toBeDefined() // Total volume
    })

    it('calculates 1RM correctly (Epley formula)', () => {
        // 100kg x 30 reps -> 100 * (1 + 30/30) = 200
        const sets = [{ id: 1, weight: 100, reps: 30, completed: true }]
        render(<ExerciseSummaryCard exercise={mockExercise} sets={sets} />)
        expect(screen.getByText('Est. 1RM: 200kg')).toBeDefined()
    })

    it('prioritizes Weight over 1RM for "Best Set" selection', () => {
        // Set A: 100kg x 2 (1RM ~106.6)
        // Set B: 90kg x 12 (1RM ~126) -> Higher 1RM, but lower weight
        const sets = [
            { id: 1, weight: 100, reps: 2, completed: true },
            { id: 2, weight: 90, reps: 12, completed: true }
        ]

        render(<ExerciseSummaryCard exercise={mockExercise} sets={sets} />)

        // It should pick 100kg as Best Set because Weight is King
        const bestSetValue = screen.getByTestId('summary-best-set-value')
        expect(bestSetValue.textContent).toContain('100kg')
        expect(bestSetValue.textContent).toContain('2')
    })

    it('ignores incomplete sets (Negative Case)', () => {
        const sets = [
            { id: 1, weight: 100, reps: 5, completed: false }, // Should be ignored
            { id: 2, weight: 50, reps: 10, completed: true } // Should be best
        ]
        render(<ExerciseSummaryCard exercise={mockExercise} sets={sets} />)
        const bestSetValue = screen.getByTestId('summary-best-set-value')
        expect(bestSetValue.textContent).toContain('50kg')
        expect(bestSetValue.textContent).toContain('10')
    })

    it('handles empty or zero sets (Negative Case)', () => {
        const sets = [
            { id: 1, weight: 0, reps: 0, completed: true }
        ]
        const { container } = render(<ExerciseSummaryCard exercise={mockExercise} sets={sets} />)
        expect(container.firstChild).toBeNull() // Should return null
    })
})
