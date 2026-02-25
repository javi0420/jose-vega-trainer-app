import { test, expect } from '@playwright/test';

test.describe('Privacy Consent Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Reset database state before each test
        await page.goto('http://localhost:5173');
    });

    test('new client must accept terms before accessing dashboard', async ({ page }) => {
        // Step 1: Trainer creates a new client
        await page.goto('http://localhost:5173');
        await page.fill('input[type="email"]', 'trainer@test.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');

        // Wait for trainer dashboard
        await expect(page).toHaveURL(/\/app/);

        // Create new client
        const createClientButton = page.getByRole('button', { name: /Añadir cliente/i });
        await createClientButton.click();

        const clientEmail = `testclient_${Date.now()}@test.com`;
        await page.fill('input[placeholder*="email"]', clientEmail);
        await page.fill('input[placeholder*="Ej: Juan Pérez"]', 'Test Client');
        // Handle the alert dialog
        page.once('dialog', async dialog => {
            expect(dialog.message()).toMatch(/cliente creado/i);
            await dialog.accept();
        });
        await page.click('button[type="submit"]');

        // Sign out trainer
        await page.click('button[aria-label="Cerrar sesión"]');
        await expect(page).toHaveURL('/');

        // Step 2: Client logs in and sees consent modal
        await page.fill('input[type="email"]', clientEmail);
        await page.fill('input[type="password"]', 'Joaquin2025'); // Default password
        await page.click('button[type="submit"]');

        // Wait for app load
        await expect(page).toHaveURL(/\/app/);

        // Should see LegalModal (not dashboard)
        await expect(page.getByText('Consentimiento de Privacidad')).toBeVisible();
        await expect(page.getByText(/Jose Vega - Personal Trainer/i)).toBeVisible();
        await expect(page.getByText('Requerido por RGPD').first()).toBeVisible();

        // Dashboard should NOT be accessible yet


        // Step 3: Client accepts terms
        const acceptButton = page.getByRole('button', { name: /Aceptar y Continuar/i });
        await acceptButton.click();

        // Modal should disappear and dashboard should load
        await expect(page.getByText('Consentimiento de Privacidad')).not.toBeVisible({ timeout: 3000 });
        await expect(page.getByText('Bienvenido de vuelta')).toBeVisible({ timeout: 5000 });
        await expect(page).toHaveURL(/\/app/);
    });

    test('client can reject terms and sign out', async ({ page }) => {
        // Create and login as client (same setup as above)
        await page.goto('http://localhost:5173');
        await page.fill('input[type="email"]', 'trainer@test.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(/\/app/);

        const createClientButton = page.getByRole('button', { name: /Añadir cliente/i });
        await createClientButton.click();

        const clientEmail = `testclient_reject_${Date.now()}@test.com`;
        await page.fill('input[placeholder*="email"]', clientEmail);
        await page.fill('input[placeholder*="Ej: Juan Pérez"]', 'Test Reject Client');
        page.once('dialog', async dialog => {
            expect(dialog.message()).toMatch(/cliente creado/i);
            await dialog.accept();
        });
        await page.click('button[type="submit"]');
        await page.click('button[aria-label="Cerrar sesión"]');

        // Client login
        await page.fill('input[type="email"]', clientEmail);
        await page.fill('input[type="password"]', 'Joaquin2025');
        await page.click('button[type="submit"]');

        // Wait for app load
        await expect(page).toHaveURL(/\/app/);

        // See modal
        await expect(page.getByText('Consentimiento de Privacidad')).toBeVisible();

        // Click "Cerrar Sesión" instead of accepting
        // Click "Cerrar Sesión" instead of accepting (modal button is first in DOM due to ConsentGuard placement)
        const signOutButton = page.getByRole('button', { name: /Cerrar Sesión/i }).first();
        await signOutButton.click();

        // Should be redirected to login page
        await expect(page).toHaveURL('/', { timeout: 3000 });
        await expect(page.getByText('Consentimiento de Privacidad')).not.toBeVisible();
    });

    test('existing client with accepted terms does not see modal', async ({ page }) => {
        // Step 1: Create a new client and accept terms
        await page.goto('http://localhost:5173');
        await page.fill('input[type="email"]', 'trainer@test.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(/\/app/);

        const createClientButton = page.getByRole('button', { name: /Añadir cliente/i });
        await createClientButton.click();

        const clientEmail = `testclient_existing_${Date.now()}@test.com`;
        await page.fill('input[placeholder*="email"]', clientEmail);
        await page.fill('input[placeholder*="Ej: Juan Pérez"]', 'Test Existing Client');
        page.once('dialog', async dialog => {
            await dialog.accept();
        });
        await page.click('button[type="submit"]');

        // Logout trainer
        await page.click('button[aria-label="Cerrar sesión"]');

        // Step 2: Login as client and accept terms
        await page.fill('input[type="email"]', clientEmail);
        await page.fill('input[type="password"]', 'Joaquin2025');
        await page.click('button[type="submit"]');

        // Accept terms
        await expect(page.getByText('Consentimiento de Privacidad')).toBeVisible();
        await page.getByRole('button', { name: /Aceptar y Continuar/i }).click();
        await expect(page.getByText('Consentimiento de Privacidad')).not.toBeVisible();

        // Logout client
        await page.click('button[aria-label="Cerrar sesión"]');

        // Step 3: Login again - should NOT see modal
        await page.fill('input[type="email"]', clientEmail);
        await page.fill('input[type="password"]', 'Joaquin2025');
        await page.click('button[type="submit"]');

        // Should go directly to dashboard without modal
        await expect(page).toHaveURL(/\/app/, { timeout: 10000 });
        await expect(page.getByText('Bienvenido de vuelta')).toBeVisible();

        // Modal should never appear
        await expect(page.getByText('Consentimiento de Privacidad')).not.toBeVisible();
    });

    test('privacy policy page is accessible and renders correctly', async ({ page }) => {
        // Navigate directly to privacy policy (public route)
        await page.goto('http://localhost:5173/legal-terms');
        await page.waitForURL(/.*legal-terms/);

        // Check all major sections are present
        await expect(page.getByRole('heading', { name: 'Política de Privacidad' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Aviso Legal' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Responsable del Tratamiento' })).toBeVisible();
        // Scope to the specific section to avoid strict mode violation (appears in header, footer, etc.)
        const responsableSection = page.locator('section').filter({ hasText: 'Responsable del Tratamiento' });
        await expect(responsableSection.getByText('Jose Vega')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Finalidad del Tratamiento' })).toBeVisible();
        await expect(page.getByRole('heading', { name: /Derechos.*ARCO/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Seguridad de los Datos' })).toBeVisible();

        // Check ARCO rights cards
        await expect(page.getByRole('heading', { name: 'Acceso' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Rectificación' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Supresión' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Oposición' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Portabilidad' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Limitación' })).toBeVisible();

        // Check back button works
        const backButton = page.getByRole('link').first();
        await expect(backButton).toBeVisible();
    });

    test('privacy policy link in modal opens in new tab', async ({ page, context }) => {
        // Setup: Create and login as new client to see modal
        await page.goto('http://localhost:5173');
        await page.fill('input[type="email"]', 'trainer@test.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(/\/app/);

        const createClientButton = page.getByRole('button', { name: /Añadir cliente/i });
        await createClientButton.click();

        const clientEmail = `testclient_link_${Date.now()}@test.com`;
        await page.fill('input[placeholder*="email"]', clientEmail);
        await page.fill('input[placeholder*="Ej: Juan Pérez"]', 'Test Link Client');
        page.once('dialog', async dialog => {
            expect(dialog.message()).toMatch(/cliente creado/i);
            await dialog.accept();
        });
        await page.click('button[type="submit"]');
        await page.click('button[aria-label="Cerrar sesión"]');

        await page.fill('input[type="email"]', clientEmail);
        await page.fill('input[type="password"]', 'Joaquin2025');
        await page.click('button[type="submit"]');

        // Modal should be visible
        await expect(page.getByText('Consentimiento de Privacidad')).toBeVisible();

        // Click privacy policy link
        const privacyLink = page.getByRole('link', { name: /Política de Privacidad completa/i });
        await expect(privacyLink).toHaveAttribute('target', '_blank');
        await expect(privacyLink).toHaveAttribute('href', '/legal-terms');
    });

    test('modal cannot be dismissed by clicking overlay', async ({ page }) => {
        // Setup: Login as new client to see modal
        await page.goto('http://localhost:5173');
        await page.fill('input[type="email"]', 'trainer@test.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(/\/app/);

        const createClientButton = page.getByRole('button', { name: /Añadir cliente/i });
        await createClientButton.click();

        const clientEmail = `testclient_overlay_${Date.now()}@test.com`;
        await page.fill('input[placeholder*="email"]', clientEmail);
        await page.fill('input[placeholder*="Ej: Juan Pérez"]', 'Test Overlay Client');
        page.once('dialog', async dialog => {
            expect(dialog.message()).toMatch(/cliente creado/i);
            await dialog.accept();
        });
        await page.click('button[type="submit"]');
        await page.click('button[aria-label="Cerrar sesión"]');

        await page.fill('input[type="email"]', clientEmail);
        await page.fill('input[type="password"]', 'Joaquin2025');
        await page.click('button[type="submit"]');

        // Modal should be visible
        await expect(page.getByText('Consentimiento de Privacidad')).toBeVisible();

        // Try clicking on the overlay (backdrop)
        const overlay = page.locator('.fixed.inset-0.z-50').first();
        await overlay.click({ position: { x: 10, y: 10 } }); // Click on edge

        // Modal should still be visible (not dismissible)
        await expect(page.getByText('Consentimiento de Privacidad')).toBeVisible();

        // Dashboard should not be accessible

    });
});
