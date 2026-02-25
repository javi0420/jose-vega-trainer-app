import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import { AuthContext } from '../context/AuthContext'

const renderWithAuth = (user, initialEntry = '/protected') => {
    return render(
        <AuthContext.Provider value={{ user, loading: false }}>
            <MemoryRouter initialEntries={[initialEntry]}>
                <Routes>
                    <Route path="/" element={<h1>Login Page</h1>} />
                    <Route element={<ProtectedRoute />}>
                        <Route path="/protected" element={<h1>Protected Content</h1>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>
    )
}

describe('ProtectedRoute', () => {
    it('redirects to login if user is null', () => {
        renderWithAuth(null)
        expect(screen.getByText('Login Page')).toBeInTheDocument()
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('renders content if user is present', () => {
        renderWithAuth({ id: 'user-123' })
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
        expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
    })
})
