import { test, expect } from '@playwright/test';

test.describe('Routine Editor UX & Focus Management', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(60000);
        await page.goto('/');
        await page.getByTestId('login-input-email').fill('trainer@test.com');
        await page.getByTestId('login-input-password').fill('password123');
        await page.getByTestId('login-btn-submit').click();
        await expect(page).toHaveURL(/\/app/);

        await page.getByTestId('nav-btn-routines').click();
    });

    test('header should remain in edit mode when switching between name, description and category', async ({ page }) => {
        // 1. Create a dummy routine or open an existing one
        await page.getByTestId('routine-btn-create-new').click();
        const routineName = `FocusTest-${Date.now()}`;
        await page.fill('label:has-text("Nombre") + input', routineName);
        await page.locator('form').getByRole('button', { name: 'Crear Plantilla' }).click();

        await page.getByTestId(`routine-card-${routineName}`).click();

        // 2. Start editing
        await page.getByTestId('routine-name-edit').click();
        const nameInput = page.getByTestId('routine-name-input');
        await expect(nameInput).toBeVisible();

        // 3. Click on Description (should NOT close edit mode)
        await page.getByPlaceholder('Descripción corta...').click();
        await expect(nameInput).toBeVisible(); // Name input should still be there

        // 4. Click on Category (should NOT close edit mode)
        await page.locator('select').filter({ hasText: /Sin Categoría/i }).click();
        await expect(nameInput).toBeVisible();

        // 5. Change name and press Enter (should close edit mode)
        await nameInput.fill(routineName + ' Updated');
        await page.keyboard.press('Enter');
        await expect(nameInput).toBeHidden();
        await expect(page.getByTestId('routine-title-header')).toContainText('Updated');
    });

    test('increment/decrement buttons in RoutineBlock should be visible and not distorted', async ({ page }) => {
        // Open a routine that has exercises
        // (We reuse the 'can use quick controls' logic partially)
        await page.getByTestId('routine-btn-create-new').click();
        const routineName = `SizeTest-${Date.now()}`;
        await page.fill('label:has-text("Nombre") + input', routineName);
        await page.locator('form').getByRole('button', { name: 'Crear Plantilla' }).click();

        await page.getByTestId(`routine-card-${routineName}`).click();
        await page.getByTestId('routine-btn-add-exercise').click();
        await page.getByTestId('routine-exercise-search').fill('Press Banca');
        await page.locator('button[data-exercise-name="Press Banca"]').first().click();

        // Wait for modal to hide
        await expect(page.getByTestId('routine-exercise-search')).toBeHidden();

        // Verify buttons have the correct size (h-12 = 48px)
        const plusBtn = page.getByLabel('Aumentar series').first();
        await expect(plusBtn).toBeVisible();

        const box = await plusBtn.boundingBox();
        expect(box.height).toBeGreaterThanOrEqual(44); // Standard touch target
        expect(box.width).toBeGreaterThanOrEqual(44);

        // Verify no distortion (should be roughly square)
        const ratio = box.width / box.height;
        expect(ratio).toBeGreaterThan(0.8);
        expect(ratio).toBeLessThan(1.2);
    });
});
