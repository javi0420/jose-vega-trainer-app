import { test, expect } from '@playwright/test';

test.describe('Workout Name Editor (Bottom Sheet)', () => {
    test.beforeEach(async ({ page }) => {
        // Direct jump to new workout (assuming auto-login for simplicity or using MOCK logic)
        // For this test, we'll use a real login or mock if possible. 
        // Using real login for reliability against current db.
        await page.goto('/');
        await page.fill('input[type="email"]', 'lindo@test.com');
        await page.fill('input[type="password"]', 'IronTrack2025');
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/);

        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/new/);
    });

    test('should open sheet, receive focus and apply changes', async ({ page }) => {
        const trigger = page.getByTestId('workout-header-title-trigger');
        await trigger.click();

        const input = page.getByTestId('workout-name-edit-input');
        await expect(input).toBeVisible();
        await expect(input).toBeFocused();

        const newName = 'Workout Super Alpha';
        await input.fill(newName);
        await page.getByTestId('workout-name-save-btn').click();

        await expect(input).toBeHidden();
        await expect(trigger).toContainText(newName);
    });

    test('should NOT apply changes if cancelled', async ({ page }) => {
        const trigger = page.getByTestId('workout-header-title-trigger');
        const initialName = await trigger.textContent();

        await trigger.click();
        const input = page.getByTestId('workout-name-edit-input');
        await input.fill('Trash Name');
        await page.getByTestId('workout-name-cancel-btn').click();

        await expect(input).toBeHidden();
        await expect(trigger).toContainText(initialName);
    });

    test('should disable save button if name is empty', async ({ page }) => {
        await page.getByTestId('workout-header-title-trigger').click();

        const input = page.getByTestId('workout-name-edit-input');
        const saveBtn = page.getByTestId('workout-name-save-btn');

        await input.fill('   '); // Whitespace
        await expect(saveBtn).toBeDisabled();

        await input.fill('Valid Name');
        await expect(saveBtn).toBeEnabled();
    });
});
