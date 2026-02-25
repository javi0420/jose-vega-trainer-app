import { test, expect } from '@playwright/test';

test.describe('Advanced Routine Features', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);
        await page.goto('/');
        await page.getByTestId('login-input-email').fill('trainer@test.com');
        await page.getByTestId('login-input-password').fill('password123');
        await page.getByTestId('login-btn-submit').click();
        await expect(page).toHaveURL(/\/app/);

        // Use data-testid for navigation
        await page.getByTestId('nav-btn-routines').click();
        await expect(page.locator('h1:has-text("Mis Plantillas")')).toBeVisible();
    });

    test('can clone an existing routine', async ({ page }) => {
        // 1. Ensure a routine exists
        const timestamp = Date.now();
        const routineName = `Clone Source ${timestamp}`;
        await page.getByTestId('routine-btn-create-new').click();
        await page.fill('label:has-text("Nombre") + input', routineName);
        await page.locator('form').getByRole('button', { name: 'Crear Plantilla' }).click();
        await expect(page.locator(`text=${routineName}`)).toBeVisible({ timeout: 15000 });

        const initialCards = await page.getByTestId(/^routine-card-/).count();

        // 2. Click Duplicate
        const card = page.getByTestId(`routine-card-${routineName}`);
        const duplicateBtn = card.locator('[data-testid^="btn-duplicate-routine-"]');
        await duplicateBtn.click();

        // 3. Verify new card
        const expectedName = `${routineName} (Copia)`;
        await expect(page.locator(`text=${expectedName}`)).toBeVisible({ timeout: 10000 });
        const finalCards = await page.getByTestId(/^routine-card-/).count();
        expect(finalCards).toBe(initialCards + 1);
    });

    test('can reorder blocks in a routine', async ({ page }) => {
        // 1. Create a routine with 2 blocks
        const timestamp = Date.now();
        const routineName = `OrderTest-${timestamp}-${Math.floor(Math.random() * 1000)}`;
        await page.getByTestId('routine-btn-create-new').click();
        await page.fill('label:has-text("Nombre") + input', routineName);
        await page.locator('form').getByRole('button', { name: 'Crear Plantilla' }).click();

        await page.getByTestId(`routine-card-${routineName}`).click();
        await expect(page.getByTestId('routine-title-header')).toContainText(routineName);

        // Add Block 1
        await page.getByTestId('routine-btn-add-exercise').click();
        await page.getByTestId('routine-exercise-search').fill('Press Banca');
        await page.locator('button[data-exercise-name="Press Banca"]').first().click();

        // Wait for modal to close and block to appear
        await expect(page.getByTestId('routine-exercise-search')).toBeHidden();
        await expect(page.getByTestId('routine-block-item')).toHaveCount(1);
        await expect(page.getByTestId('routine-block-item').locator('h3')).toHaveText(/press banca/i);

        // Add Block 2
        await page.getByTestId('routine-btn-add-exercise').click();
        await page.getByTestId('routine-exercise-search').fill('Sentadilla');
        await page.locator('button[data-exercise-name="Sentadilla"]').first().click();

        await expect(page.getByTestId('routine-exercise-search')).toBeHidden();
        await expect(page.getByTestId('routine-block-item')).toHaveCount(2);

        // 2. Verify initial order
        const firstBlockName = page.getByTestId('routine-block-item').nth(0).locator('h3');
        await expect(firstBlockName).toHaveText(/press banca/i);

        // 3. Move first block DOWN
        await page.getByTestId('routine-block-item').first().getByTestId('btn-move-block-down').click();

        // 4. Verify visual change
        await expect(page.getByTestId('routine-block-item').nth(0).locator('h3')).toHaveText(/sentadilla/i);
        await expect(page.getByTestId('routine-block-item').nth(1).locator('h3')).toHaveText(/press banca/i);

        // 5. Save and reload
        await page.getByTestId('routine-btn-save').click();
        await page.waitForURL('**/app/routines');

        await page.getByTestId(`routine-card-${routineName}`).click();
        await expect(page.getByTestId('routine-block-item')).toHaveCount(2);

        // 6. Verify persistence
        await expect(page.getByTestId('routine-block-item').nth(0).locator('h3')).toHaveText(/sentadilla/i);
        await expect(page.getByTestId('routine-block-item').nth(1).locator('h3')).toHaveText(/press banca/i);
    });

    test('can filter routines by category and search', async ({ page }) => {
        const timestamp = Date.now();
        const routineName = `FilterTest ${timestamp}`;

        // 1. Create a routine with 'Volumen' category
        await page.getByTestId('routine-btn-create-new').click();
        await page.fill('label:has-text("Nombre") + input', routineName);
        await page.getByLabel('Categoría').selectOption({ label: 'Volumen' });

        await page.locator('form').getByRole('button', { name: 'Crear Plantilla' }).click();

        // 2. Verify it's visible in 'Todas' using robust selector
        await expect(page.locator(`text=${routineName}`)).toBeVisible();
        await expect(page.getByTestId(`routine-card-${routineName}`)).toContainText('Volumen');

        // 3. Filter by 'Fuerza' (should disappear)
        await page.click('button:has-text("Fuerza")');
        await expect(page.locator(`text=${routineName}`)).not.toBeVisible();

        // 4. Filter by 'Volumen' (should reappear)
        await page.click('button:has-text("Volumen")');
        await expect(page.locator(`text=${routineName}`)).toBeVisible();

        // 5. Search by name
        await page.fill('input[placeholder="Buscar plantillas..."]', 'SomethingElse');
        await expect(page.locator(`text=${routineName}`)).not.toBeVisible();

        await page.fill('input[placeholder="Buscar plantillas..."]', routineName);
        await expect(page.locator(`text=${routineName}`)).toBeVisible();
    });
});
