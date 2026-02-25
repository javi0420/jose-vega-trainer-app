import { test, expect } from '@playwright/test';

test.describe('Session Persistence', () => {
    test.beforeEach(async ({ page }) => {
        // High timeout for setup
        test.setTimeout(60000);

        // Ensure clean state
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        await page.fill('input[type="email"]', 'lindo@test.com');
        await page.fill('input[type="password"]', 'IronTrack2025');
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/);

        // Handle Privacy Consent Modal
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
            await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
        }

        // Handle navigation guards (beforeunload)
        page.on('dialog', dialog => dialog.accept());
    });

    test('recovers workout draft after page reload', async ({ page }) => {
        // 1. Start a new workout
        await page.click('button:has-text("Nuevo Entreno")');
        await expect(page).toHaveURL(/\/app\/workout\/new/);

        // 2. Add an exercise
        await page.click('button:has-text("Añadir Ejercicio")'); // Updated selector
        await page.fill('input[placeholder="Buscar ejercicio..."]', 'Press Banca');
        await page.waitForTimeout(1000);
        await page.click('button:has-text("Press Banca")');
        await expect(page.locator('h3:has-text("Press Banca")')).toBeVisible();

        // 3. Add a set with values
        await page.click('button:has-text("Set")'); // More robust than "Añadir Set"
        const weightInput = page.locator('input[placeholder="kg"]').first();
        const repsInput = page.locator('input[placeholder="reps"]').first();
        await weightInput.fill('80');
        await repsInput.fill('10');

        // 4. Reload page
        await page.reload();
        await page.waitForTimeout(2000); // Give time for recovery logic

        // 5. Verify recovery
        // The URL should still be /app/workout/new (if RouteGuard works)
        await expect(page).toHaveURL(/\/app\/workout\/new/);
        await expect(page.locator('h3:has-text("Press Banca")')).toBeVisible();
        await expect(page.locator('input[placeholder="kg"]').first()).toHaveValue('80');
        await expect(page.locator('input[placeholder="reps"]').first()).toHaveValue('10');
    });

    test('recovers workout draft after navigating away and back', async ({ page }) => {
        // 1. Start workout and add data
        await page.click('button:has-text("Nuevo Entreno")');
        await page.click('button:has-text("Ejercicio")');
        await page.fill('input[placeholder="Buscar ejercicio..."]', 'Press Banca');
        await page.waitForTimeout(1000);
        await page.click('button:has-text("Press Banca")');
        await page.click('button:has-text("Set")');
        await page.locator('input[placeholder="kg"]').first().fill('100');

        // 2. Navigate to Profile (BottomNav hidden in Editor)
        await page.goto('/app/profile');
        await expect(page).toHaveURL(/\/app\/profile/);

        // 3. Navigate back to Workout (Dashboard)
        await page.goto('/app');
        await page.waitForTimeout(1000);
        // If there is an active workout, the "Nuevo Entreno" card usually says "Continuar" or similar
        // or we just click "Nuevo Entreno" again and it should load the draft.
        await page.click('button:has-text("Nuevo Entreno")');
        await page.waitForTimeout(2000);

        // 4. Verify recovery
        await expect(page).toHaveURL(/\/app\/workout\/new/);
        await expect(page.locator('h3:has-text("Press Banca")')).toBeVisible();
        await expect(page.locator('input[placeholder="kg"]').first()).toHaveValue('100');
    });
});
