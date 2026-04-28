import { test, expect } from '@playwright/test';

const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Feature: Copy Last Workout Data', () => {
    test.describe.configure({ mode: 'serial' });

    test('Should correctly copy sets from the most recent previous session', async ({ page }) => {
        // Debug hooks
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
        page.on('dialog', async dialog => {
            console.log(`DIALOG: ${dialog.message()}`);
            await dialog.accept();
        });

        // Generate unique values to avoid collision with stale test data
        const TEST_WEIGHT = (50 + Math.floor(Math.random() * 50)).toString(); // 50-99
        const TEST_REPS = (10 + Math.floor(Math.random() * 10)).toString();   // 10-19

        // 1. Login
        await page.goto('/');
        await page.fill('input[type="email"]', CLIENT_USER.email);
        await page.fill('input[type="password"]', CLIENT_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/);

        // Handle Privacy Consent Modal if it appears
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
            await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
        }

        // 2. Clear any existing workout state
        await page.evaluate(() => {
            localStorage.removeItem('draft_workout');
            localStorage.removeItem('active_workout_id');
        });

        // 3. Create "Workout A" with unique data
        await page.click('button:has-text("Nuevo Entreno")');
        await expect(page).toHaveURL(/\/new/);

        // Add Exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('ul li button');
        await page.locator('ul li button').first().click();
        await page.waitForTimeout(500);

        // Fill Data
        await page.click('button:has-text("Set")');
        const weightInput_A = page.getByTestId('workout-input-weight').first();
        const repsInput_A = page.getByTestId('workout-input-reps').first();
        await expect(weightInput_A).toBeVisible({ timeout: 5000 });
        await weightInput_A.fill(TEST_WEIGHT);
        await repsInput_A.fill(TEST_REPS);

        // Complete Set
        const completeBtn = page.getByTestId('workout-btn-complete-set').first();
        await completeBtn.click();

        // Save
        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('save_full_workout') && resp.status() === 200),
            page.getByTestId('workout-btn-save').click()
        ]);
        await expect(page).toHaveURL(/\/app\/workout\//);

        // 4. Create "Workout B" (New Session)
        await page.getByTestId('nav-btn-home').click();
        await page.click('button:has-text("Nuevo Entreno")');
        await expect(page).toHaveURL(/\/new/);

        // Add SAME Exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('ul li button');
        await page.locator('ul li button').first().click();
        await page.waitForTimeout(500);

        // 5. Click "Copiar Último"
        const copyPromise = page.waitForResponse(resp => resp.url().includes('get_last_exercise_session') && resp.status() === 200, { timeout: 10000 });
        await page.click('button[title="Copiar último"]', { force: true });
        await copyPromise;

        // 6. Verify Data is Pre-filled (As Placeholders)
        const weightInput = page.locator(`input[placeholder="${TEST_WEIGHT}"]`).first();
        const repsInput = page.locator(`input[placeholder="${TEST_REPS}"]`).first();

        await expect(weightInput).toBeVisible({ timeout: 10000 });
        await expect(repsInput).toBeVisible({ timeout: 10000 });

        // P4 Fix: RIR debe estar VACÍO
        const rirInput = page.getByTestId('workout-input-rpe').first();
        if (await rirInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            const rirValue = await rirInput.inputValue();
            expect(rirValue, 'RIR debe estar vacío tras copiar última sesión').toBe('');
        }
    });
});
