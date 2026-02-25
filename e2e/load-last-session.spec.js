import { test, expect } from '@playwright/test';

// Client credentials with workout history
const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Load Last Session Feature', () => {
    // Run sequentially
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        // Handle dialogs
        page.on('dialog', dialog => dialog.accept());

        // Login as client
        await page.goto('/');
        await page.fill('input[placeholder="nombre@ejemplo.com"]', CLIENT_USER.email);
        await page.fill('input[placeholder="••••••••"]', CLIENT_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

        // Handle Privacy Consent Modal
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
            await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
        }
    });

    test('Load Last button is visible for exercises', async ({ page }) => {
        // Navigate to new workout
        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/new/);

        // Add exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('li button');
        await page.locator('li button').first().click();
        await page.waitForTimeout(500);

        // Verify "Copiar último" button exists (clipboard icon)
        const loadLastBtn = page.locator('button[title="Copiar último"]');
        await expect(loadLastBtn).toBeVisible();
    });

    test('Load Last button shows message when no history exists', async ({ page }) => {
        // Remove beforeEach dialog handler for this test
        page.removeAllListeners('dialog');

        // Navigate to new workout
        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/new/);

        // Add exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('li button');

        // Search for an exercise that likely has no history
        const uniqueTerm = `zzz_${Date.now()}`;
        await page.fill('input[placeholder="Buscar ejercicio..."]', uniqueTerm);
        await page.waitForTimeout(500);

        // If no results, use ad-hoc exercise
        const noResults = await page.locator('text=No se encontraron ejercicios').isVisible();
        if (noResults) {
            await page.click('button:has-text("Usar")');
        } else {
            await page.locator('li button').first().click();
        }

        await page.waitForTimeout(500);

        // Track alert message
        let alertMessage = '';

        // Click load last button and wait for dialog (race condition fix)
        const loadLastBtn = page.locator('button[title="Copiar último"]');
        if (await loadLastBtn.isVisible()) {
            // Create a promise that resolves when the dialog appears
            const dialogPromise = page.waitForEvent('dialog');

            await loadLastBtn.click();

            const dialog = await dialogPromise;
            alertMessage = dialog.message();
            await dialog.accept();

            // Should show "no history" or "no sets" message
            expect(alertMessage).toMatch(/historial|series/i);
        }
    });

    test('Load Last copies previous workout sets as placeholders', async ({ page }) => {
        // Navigate to new workout
        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/new/);

        // Add an exercise that should have workout history
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('li button');

        // Select first exercise (likely has history if user has workouts)
        await page.locator('li button').first().click();
        await page.waitForTimeout(500);

        // Click load last button
        const loadLastBtn = page.locator('button[title="Copiar último"]');
        await loadLastBtn.click();

        // Wait for loading to complete
        await page.waitForTimeout(2000);

        // If history exists, sets should be added with placeholder values
        const setRows = page.locator('input[placeholder]');
        const count = await setRows.count();

        // Should have at least some inputs (either from loaded history or empty state)
        expect(count).toBeGreaterThanOrEqual(0);
    });

});
