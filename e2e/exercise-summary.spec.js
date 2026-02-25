import { test, expect } from '@playwright/test';

const CLIENT = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Exercise Summary Display Fix', () => {

    test('Completed exercises show statistics in summary', async ({ page }) => {
        test.setTimeout(180000);

        // 1. Login
        await page.goto('/');
        await page.fill('input[placeholder="nombre@ejemplo.com"]', CLIENT.email);
        await page.fill('input[placeholder="••••••••"]', CLIENT.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL('/app');
        await page.waitForLoadState('networkidle');

        // Handle Privacy Modal
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
            await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
        }

        // 2. New Workout
        await page.click('button:has-text("Nuevo Entreno")');
        await expect(page).toHaveURL(/\/new/);

        // 3. Add Exercise (Catalog Search)
        await page.click('button:has-text("Añadir Ejercicio")');
        const exerciseName = 'Press Banca';
        const searchInput = page.getByPlaceholder('Buscar ejercicio...');
        await searchInput.fill(exerciseName);
        await page.waitForTimeout(1500);

        await page.locator('ul li button').filter({ hasText: exerciseName }).first().click();
        await expect(page.locator('h2:has-text("Añadir Ejercicio")')).toBeHidden({ timeout: 10000 });
        await page.waitForTimeout(500);

        // 4. Add and complete a set
        const addSetBtn = page.getByTestId('workout-btn-add-set').first();
        await addSetBtn.click();

        await page.getByTestId('workout-input-weight').first().fill('100');
        await page.getByTestId('workout-input-reps').first().fill('10');
        await page.getByTestId('workout-btn-complete-set').first().click();
        await page.waitForTimeout(500);

        // 5. Save
        await page.getByTestId('workout-btn-save').click();

        // 6. Verification
        await expect(page).toHaveURL(/\/app\/workout\//, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        // Check summary header using new test-id
        await expect(page.getByTestId('workout-summary-title')).toBeVisible({ timeout: 30000 });
        await expect(page.getByRole('heading', { name: exerciseName })).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('summary-best-set-value')).toContainText('100kg × 10');
    });

    test('Incomplete exercises show appropriate message in summary', async ({ page }) => {
        test.setTimeout(180000);

        // 1. Login
        await page.goto('/');
        await page.fill('input[placeholder="nombre@ejemplo.com"]', CLIENT.email);
        await page.fill('input[placeholder="••••••••"]', CLIENT.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL('/app');

        // Handle Privacy Modal
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
            await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
        }

        // 2. New Workout
        await page.click('button:has-text("Nuevo Entreno")');

        // 3. Add Exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        const exerciseName = 'Sentadilla';
        const searchInput = page.getByPlaceholder('Buscar ejercicio...');
        await searchInput.fill(exerciseName);
        await page.waitForTimeout(1500);

        await page.locator('ul li button').filter({ hasText: exerciseName }).first().click();
        await expect(page.locator('h2:has-text("Añadir Ejercicio")')).toBeHidden({ timeout: 10000 });

        // 4. Add incomplete sets
        const addSetBtn = page.getByTestId('workout-btn-add-set').first();
        await addSetBtn.click();
        await page.waitForTimeout(300);
        await addSetBtn.click();
        await page.waitForTimeout(500);

        // 5. Save (Handle confirmation dialog for 0 completed sets)
        page.once('dialog', dialog => dialog.accept());
        await page.getByTestId('workout-btn-save').click();

        // 6. Verification
        await expect(page).toHaveURL(/\/app\/workout\//, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        await expect(page.getByTestId('workout-summary-title')).toBeVisible({ timeout: 30000 });
        await expect(page.getByRole('heading', { name: exerciseName })).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('exercise-no-valid-sets')).toContainText('series sin completar');
        await expect(page.getByTestId('summary-best-set-value')).not.toBeVisible();
    });

    test('Mixed workout shows both completed and incomplete exercises', async ({ page }) => {
        test.setTimeout(180000);

        // 1. Login
        await page.goto('/');
        await page.fill('input[placeholder="nombre@ejemplo.com"]', CLIENT.email);
        await page.fill('input[placeholder="••••••••"]', CLIENT.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL('/app');

        // Handle Privacy Modal
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
            await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
        }

        // 2. New Workout
        await page.click('button:has-text("Nuevo Entreno")');

        // 3. Add Exercise 1 (Complete)
        await page.click('button:has-text("Añadir Ejercicio")');
        const ex1Name = 'Press Banca';
        await page.getByPlaceholder('Buscar ejercicio...').fill(ex1Name);
        await page.waitForTimeout(1500);
        await page.locator('ul li button').filter({ hasText: ex1Name }).first().click();
        await expect(page.locator('h2:has-text("Añadir Ejercicio")')).toBeHidden();

        await page.getByTestId('workout-btn-add-set').first().click();
        await page.getByTestId('workout-input-weight').first().fill('80');
        await page.getByTestId('workout-input-reps').first().fill('12');
        await page.getByTestId('workout-btn-complete-set').first().click();

        // 4. Add Exercise 2 (Incomplete)
        await page.click('button:has-text("Añadir Ejercicio")');
        const ex2Name = 'Sentadilla';
        await page.getByPlaceholder('Buscar ejercicio...').fill(ex2Name);
        await page.waitForTimeout(1500);
        await page.locator('ul li button').filter({ hasText: ex2Name }).first().click();
        await expect(page.locator('h2:has-text("Añadir Ejercicio")')).toBeHidden();

        await page.getByTestId('workout-btn-add-set').last().click();

        // 5. Save
        await page.getByTestId('workout-btn-save').click();

        // 6. Verification
        await expect(page).toHaveURL(/\/app\/workout\//, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        await expect(page.getByTestId('workout-summary-title')).toBeVisible({ timeout: 30000 });
        await expect(page.getByRole('heading', { name: ex1Name })).toBeVisible();
        await expect(page.getByRole('heading', { name: ex2Name })).toBeVisible();
        await expect(page.getByTestId('summary-best-set-value').first()).toContainText('80kg × 12');
        await expect(page.getByTestId('exercise-no-valid-sets')).toContainText('sin completar');
    });
});
