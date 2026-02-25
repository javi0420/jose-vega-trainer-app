import { test, expect } from '@playwright/test';

const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Bug Fixes E2E Verification', () => {
    test.setTimeout(120000);

    test.beforeEach(async ({ page }) => {
        page.on('dialog', dialog => dialog.accept());
        await page.goto('/');
        await page.getByTestId('login-input-email').fill(CLIENT_USER.email);
        await page.getByTestId('login-input-password').fill(CLIENT_USER.pass);
        await page.getByTestId('login-btn-submit').click();
        await expect(page).toHaveURL(/\/app/, { timeout: 30000 });

        try {
            const modal = page.getByText('Consentimiento de Privacidad');
            if (await modal.isVisible({ timeout: 5000 })) {
                await page.getByRole('button', { name: /Aceptar y Continuar/i }).click();
            }
        } catch (e) { }
    });

    test('Bug 1 & 2: RIR/Technique visibility and Dashboard cache invalidation', async ({ page }) => {
        const workoutName = `BugFixTest_${Date.now()}`;

        // Create workout with 1 set to verify visibility for "Único" set
        await page.getByTestId('new-workout-btn').click();
        await page.locator('button:has-text("Añadir Ejercicio")').click();
        await page.waitForSelector('li button');
        await page.locator('li button').first().click();

        // Ensure a set exists
        await page.getByTestId('workout-btn-add-set').first().click();

        await page.getByTestId('workout-input-weight').first().fill('100');
        await page.getByTestId('workout-input-reps').first().fill('5');
        await page.getByTestId('workout-input-rpe').first().fill('3');
        await page.getByTestId('workout-input-tempo').first().fill('Lenta');
        await page.getByTestId('workout-btn-complete-set').first().click();

        await page.getByTestId('workout-header-title-trigger').click();
        await page.getByTestId('workout-name-edit-input').fill(workoutName);
        await page.getByTestId('workout-name-save-btn').click();

        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('save_full_workout')),
            page.getByTestId('workout-btn-save').click()
        ]);

        // --- STEP 2: Verify Summary (Bug 1 - Visibility even for single set) ---
        await expect(page).toHaveURL(/\/app\/workout\//, { timeout: 30000 });

        // Should be visible WITHOUT expanding
        await expect(page.getByText('RIR: 3 | Téc: Lenta')).toBeVisible();
        await expect(page.getByText('Set Único')).toBeVisible();

        // Verify Dashboard (Exists)
        await page.getByTestId('nav-btn-home').click();
        await expect(page.getByText(workoutName)).toBeVisible();

        // Delete from detail
        await page.getByText(workoutName).click();
        await page.getByTitle('Eliminar entrenamiento').click();
        await page.getByRole('button', { name: 'Confirmar Borrado' }).click();
        await expect(page).toHaveURL(/\/app\/history/);

        // Verify Dashboard (Gone)
        await page.getByTestId('nav-btn-home').click();
        await expect(page.locator(`text=${workoutName}`)).not.toBeVisible({ timeout: 10000 });
    });
});
