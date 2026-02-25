import { test, expect } from '@playwright/test';

test.describe('Routine Start Button Flow', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);
        await page.goto('/');
        await page.fill('input[type="email"]', 'trainer@test.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/);
    });

    test('can start a workout from the routines list (verifies authorized flag)', async ({ page }) => {
        // Go to routines
        await page.getByTestId('nav-btn-routines').click();
        await expect(page).toHaveURL(/\/app\/routines/);

        // Ensure there is at least one routine
        const timestamp = Date.now();
        const routineName = `Start Test ${timestamp}`;
        await page.getByRole('button', { name: 'Crear Nueva Plantilla' }).click();
        await page.fill('label:has-text("Nombre") + input', routineName);
        await page.locator('form').getByRole('button', { name: 'Crear Plantilla' }).click();
        await expect(page.locator(`text=${routineName}`)).toBeVisible();

        // Find the "Iniciar" button for this specific routine and click it
        const routineCard = page.locator('li').filter({ hasText: routineName }).first();
        await routineCard.getByRole('button', { name: 'Iniciar' }).click();

        // Verify we are in the workout editor and NOT redirected back
        // If the bug persists, RouteGuard will redirect us to /app
        await expect(page).toHaveURL(/\/app\/workout\/new/, { timeout: 15000 });

        // Final verification: we are actually in the editor
        await expect(page.getByTestId('workout-header-title-trigger')).toContainText(routineName);
    });
});
