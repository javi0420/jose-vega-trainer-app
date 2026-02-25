import { test, expect } from '@playwright/test';

const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Logout Cleanup Feature', () => {
    test.describe.configure({ mode: 'serial' });

    test('Active workout overlay is removed after logout', async ({ page }) => {
        // 1. Initial Login
        await page.goto('/');
        await page.fill('input[type="email"]', CLIENT_USER.email);
        await page.fill('input[type="password"]', CLIENT_USER.pass);

        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(/\/app/, { timeout: 20000 });

        // 2. Start a Workout
        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/new/);
        // Create dirty state: Add Exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('li button');
        await page.locator('li button').first().click();
        await page.waitForTimeout(500);

        // 3. Verify Overlay appears on Dashboard
        await page.goto('/app');
        await expect(page.locator('text=Entrenamiento en Curso')).toBeVisible();

        // 2. Logout from Dashboard (Header button restored)
        await page.click('button[aria-label="Cerrar sesión"]');
        await expect(page).toHaveURL('/', { timeout: 10000 });

        // 5. Verify Overlay is NOT on Login Page (sanity check)
        await expect(page.locator('text=Entrenamiento en Curso')).not.toBeVisible();

        // 6. Login Again
        await page.fill('input[type="email"]', CLIENT_USER.email);
        await page.fill('input[type="password"]', CLIENT_USER.pass);

        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('/auth/v1/token') && resp.ok(), { timeout: 15000 }),
            page.click('button:has-text("Iniciar Sesión")')
        ]);
        await expect(page).toHaveURL(/\/app/, { timeout: 20000 });

        // 7. Verify Overlay is GONE (Main Assertion)
        await expect(page.locator('text=Entrenamiento en Curso')).not.toBeVisible();
    });
});
