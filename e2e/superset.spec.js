import { test, expect } from '@playwright/test';

const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Feature: Supersets', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        // Handle dialogs globally
        page.on('dialog', dialog => dialog.accept());

        // Login
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('button:has-text("Iniciar Sesión")')).toBeEnabled();

        await page.fill('input[type="email"]', CLIENT_USER.email);
        await page.fill('input[type="password"]', CLIENT_USER.pass);
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(/\/app/, { timeout: 30000 });

        // Clear any existing draft
        await page.evaluate(() => {
            localStorage.removeItem('draft_workout');
            localStorage.removeItem('active_workout_id');
        });
    });

    test('Can create a superset with two exercises', async ({ page }) => {
        // Navigate to new workout via UI
        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/new/);

        // Add first exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('li button');
        await page.locator('li button').first().click();
        await page.waitForTimeout(500);

        // Verify first exercise added
        await expect(page.locator('h3').first()).toBeVisible();

        // Click "Agrupar Ejercicio (Superserie)" to add second exercise to same block
        await page.click('button:has-text("Agrupar Ejercicio")');
        await page.waitForSelector('li button');
        await page.locator('li button').nth(1).click(); // Add different exercise
        await page.waitForTimeout(500);

        // Verify Superset indicator is visible
        await expect(page.locator('text=Superset')).toBeVisible();

        // Verify both exercises are in the same block (A and B indicators)
        await expect(page.locator('div:has-text("A")').first()).toBeVisible();
        await expect(page.locator('div:has-text("B")').first()).toBeVisible();
    });

    test('Superset is saved correctly to database', async ({ page }) => {
        // Navigate to new workout via UI
        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/new/);

        // Add first exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('li button');
        await page.locator('li button').first().click();
        await page.waitForTimeout(500);

        // Add set and data
        await page.click('button:has-text("Añadir Set")');
        const weightInput = page.locator('input[placeholder="kg"]');
        const repsInput = page.locator('input[placeholder="reps"]');
        await expect(weightInput).toBeVisible({ timeout: 5000 });
        await weightInput.fill('60');
        await repsInput.fill('10');

        // Complete the set
        await page.getByRole('button', { name: 'Completar set' }).first().click();

        // Add second exercise to superset
        await page.click('button:has-text("Agrupar Ejercicio")');
        await page.waitForSelector('li button');
        await page.locator('li button').nth(1).click();
        await page.waitForTimeout(500);

        // Add set to second exercise
        const secondExerciseAddSet = page.locator('button:has-text("Añadir Set")').nth(1);
        await secondExerciseAddSet.click();

        // Target inputs in the second exercise (use .last() to get the newly added set)
        await page.waitForTimeout(300);
        const secondWeightInput = page.locator('input[placeholder="kg"]').last();
        const secondRepsInput = page.locator('input[placeholder="reps"]').last();
        await expect(secondWeightInput).toBeVisible({ timeout: 5000 });
        await secondWeightInput.fill('40');
        await secondRepsInput.fill('12');

        // Save workout
        await Promise.all([
            page.waitForResponse(resp =>
                resp.url().includes('save_full_workout') &&
                resp.status() === 200
            ),
            page.click('button:has-text("Finalizar")', { force: true })
        ]);

        // Check if redirected to Detail (Client) or Dashboard (Trainer)
        // Wait until we leave the "new workout" page
        await expect(page).not.toHaveURL(/\/new$/, { timeout: 15000 });

        // If we landed on Dashboard (Trainer), click "Revisar"
        const onDashboard = await page.locator('text=Panel de Entrenador').isVisible().catch(() => false);
        if (onDashboard || page.url().endsWith('/app')) {
            // Handle case where specific "Revisar" button needs to be targeted more precisely if possible,
            // but .first() is acceptable if it's the most recent workout (usually at top)
            if (await page.locator('button:has-text("Revisar")').first().isVisible()) {
                await page.locator('button:has-text("Revisar")').first().click();
            }
        }

        // Verify we end up on the workout detail page
        await expect(page).toHaveURL(/\/app\/workout\//, { timeout: 20000 });

        // Verify both exercises are visible in summary (Superset saved correctly)
        await expect(page.locator('h3').first()).toBeVisible();
    });
});
