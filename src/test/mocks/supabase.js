import { vi } from 'vitest'

// Mock de la instancia de Supabase
export const supabase = {
    auth: {
        getUser: vi.fn(),
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
    },
    from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn(),
        maybeSingle: vi.fn(),
    })),
}

// Resetear mocks antes de cada test (opcional, pero recomendado manejarlo en setup)
export const resetMocks = () => {
    vi.clearAllMocks()
    /* Configurar defaults si es necesario */
}
