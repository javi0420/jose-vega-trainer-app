import { test, expect } from '@playwright/test';

// Client credentials
const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Session Insights E2E (Real Database)', () => {
    // Run sequentially to ensure data from Session A is available for Session B
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        // Handle dialogs globally
        page.on('dialog', dialog => dialog.accept());

        // Login as client
        await page.goto('/');
        await page.getByTestId('login-input-email').fill(CLIENT_USER.email);
        await page.getByTestId('login-input-password').fill(CLIENT_USER.pass);
        await page.getByTestId('login-btn-submit').click();
        await expect(page).toHaveURL(/\/app/, { timeout: 30000 });
    });

    test('Case 1 & 2: Full Workflow - Save Workout with Note and Verify in Next Session', async ({ page }) => {
        test.setTimeout(90000); // High timeout for full database cycle
        const uniqueNote = `TEST_WARN_${Date.now()}`;

        // --- STEP 1: Create Session A ---
        await page.getByTestId('new-workout-btn').click();
        await expect(page).toHaveURL(/\/new/);

        // Add an exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('li button');
        const exerciseItem = page.locator('li button').first();
        const exerciseName = (await exerciseItem.locator('p').innerText()).trim();
        await exerciseItem.click();

        // Wait for the block to appear
        await expect(page.locator(`text=${exerciseName}`).first()).toBeVisible({ timeout: 10000 });

        // Ensure at least one set exists
        const weightInput = page.getByTestId('workout-input-weight').first();
        if (!(await weightInput.isVisible())) {
            await page.getByTestId('workout-btn-add-set').first().click();
        }
        await expect(weightInput).toBeVisible();

        // Fill data
        await weightInput.fill('100');
        await page.getByTestId('workout-input-reps').first().fill('10');

        // Write technical note
        const notesField = page.locator('textarea[placeholder="Notas técnicas para hoy..."]').first();
        await notesField.fill(uniqueNote);

        // Complete the set and wait for UI update
        const completeBtn = page.getByTestId('workout-btn-complete-set').first();
        await completeBtn.click();
        await expect(completeBtn).toHaveClass(/bg-gold-500/);

        // Save and finalize
        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('save_full_workout') && resp.status() === 200),
            page.getByTestId('workout-btn-save').click()
        ]);

        // Should redirect to Workout Detail
        await expect(page).toHaveURL(/\/app\/workout\//, { timeout: 30000 });

        // --- VERIFY CASE 2: Tonnage in Summary ---
        await expect(page.locator('text=Volumen Total').first()).toBeVisible({ timeout: 10000 });
        // Calculation: 100 * 10 = 1.000 (Spanish locale) or 1,000 or 1000
        await expect(page.locator('text=/1[.,]?000/').first()).toBeVisible({ timeout: 10000 });

        // --- STEP 2: Verify Note in Session B ---
        await page.getByTestId('nav-btn-home').click();
        await page.getByTestId('new-workout-btn').click();

        // Add the SAME exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.getByPlaceholder('Buscar ejercicio...').fill(exerciseName);
        await page.waitForTimeout(1000); // Wait for search filter
        await page.locator('li button').first().click();

        // ASSERT: Automatic "Last Note" warning should appear
        await expect(page.locator('text=Nota de Sesión Anterior').first()).toBeVisible({ timeout: 20000 });
        await expect(page.getByText(uniqueNote)).toBeVisible({ timeout: 10000 });

        // Cleanup: Discard
        await page.getByTitle('Descartar entrenamiento').click();
    });
});
