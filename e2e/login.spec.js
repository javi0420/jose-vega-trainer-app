import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('User can login successfully', async ({ page }) => {
        await page.goto('/');

        // Use new data-testid selectors
        await page.getByTestId('login-input-email').fill('lindo@test.com');
        await page.getByTestId('login-input-password').fill('IronTrack2025');
        await page.getByTestId('login-btn-submit').click();

        // Should redirect to dashboard
        await expect(page).toHaveURL(/\/app/);

        // Wait for app state to settle
        await page.waitForLoadState('networkidle');

        // Verify some dashboard element is visible
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
