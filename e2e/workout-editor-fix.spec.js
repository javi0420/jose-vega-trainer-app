import { test, expect } from '@playwright/test';

test.describe('Workout Editor - Bug Fixes', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);
        await page.goto('/');
        await page.getByTestId('login-input-email').fill('trainer@test.com');
        await page.getByTestId('login-input-password').fill('password123');
        await page.getByTestId('login-btn-submit').click();
        await expect(page).toHaveURL(/\/app/);
    });

    test('sets in workout started from routine have independent state (unique IDs)', async ({ page }) => {
        // 1. Go to routines and create a simple one
        await page.getByTestId('nav-btn-routines').click();
        const timestamp = Date.now();
        const routineName = `BugTest-${timestamp}-${Math.floor(Math.random() * 1000)}`;
        await page.getByTestId('routine-btn-create-new').click();
        await page.fill('label:has-text("Nombre") + input', routineName);
        await page.locator('form').getByRole('button', { name: 'Crear Plantilla' }).click();

        // Add an exercise
        await page.getByTestId(`routine-card-${routineName}`).click();
        await page.getByTestId('routine-btn-add-exercise').click();
        await page.getByTestId('routine-exercise-search').fill('Sentadilla');
        await page.locator('button[data-exercise-name="Sentadilla"]').first().click();
        await expect(page.getByTestId('routine-exercise-search')).toBeHidden();

        // Ensure exercise is listed
        await expect(page.getByTestId('routine-block-item')).toHaveCount(1);
        await expect(page.getByTestId('routine-block-item').locator('h3')).toHaveText(/sentadilla/i);

        await page.getByTestId('routine-btn-save').click();
        await page.waitForURL(/\/app\/routines/);

        // 2. Start workout from this routine
        const card = page.locator('li').filter({ hasText: routineName }).first();
        await card.getByRole('button', { name: 'Iniciar' }).click();

        // REFUERZO: Esperamos a que la navegación ocurra
        await page.waitForURL(/\/app\/workout\/new/);

        // SINCRONIZACIÓN CRÍTICA: Esperamos a que el nombre de la rutina sea visible en el componente de la cabecera.
        // Esto confirma que la carga asíncrona de 'loadRoutine' ha terminado y ha actualizado el estado.
        await expect(page.getByTestId('workout-header-title-trigger')).toContainText(routineName, { timeout: 15000 });

        // 3. VERIFY INDEPENDENT STATE
        const weightInputs = page.locator('input[placeholder="kg"]');
        await expect(weightInputs).toHaveCount(3); // Default is 3 sets

        const firstSet = weightInputs.nth(0);
        const secondSet = weightInputs.nth(1);

        // Fill first set (Click + Fill + Tab para asegurar disparadores de React)
        await firstSet.click();
        await firstSet.fill('100');
        await firstSet.press('Tab');

        // Verify second set is still empty
        await expect(secondSet).toHaveValue('');
        await expect(firstSet).toHaveValue('100');

        // Fill second set
        await secondSet.click();
        await secondSet.fill('120');
        await secondSet.press('Tab');

        await expect(firstSet).toHaveValue('100');
        await expect(secondSet).toHaveValue('120');

        console.log('Unique ID fix verified: Sets have independent state.');
    });
});
