import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TrainerDashboard from '../components/TrainerDashboard'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

// --- MOCKS ---

const mockClients = [
    { id: 'client-1', full_name: 'Juan Torres', email: 'juan@test.com', avatar_url: null }
]

vi.mock('../hooks/useClients', () => ({
    useClients: () => ({
        data: mockClients,
        isLoading: false
    })
}))

vi.mock('../hooks/useTrainerActivity', () => ({
    useTrainerActivity: () => ({ data: [], isLoading: false })
}))

vi.mock('../hooks/useTrainerStats', () => ({
    useTrainerStats: () => ({ data: { activeClients: 1, weeklyVolume: 5000, pendingReviews: 2 }, isLoading: false })
}))

vi.mock('../hooks/useUserRole', () => ({
    useUserRole: () => ({ data: { role: 'trainer', full_name: 'Coach Test' }, isLoading: false })
}))

vi.mock('../context/AuthContext', () => ({
    AuthProvider: ({ children }) => <div>{children}</div>,
    useAuth: () => ({
        user: { id: 'trainer-123', email: 'trainer@test.com' },
        signOut: vi.fn()
    })
}))

const mockMutations = {
    createClient: { mutateAsync: vi.fn(), isPending: false },
    updateClient: { mutateAsync: vi.fn(), isPending: false },
    unlinkClient: { mutateAsync: vi.fn(), isPending: false },
    deleteClientPermanently: { mutateAsync: vi.fn(), isPending: false }
}

vi.mock('../hooks/useManageClients', () => ({
    useManageClients: () => mockMutations
}))

const wrapper = ({ children }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <BrowserRouter>
            {children}
        </BrowserRouter>
    </QueryClientProvider>
)

// --- TESTS ---

describe('TrainerDashboard - Gestión de Clientes', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    })

    it('debe abrir el modal para Crear un nuevo cliente', async () => {
        mockMutations.createClient.mutateAsync.mockResolvedValue({ id: 'new-id' })
        render(<TrainerDashboard />, { wrapper })

        const addButton = await screen.findByTitle('Añadir Cliente')
        fireEvent.click(addButton)

        expect(await screen.findByText('Nuevo Cliente')).toBeDefined()

        fireEvent.change(screen.getByPlaceholderText('Ej: Juan Pérez'), { target: { value: 'Nuevo Client' } })
        fireEvent.change(screen.getByPlaceholderText('ejemplo@email.com'), { target: { value: 'nuevo@test.com' } })

        const submitBtn = screen.getByText('Crear Cliente')
        fireEvent.click(submitBtn)

        expect(mockMutations.createClient.mutateAsync).toHaveBeenCalledWith({
            fullName: 'Nuevo Client',
            email: 'nuevo@test.com'
        })
    })

    it('debe abrir el modal para Editar un cliente existente', async () => {
        mockMutations.updateClient.mutateAsync.mockResolvedValue({})
        render(<TrainerDashboard />, { wrapper })

        // El botón ahora tiene aria-label (agregado en el paso anterior)
        const editBtn = await screen.findByLabelText('Editar Juan Torres')
        fireEvent.click(editBtn)

        expect(await screen.findByText('Editar Cliente')).toBeDefined()

        fireEvent.change(screen.getByPlaceholderText('Ej: Juan Pérez'), { target: { value: 'Juan Torres Editado' } })
        fireEvent.click(screen.getByText('Guardar Cambios'))

        expect(mockMutations.updateClient.mutateAsync).toHaveBeenCalledWith({
            id: 'client-1',
            fullName: 'Juan Torres Editado',
            email: 'juan@test.com'
        })
    })

    it('debe filtrar la lista de clientes al escribir en el buscador', async () => {
        render(<TrainerDashboard />, { wrapper })

        const searchInput = screen.getByPlaceholderText('Buscar cliente...')

        // Inicialmente se ve Juan
        expect(screen.getByText('Juan Torres')).toBeDefined()

        // Filtrar por algo que NO exista
        fireEvent.change(searchInput, { target: { value: 'Inexistente' } })
        expect(screen.queryByText('Juan Torres')).toBeNull()

        // Filtrar por Juan de nuevo
        fireEvent.change(searchInput, { target: { value: 'Juan' } })
        expect(screen.getByText('Juan Torres')).toBeDefined()
    })

    it('debe mostrar un mensaje de alerta si hay un error al crear un cliente', async () => {
        const errorMessage = 'Error de servidor'
        mockMutations.createClient.mutateAsync.mockRejectedValue(new Error(errorMessage))
        vi.stubGlobal('alert', vi.fn())

        render(<TrainerDashboard />, { wrapper })

        const addButton = await screen.findByTitle('Añadir Cliente')
        fireEvent.click(addButton)

        fireEvent.change(screen.getByPlaceholderText('Ej: Juan Pérez'), { target: { value: 'Error Test' } })
        fireEvent.change(screen.getByPlaceholderText('ejemplo@email.com'), { target: { value: 'error@test.com' } })

        fireEvent.click(screen.getByText('Crear Cliente'))

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith(errorMessage)
        })
    })

    it('debe llamar a unlinkClient al desvincular sin borrado permanente', async () => {
        mockMutations.unlinkClient.mutateAsync.mockResolvedValue({})
        render(<TrainerDashboard />, { wrapper })

        const deleteBtn = await screen.findByLabelText('Eliminar Juan Torres')

        // Mocking double confirmation: 1st true (confirm unlink), 2nd false (no hard delete)
        window.confirm.mockReturnValueOnce(true).mockReturnValueOnce(false)

        fireEvent.click(deleteBtn)

        expect(window.confirm).toHaveBeenCalledTimes(2)
        expect(mockMutations.unlinkClient.mutateAsync).toHaveBeenCalledWith('client-1')
        expect(mockMutations.deleteClientPermanently.mutateAsync).not.toHaveBeenCalled()
    })

    it('debe llamar a deleteClientPermanently al confirmar borrado total', async () => {
        mockMutations.deleteClientPermanently.mutateAsync.mockResolvedValue({})
        render(<TrainerDashboard />, { wrapper })

        const deleteBtn = await screen.findByLabelText('Eliminar Juan Torres')

        // Mocking double confirmation: 1st true (confirm unlink), 2nd true (confirm hard delete)
        window.confirm.mockReturnValueOnce(true).mockReturnValueOnce(true)

        fireEvent.click(deleteBtn)

        expect(window.confirm).toHaveBeenCalledTimes(2)
        expect(mockMutations.deleteClientPermanently.mutateAsync).toHaveBeenCalledWith('client-1')
        expect(mockMutations.unlinkClient.mutateAsync).not.toHaveBeenCalled()
    })
})
