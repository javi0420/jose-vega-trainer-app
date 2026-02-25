import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WorkoutEditor from '../pages/WorkoutEditor'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ActiveWorkoutProvider } from '../context/ActiveWorkoutContext'
import { TimerProvider } from '../context/TimerContext'

// COMPREHENSIVE MOCKS
vi.mock('../hooks/useExercises', () => ({
    useExercises: () => ({
        exercises: [{ id: 'new-ex-id', name: 'Nuevo Ejercicio', muscle_group: 'Piernas' }],
        isLoading: false,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false
    })
}))

vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } } })),
            getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: 'test-user' } } } })),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
        },
        rpc: vi.fn(),
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ data: null, error: null }))
                })),
                order: vi.fn(() => ({
                    range: vi.fn(() => Promise.resolve({ data: [], count: 0 }))
                }))
            }))
        }))
    }
}))

// Mock window.scrollTo since it's not implemented in JSDOM
window.scrollTo = vi.fn()

describe('Exercise Replacement Integrity', () => {
    it('preserves sets when an exercise is replaced', async () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <ActiveWorkoutProvider>
                        <TimerProvider>
                            <WorkoutEditor />
                        </TimerProvider>
                    </ActiveWorkoutProvider>
                </AuthProvider>
            </BrowserRouter>
        )

        // 1. Add an initial exercise
        const addBtn = await screen.findByTestId('btn-add-block')
        fireEvent.click(addBtn)

        const exerciseItem = await screen.findByTestId('exercise-item-new-ex-id')
        fireEvent.click(exerciseItem)

        // 2. Fill some data in the first set
        const weightInput = await screen.findByTestId('workout-input-weight')
        const repsInput = await screen.findByTestId('workout-input-reps')
        const completeBtn = await screen.findByTestId('workout-btn-complete-set')

        fireEvent.change(weightInput, { target: { value: '100' } })
        fireEvent.change(repsInput, { target: { value: '10' } })
        fireEvent.click(completeBtn)

        // 3. Open Kebab Menu and Click "Cambiar ejercicio"
        const kebab = await screen.findByTestId(/^exercise-kebab-menu-/)
        fireEvent.click(kebab)

        const changeBtn = await screen.findByTestId('btn-change-exercise')
        fireEvent.click(changeBtn)

        // 4. Select the "new" exercise from the Replace modal
        const replaceItem = await screen.findByTestId('replace-exercise-item-new-ex-id')
        fireEvent.click(replaceItem)

        // 5. ASSERTIONS: Name changed, but sets preserved
        await waitFor(() => {
            const weightAfter = screen.getByTestId('workout-input-weight')
            expect(weightAfter.value).toBe('100')
            const repsAfter = screen.getByTestId('workout-input-reps')
            expect(repsAfter.value).toBe('10')
            expect(screen.getByTestId('workout-btn-complete-set')).toHaveClass(/bg-gold-500/)
        })
    })
})
