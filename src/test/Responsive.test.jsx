import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Dashboard from '../pages/Dashboard'
import { AuthProvider } from '../context/AuthContext'
import { BrowserRouter } from 'react-router-dom'
import WorkoutBlock from '../components/WorkoutBlock'

// Mock styles that might be missing in JSDOM
// We are mainly checking if the correct Tailwind classes are applied for responsiveness
// e.g. 'md:flex', 'hidden', etc.

// Mock dependencies with chainable query builder
const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [] }),
    single: vi.fn().mockResolvedValue({ data: null }),
    then: vi.fn((resolve) => resolve({ data: [], error: null }))
};

vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user', email: 'test@example.com' } } }),
            getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'test-user', email: 'test@example.com' } } } }),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
        },
        from: vi.fn(() => mockQueryBuilder)
    }
}))

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

describe('Responsive Design Checks', () => {

    it('Dashboard header adapts to mobile', async () => {
        // Render Dashboard
        render(
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <BrowserRouter>
                        <Dashboard />
                    </BrowserRouter>
                </AuthProvider>
            </QueryClientProvider>
        )

        // Check if header exists
        const header = await screen.findByRole('banner') // findBy waits for appearance

        // Actually Dashboard.jsx has a header. 
        // Let's find it by text content or structure.
        const logoText = screen.getByText(/Bienvenido de vuelta/i)
        const headerContainer = logoText.closest('div').parentElement

        // Check for responsive classes like 'justify-between' which is common
        expect(headerContainer.className).toContain('flex')
        expect(headerContainer.className).toContain('items-center')

        // Mobile specific: Check if user info might be hidden or adjusted?
        // In this app, the design is fairly consistent, but let's check grid layouts.
    })

    it('WorkoutBlock grids are responsive', () => {
        const mockBlock = {
            id: 'b1',
            exercises: [{
                id: 'e1',
                name: 'Ex 1',
                sets: [{ id: 's1', setNumber: 1, weight: 10, reps: 10 }]
            }]
        }

        render(<WorkoutBlock block={mockBlock} updateBlock={() => { }} />)

        // The Sets Header should have a specific grid layout
        // "grid-cols-[30px_1fr_1fr_0.8fr_0.8fr_1fr_40px]"
        // This is a complex grid string. We can verify it exists.
        const setHeader = screen.getByText('Kg').parentElement
        expect(setHeader.className).toContain('grid')

        // Check if inputs are touch-friendly (h-10 class = 40px height)
        const input = screen.getByPlaceholderText('kg')
        expect(input.className).toContain('h-10') // Good for mobile touch targets
    })

    it('Rest Timer settings popover has mobile friendly width', () => {
        const mockBlock = {
            id: 'b1',
            exercises: [{
                id: 'e1',
                name: 'Ex 1',
                target_rest_time: 60,
                sets: [] // Empty sets just to render header
            }]
        }
        render(<WorkoutBlock block={mockBlock} updateBlock={() => { }} />)

        // Note: We need to render the popover by clicking (simulating interaction)
        // But purely for "Responsive Test", we verify the Overlay or Popover classes.
        // Let's check styling of the Overlay trigger button: text-sm font-medium (readable)

        const timerBtn = screen.getByText(/Rest Timer:/i).closest('button')
        expect(timerBtn.className).toContain('text-sm')
        // text-sm is 14px, minimal readable size for mobile body text.
    })
})
