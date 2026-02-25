import { test, expect } from '@playwright/test';

const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Regression Fixes', () => {
    // Run sequentially
    test.describe.configure({ mode: 'serial' });

    test('Bug Fix: Resume Workout bar navigates correctly (bypassing RouteGuard)', async ({ page }) => {
        // 1. Login
        await page.goto('/');
        await page.fill('input[type="email"]', CLIENT_USER.email);
        await page.fill('input[type="password"]', CLIENT_USER.pass);
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(/\/app/);

        // 2. Start a new workout to activate the bar
        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/app\/workout\/new/);

        // Optional: wait for some UI element that confirms we are in the editor
        // Just verify URL is correct and stable
        await expect(page).toHaveURL(/\/app\/workout\/new/);

        // 3. Navigate away to Dashboard
        await page.goto('/app');
        await expect(page).toHaveURL(/\/app$/);

        // 4. Verify Bar is visible
        const resumeBar = page.locator('text=Entrenamiento en Curso');
        await expect(resumeBar).toBeVisible();

        // 5. TEST: Click Resume and verify we reach the editor (Fix Verification)
        await resumeBar.click();

        // Should NOT be blocked by RouteGuard (which redirects to /app if fail)
        await expect(page).toHaveURL(/\/app\/workout\/new/);
    });

    test('Bug Fix: Active Workout bar is NOT visible on Login screen', async ({ page }) => {
        // 1. Ensure we are logged out
        await page.goto('/');

        // 2. Visual Check: Bar should not be present
        const resumeBar = page.locator('text=Entrenamiento en Curso');
        await expect(resumeBar).not.toBeVisible();

        // 3. Login and Start Workout to set local state
        await page.fill('input[type="email"]', CLIENT_USER.email);
        await page.fill('input[type="password"]', CLIENT_USER.pass);
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(/\/app/);

        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/app\/workout\/new/);

        // 4. Logout explicitly
        await page.goto('/app/profile');
        // Ensure we scroll to bottom to expose button if possible
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        // Use dispatchEvent to bypass any potential overlays (like the active workout bar)
        await page.locator('button:has-text("Cerrar Sesión")').dispatchEvent('click');

        // Wait for redirection to login - increase timeout
        await expect(page).toHaveURL('/', { timeout: 10000 });

        // 5. TEST: Bar should be gone on Login screen
        await expect(resumeBar).not.toBeVisible();
    });
});
