import { test, expect } from '@playwright/test';

const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Route Guard Protection', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        // Handle dialogs globally
        page.on('dialog', dialog => dialog.accept());

        // Login as client
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Ensure we are on login page (if not, we might be auto-logged in or loading)
        // FORCE wait for button to appear, do not skip
        await page.waitForSelector('button:has-text("Iniciar Sesión")', { timeout: 10000 });

        await page.fill('input[type="email"]', CLIENT_USER.email);
        await page.fill('input[type="password"]', CLIENT_USER.pass);
        await page.keyboard.press('Enter');

        // Wait for dashboard
        await expect(page).toHaveURL(/\/app/, { timeout: 30000 });

        // Ensure "Nuevo Entreno" button is visible
        await expect(page.locator('text=Nuevo Entreno')).toBeVisible({ timeout: 15000 });
    });

    test('Direct access to /app/workout/new redirects to dashboard', async ({ page }) => {
        // Try to access the protected route directly via URL
        await page.goto('/app/workout/new');

        // Should be redirected back to /app (dashboard)
        // We verify that we are NOT on /new
        await expect(page).not.toHaveURL(/\/new$/);
        await expect(page).toHaveURL(/\/app$/);
    });

    test('App navigation to /app/workout/new is allowed', async ({ page }) => {
        // Click the authorized button from Dashboard
        await page.click('text=Nuevo Entreno');

        // Should successfully land on the new workout page
        await expect(page).toHaveURL(/\/new/);

        // Verify key element exists (e.g. "Nombre del entrenamiento" or specific editor element)
        await expect(page.getByTestId('workout-header-title-trigger')).toBeVisible();
    });
});
