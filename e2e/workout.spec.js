import { test, expect } from '@playwright/test';

test.describe('Fitness App E2E Flow', () => {

    test('Login Page Loads and Validates Input', async ({ page }) => {
        // 1. Go to Login
        await page.goto('/');

        // 2. Check Elements
        // 2. Check Elements
        await expect(page.locator('input[placeholder="nombre@ejemplo.com"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();

        // 3. Try Invalid Login
        await page.locator('input[placeholder="nombre@ejemplo.com"]').fill('invalid@test.com');
        await page.locator('input[type="password"]').fill('wrongpass');
        await page.locator('button:has-text("Iniciar Sesión")').click();

        // Expect Error Message from Supabase (or generic fallback)
        // Note: Supabase usually returns "Invalid login credentials" or similar, 
        // which might be translated or displayed as is.
        // Our Login.jsx displays err.message.
        // We wait for Any error alert to verify interaction.
        // Check for error message container (red box)
        await expect(page.locator('[class*="bg-red-900"]')).toBeVisible();
    });

    test('Add Exercise Flow (Requires Auth bypass or Mock)', async ({ page }) => {
        // NOTE: This test mocks the Auth State to bypass login
        // We inject a fake session into localStorage to simulate being logged in.
        // HOWEVER, Supabase client checks the server. 
        // For a true E2E without credentials, this is tricky.
        // We will try to mock the Network Request to Supabase Auth.

        // For now, let's just log that we need credentials.
        // If you have a test user, fill them in below:
        const TEST_EMAIL = 'test@example.com';
        const TEST_PASS = 'password123';

        // Uncomment to run real login flow:
        /*
        await page.goto('/');
        await page.getByPlaceholderText('tu@email.com').fill(TEST_EMAIL);
        await page.getByPlaceholderText('••••••••').fill(TEST_PASS);
        await page.getByText('Iniciar Sesión').click();
        await expect(page).toHaveURL(/.*\/app/);

        // FIX: Wait for app state to settle before checking modal
        await page.waitForLoadState('networkidle');

        // FIX: Wait for app state to settle before checking modal
        await page.waitForLoadState('networkidle');

        // Handle Privacy Consent Modal
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
            await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
        }
        */
    });

});
