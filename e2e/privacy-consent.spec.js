import { test, expect } from '@playwright/test';

test.describe('Privacy Consent Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173');
    });

    // Robust trainer login helper
    async function loginAsTrainer(page) {
        await page.goto('http://localhost:5173');
        await page.fill('input[name="email"]', 'trainer@test.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');

        const errorMsg = page.locator('text=Invalid login credentials');
        if (await errorMsg.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('Test Helper: Retrying with updated trainer password...');
            await page.fill('input[name="password"]', 'password123!');
            await page.click('button[type="submit"]');
        }
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });
    }

    // Helper to handle the mandatory password reset for new clients
    async function handleForcedReset(page, newPass = 'Jose2026!') {
        console.log('Test Helper: Checking for forced password reset...');
        // Wait for the URL to settle or detect the reset page
        try {
            await expect(page).toHaveURL(/\/update-password/, { timeout: 5000 });
            console.log('Test Helper: Reset page detected, updating password...');
            await page.fill('input[type="password"] >> nth=0', newPass);
            await page.fill('input[type="password"] >> nth=1', newPass);
            await page.click('button:has-text("Actualizar contraseña")');
            await expect(page.locator('text=¡Todo listo!')).toBeVisible({ timeout: 10000 });
            await expect(page).toHaveURL(/\/app/, { timeout: 10000 });
        } catch (e) {
            console.log('Test Helper: Reset page not detected or already handled.');
        }
    }

    test('new client must accept terms before accessing dashboard', async ({ page }) => {
        await loginAsTrainer(page);

        // Create new client
        await page.getByRole('button', { name: /Añadir cliente/i }).click();
        const clientEmail = `testclient_${Date.now()}@test.com`;
        await page.fill('input[placeholder*="email"]', clientEmail);
        await page.fill('input[placeholder*="Ej: Juan Pérez"]', 'Test Client');
        
        page.once('dialog', async dialog => { await dialog.accept(); });
        await page.click('button[type="submit"]');

        // Sign out trainer
        await page.click('button[aria-label="Cerrar sesión"]');
        await expect(page).toHaveURL('/');

        // Client login
        await page.fill('input[name="email"]', clientEmail);
        await page.fill('input[name="password"]', 'Jose2026'); 
        await page.click('button[type="submit"]');

        await handleForcedReset(page);

        // Now should see LegalModal (on /app)
        await expect(page.getByText('Consentimiento de Privacidad')).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('button', { name: /Aceptar y Continuar/i })).toBeVisible();

        // Step 3: Client accepts terms
        await page.getByRole('button', { name: /Aceptar y Continuar/i }).click();

        // Modal should disappear and dashboard should load
        await expect(page.getByText('Consentimiento de Privacidad')).not.toBeVisible({ timeout: 5000 });
        await expect(page.getByTestId('nav-btn-home')).toBeVisible({ timeout: 5000 });
    });

    test('client can reject terms and sign out', async ({ page }) => {
        await loginAsTrainer(page);

        const clientEmail = `testclient_reject_${Date.now()}@test.com`;
        await page.getByRole('button', { name: /Añadir cliente/i }).click();
        await page.fill('input[placeholder*="email"]', clientEmail);
        await page.fill('input[placeholder*="Ej: Juan Pérez"]', 'Test Reject Client');
        page.once('dialog', async dialog => { await dialog.accept(); });
        await page.click('button[type="submit"]');
        await page.click('button[aria-label="Cerrar sesión"]');

        // Client login
        await page.fill('input[name="email"]', clientEmail);
        await page.fill('input[name="password"]', 'Jose2026');
        await page.click('button[type="submit"]');

        await handleForcedReset(page);

        // See modal
        await expect(page.getByText('Consentimiento de Privacidad')).toBeVisible({ timeout: 10000 });

        // Click "Cerrar Sesión" instead of accepting
        const signOutButton = page.getByRole('button', { name: /Cerrar Sesión/i }).first();
        await signOutButton.click();

        // Should be redirected to login page
        await expect(page).toHaveURL('/', { timeout: 10000 });
    });

    test('existing client with accepted terms does not see modal', async ({ page }) => {
        await loginAsTrainer(page);

        const clientEmail = `testclient_existing_${Date.now()}@test.com`;
        await page.getByRole('button', { name: /Añadir cliente/i }).click();
        await page.fill('input[placeholder*="email"]', clientEmail);
        await page.fill('input[placeholder*="Ej: Juan Pérez"]', 'Test Existing Client');
        page.once('dialog', async dialog => { await dialog.accept(); });
        await page.click('button[type="submit"]');
        await page.click('button[aria-label="Cerrar sesión"]');

        // 1st Login: Reset password and accept terms
        await page.fill('input[name="email"]', clientEmail);
        await page.fill('input[name="password"]', 'Jose2026');
        await page.click('button[type="submit"]');

        await handleForcedReset(page, 'Jose2026!');
        await expect(page.getByText('Consentimiento de Privacidad')).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: /Aceptar y Continuar/i }).click();
        await expect(page.getByText('Consentimiento de Privacidad')).not.toBeVisible();

        await page.click('button[aria-label="Cerrar sesión"]');

        // 2nd Login: Should NOT see modal
        await page.fill('input[name="email"]', clientEmail);
        await page.fill('input[name="password"]', 'Jose2026!');
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(/\/app/, { timeout: 10000 });
        await expect(page.getByTestId('nav-btn-home')).toBeVisible();
        await expect(page.getByText('Consentimiento de Privacidad')).not.toBeVisible();
    });

    test('privacy policy page is accessible', async ({ page }) => {
        await page.goto('http://localhost:5173/legal-terms');
        await expect(page.getByRole('heading', { name: 'Política de Privacidad' })).toBeVisible();
    });

    test('privacy policy link in modal opens in new tab', async ({ page }) => {
        await loginAsTrainer(page);

        const clientEmail = `testclient_link_${Date.now()}@test.com`;
        await page.getByRole('button', { name: /Añadir cliente/i }).click();
        await page.fill('input[placeholder*="email"]', clientEmail);
        await page.fill('input[placeholder*="Ej: Juan Pérez"]', 'Test Link Client');
        page.once('dialog', async dialog => { await dialog.accept(); });
        await page.click('button[type="submit"]');
        await page.click('button[aria-label="Cerrar sesión"]');

        await page.fill('input[name="email"]', clientEmail);
        await page.fill('input[name="password"]', 'Jose2026');
        await page.click('button[type="submit"]');

        await handleForcedReset(page);

        await expect(page.getByText('Consentimiento de Privacidad')).toBeVisible({ timeout: 10000 });
        const privacyLink = page.getByRole('link', { name: /Política de Privacidad completa/i });
        await expect(privacyLink).toHaveAttribute('target', '_blank');
        await expect(privacyLink).toHaveAttribute('href', '/legal-terms');
    });
});
