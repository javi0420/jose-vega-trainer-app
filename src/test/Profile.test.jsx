import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import Profile from '../pages/Profile'
import { useAuth } from '../context/AuthContext'
import { useUserRole } from '../hooks/useUserRole'
import { supabase } from '../lib/supabase'
import { MemoryRouter } from 'react-router-dom'

// Mocks
vi.mock('../context/AuthContext')
vi.mock('../hooks/useUserRole')
vi.mock('../lib/supabase') // We need to mock supabase.from and supabase.auth.updateUser

describe('Profile Page', () => {
    const mockUnsubscribe = vi.fn()
    const mockSignOut = vi.fn()
    const mockRefetch = vi.fn()

    const mockUser = { id: 'user-123', email: 'test@example.com' }
    const mockProfile = { id: 'user-123', full_name: 'Juan Test', role: 'client', avatar_url: null }

    beforeEach(() => {
        vi.clearAllMocks()

        // Mock Auth Context
        useAuth.mockReturnValue({
            user: mockUser,
            signOut: mockSignOut
        })

        // Mock User Role Hook
        useUserRole.mockReturnValue({
            data: mockProfile,
            isLoading: false,
            refetch: mockRefetch
        })

        // Mock Supabase calls specifically for this page
        supabase.auth = {
            updateUser: vi.fn(),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: mockUnsubscribe } } }))
        }

        supabase.from = vi.fn(() => ({
            update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null })
            })),
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
                }))
            }))
        }))

        window.alert = vi.fn()
    })

    const renderComponent = () => {
        render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        )
    }

    test('renders user information', () => {
        renderComponent()
        expect(screen.getByText('Juan Test')).toBeDefined()
        expect(screen.getByText('Cliente')).toBeDefined()
        expect(screen.getByText('test@example.com')).toBeDefined()
    })

    test('updates name', async () => {
        renderComponent()
        const nameInput = screen.getByDisplayValue('Juan Test')
        fireEvent.change(nameInput, { target: { value: 'Juan Actualizado' } })

        const saveBtn = screen.getByText('Guardar Cambios')
        fireEvent.click(saveBtn)

        await waitFor(() => {
            // Check if Supabase update was called correctly
            // We need to verify that we updated 'profiles' table with new name
            expect(supabase.from).toHaveBeenCalledWith('profiles')
        })

        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('actualizado'))
        expect(mockRefetch).toHaveBeenCalled()
    })

    test('changes password', async () => {
        // Setup mock for updateUser success
        supabase.auth.updateUser.mockResolvedValue({ error: null })

        renderComponent()
        const passWrappers = screen.getAllByPlaceholderText('••••••••')
        const passInput = passWrappers[0]
        const confirmInput = passWrappers[1]

        fireEvent.change(passInput, { target: { value: 'newpassword123' } })
        fireEvent.change(confirmInput, { target: { value: 'newpassword123' } })

        const updateBtn = screen.getByText('Actualizar Contraseña')
        fireEvent.click(updateBtn)

        await waitFor(() => {
            expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newpassword123' })
        })

        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('éxito'))
    })

    test('validates password mismatch', async () => {
        renderComponent()
        const passWrappers = screen.getAllByPlaceholderText('••••••••')
        const passInput = passWrappers[0]
        const confirmInput = passWrappers[1]

        fireEvent.change(passInput, { target: { value: '123' } })
        fireEvent.change(confirmInput, { target: { value: '456' } })

        const updateBtn = screen.getByText('Actualizar Contraseña')
        fireEvent.click(updateBtn)

        await waitFor(() => {
            expect(supabase.auth.updateUser).not.toHaveBeenCalled()
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('coinciden'))
        })
    })
})
