import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LegalModal from '../components/LegalModal';
import { supabase } from '../lib/supabase';

// Mock dependencies
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            signOut: vi.fn(),
        },
        from: vi.fn(),
    },
}));

vi.mock('../hooks/usePrivacyConsent', () => ({
    usePrivacyConsent: vi.fn(() => ({
        acceptTerms: vi.fn(),
        isAccepting: false,
    })),
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    return ({ children }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

describe('LegalModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders with correct GDPR text and branding', () => {
        render(<LegalModal />, { wrapper: createWrapper() });

        // Check header
        expect(screen.getByText('Consentimiento de Privacidad')).toBeInTheDocument();
        expect(screen.getByText('Requerido por RGPD')).toBeInTheDocument();

        // Check main consent text
        expect(screen.getByText(/Jose Vega - Personal Trainer/i)).toBeInTheDocument();
        expect(screen.getByText(/mayor de edad/i)).toBeInTheDocument();
        expect(screen.getByText(/RGPD/i)).toBeInTheDocument();

        // Check buttons
        expect(screen.getByRole('button', { name: /Aceptar y Continuar/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cerrar Sesión/i })).toBeInTheDocument();
    });

    it('calls acceptTerms when "Aceptar" button is clicked', async () => {
        const mockAcceptTerms = vi.fn();
        const { usePrivacyConsent } = await import('../hooks/usePrivacyConsent');
        usePrivacyConsent.mockReturnValue({
            acceptTerms: mockAcceptTerms,
            isAccepting: false,
        });

        const user = userEvent.setup();
        render(<LegalModal />, { wrapper: createWrapper() });

        const acceptButton = screen.getByRole('button', { name: /Aceptar y Continuar/i });
        await user.click(acceptButton);

        expect(mockAcceptTerms).toHaveBeenCalledTimes(1);
    });

    it('calls supabase.auth.signOut when "Cerrar Sesión" button is clicked', async () => {
        const user = userEvent.setup();
        render(<LegalModal />, { wrapper: createWrapper() });

        const signOutButton = screen.getByRole('button', { name: /Cerrar Sesión/i });
        await user.click(signOutButton);

        expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    });

    it('shows loading state when accepting terms', () => {
        const { usePrivacyConsent } = require('../hooks/usePrivacyConsent');
        usePrivacyConsent.mockReturnValue({
            acceptTerms: vi.fn(),
            isAccepting: true,
        });

        render(<LegalModal />, { wrapper: createWrapper() });

        expect(screen.getByText('Procesando...')).toBeInTheDocument();

        // Buttons should be disabled during loading
        const acceptButton = screen.getByRole('button', { name: /Procesando.../i });
        const signOutButton = screen.getByRole('button', { name: /Cerrar Sesión/i });

        expect(acceptButton).toBeDisabled();
        expect(signOutButton).toBeDisabled();
    });

    it('contains link to privacy policy page', () => {
        render(<LegalModal />, { wrapper: createWrapper() });

        const privacyLink = screen.getByRole('link', { name: /Política de Privacidad completa/i });
        expect(privacyLink).toBeInTheDocument();
        expect(privacyLink).toHaveAttribute('href', '/privacy-policy');
        expect(privacyLink).toHaveAttribute('target', '_blank');
    });

    it('displays user rights information', () => {
        render(<LegalModal />, { wrapper: createWrapper() });

        expect(screen.getByText(/solo serán accesibles por tu entrenador/i)).toBeInTheDocument();
        expect(screen.getByText(/derechos ARCO/i)).toBeInTheDocument();
    });

    it('has proper accessibility attributes', () => {
        render(<LegalModal />, { wrapper: createWrapper() });

        // Modal should be visible and blocking
        const modal = screen.getByText('Consentimiento de Privacidad').closest('div').parentElement.parentElement;
        expect(modal).toHaveClass('fixed', 'inset-0', 'z-50');

        // Buttons should be keyboard accessible
        const acceptButton = screen.getByRole('button', { name: /Aceptar y Continuar/i });
        const signOutButton = screen.getByRole('button', { name: /Cerrar Sesión/i });

        expect(acceptButton).toBeVisible();
        expect(signOutButton).toBeVisible();
    });
});
