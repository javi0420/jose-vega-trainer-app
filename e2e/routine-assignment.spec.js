import { test, expect } from '@playwright/test';

test.describe('Routine Assignment Preview', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);
        await page.goto('/');
        await page.getByTestId('login-input-email').fill('trainer@test.com');
        await page.getByTestId('login-input-password').fill('password123');
        await page.getByTestId('login-btn-submit').click();
        await expect(page).toHaveURL(/\/app/);
    });

    test('can preview template exercises before assigning', async ({ page }) => {
        // 1. Create a routine with specific exercises first to ensure we have data
        await page.getByTestId('nav-btn-routines').click();
        const timestamp = Date.now();
        const routineName = `PreviewTarget ${timestamp}`;
        await page.getByTestId('routine-btn-create-new').click();
        await page.fill('label:has-text("Nombre") + input', routineName);
        await page.click('form button:has-text("Crear Plantilla")');

        // 2. Add exercises to the routine
        await page.getByTestId(`routine-card-${routineName}`).click();
        await page.getByTestId('routine-btn-add-exercise').click();
        await page.getByTestId('routine-exercise-search').fill('Press Banca');
        await page.locator('button[data-exercise-name="Press Banca"]').first().click();
        await expect(page.getByTestId('routine-exercise-search')).toBeHidden();

        await page.getByTestId('routine-btn-save').click();
        await page.waitForURL(/\/app\/routines$/);

        // 4. Go back to Dashboard -> Clients
        await page.getByTestId('nav-btn-home').click();
        await expect(page).toHaveURL(/\/app$/);

        // 5. Create a fresh client
        const clientName = `ClientPreview ${Date.now()}`;
        await page.getByRole('button', { name: 'Añadir Cliente' }).click();
        await page.fill('input[placeholder="Ej: Juan Pérez"]', clientName);
        await page.fill('input[placeholder="ejemplo@email.com"]', `client${Date.now()}@test.com`);
        await page.click('button:has-text("Crear Cliente")');
        await page.getByRole('button', { name: 'Crear Cliente' }).waitFor({ state: 'hidden' });

        // 6. Find the new client and check assignment
        await page.fill('input[placeholder="Buscar cliente..."]', clientName);
        const clientCard = page.getByTestId(`client-card-${clientName}`);
        await expect(clientCard).toBeVisible({ timeout: 10000 });
        await clientCard.getByTestId('action-assign').click();

        // 7. Search and Select the routine in the modal
        await expect(page.getByTestId('assign-modal-title')).toBeVisible();

        const searchInput = page.getByTestId('routine-search-input');
        await searchInput.fill(routineName);

        const templateCard = page.getByTestId(`routine-template-${routineName}`);
        await expect(templateCard).toBeVisible();
        await templateCard.click();

        // 8. Verify Preview appears - use longer timeout for DB sync
        await expect(page.getByTestId('routine-preview-section')).toBeVisible();
        await expect(page.getByTestId('routine-preview-section')).toContainText('Bloque 1', { timeout: 10000 });
        await expect(page.getByTestId('routine-preview-section')).toContainText('Press Banca', { timeout: 10000 });

        // 7. Verify Assign button is there
        await expect(page.locator('button:has-text("Confirmar Asignación")')).toBeVisible();
    });
});
