import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('User can login successfully', async ({ page }) => {
        await page.goto('/');

        // Use new data-testid selectors
        await page.getByTestId('login-input-email').fill('lindo@test.com');
        await page.getByTestId('login-input-password').fill('IronTrack2025');
        await page.getByTestId('login-btn-submit').click();

        // Handle potential forced password reset
        if (page.url().includes('update-password')) {
            await page.fill('input[type="password"] >> nth=0', 'IronTrack2025!');
            await page.fill('input[type="password"] >> nth=1', 'IronTrack2025!');
            await page.click('button:has-text("Actualizar contraseña")');
            await expect(page.locator('text=¡Todo listo!')).toBeVisible();
            await page.waitForTimeout(1500);
        }

        // Should redirect to dashboard
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

        // Wait for app state to settle
        await page.waitForLoadState('networkidle');

        // Verify navigation to dashboard
        await expect(page.getByTestId('nav-btn-home')).toBeVisible();
    });

    test('Should display error on invalid credentials', async ({ page }) => {
        await page.goto('/');

        await page.getByTestId('login-input-email').fill('wrong@test.com');
        await page.getByTestId('login-input-password').fill('wrongpassword');
        await page.getByTestId('login-btn-submit').click();

        // Should show error message
        const errorMsg = page.locator('.text-red-200');
        await expect(errorMsg).toBeVisible();
    });
});
