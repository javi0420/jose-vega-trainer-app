import { test, expect } from '@playwright/test';

const TEST_USER = { email: 'trainer@test.com', pass: 'password123' };

test.describe('Data Integrity & Soft Delete Flow', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);
        await page.goto('/');

        if (!page.url().includes('/app')) {
            await page.getByTestId('login-input-email').fill(TEST_USER.email);
            await page.getByTestId('login-input-password').fill(TEST_USER.pass);
            await page.getByTestId('login-btn-submit').click();
            await expect(page).toHaveURL(/\/app/);
        }

        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
        }
    });

    test('Should archive exercise used in routine without breaking data integrity', async ({ page }) => {
        const uniqueSuffix = Date.now();
        const exName = `Integrity Exercise ${uniqueSuffix}`;
        const routineName = `Integrity Routine ${uniqueSuffix}`;

        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

        console.log('--- Step 1: Create Exercise ---');
        await page.goto('/app/exercises');
        await expect(page.locator('h1')).toContainText('Ejercicios');

        await page.click('button:has-text("Nuevo Ejercicio")');
        await page.getByTestId('exercise-name-input').fill(exName);
        await page.getByTestId('exercise-muscle-group-select').selectOption('pecho');

        console.log('Submitting exercise...');
        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('/rest/v1/exercises') && resp.status() === 201),
            await page.getByTestId('exercise-submit-btn').click()
        ]);
        console.log('Exercise created successfully.');

        console.log('--- Step 2: Create Routine ---');
        await page.goto('/app/routines');
        await page.getByTestId('routine-btn-create-new').click();
        await page.fill('label:has-text("Nombre") + input', routineName);
        await page.locator('form').getByRole('button', { name: 'Crear Plantilla' }).click();

        console.log('Entering routine detail...');
        await page.getByTestId(`routine-card-${routineName}`).scrollIntoViewIfNeeded();
        await page.getByTestId(`routine-card-${routineName}`).click();

        await page.getByTestId('routine-btn-add-exercise').click();

        console.log('Searching for exercise in modal...');
        const searchPromise = page.waitForResponse(resp => resp.url().includes('search_exercises'));
        await page.getByTestId('routine-exercise-search').pressSequentially(exName, { delay: 50 });
        await searchPromise;

        const exerciseBtn = page.locator(`button[data-exercise-name="${exName}"]`).or(page.locator('button').filter({ hasText: exName }));
        await expect(exerciseBtn.first()).toBeVisible({ timeout: 10000 });
        await exerciseBtn.first().click();

        // --- VERIFY LOCALLY ADDED ---
        await page.screenshot({ path: 'step2-exercise-added-locally.png' });
        await expect(page.locator('h3').filter({ hasText: new RegExp(exName, 'i') }).first()).toBeVisible();
        console.log('Exercise confirmed in local state.');

        console.log('Saving routine...');
        await page.getByTestId('routine-btn-save').click();

        // Use a more specific wait to ensure we actually navigated back to the list
        await expect(page).toHaveURL(/\/app\/routines$/);
        await expect(page.getByTestId('routine-btn-create-new')).toBeVisible();
        console.log('Routine saved and list loaded.');

        // 3. Attempt to "Delete" (Archive) the exercise
        console.log('--- Step 3: Archive Exercise ---');
        await page.goto('/app/exercises');
        await page.getByTestId('exercise-search-input').fill(exName);
        await page.waitForTimeout(1000); // Wait for filter

        // Handle confirmation dialog
        page.once('dialog', dialog => dialog.accept());

        // Target the specific exercise row delete button
        const exerciseRow = page.locator('div.flex').filter({ hasText: exName }).first();
        const deleteBtn = exerciseRow.locator('button[title="Eliminar"]');

        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('/rest/v1/exercises') && resp.ok()),
            deleteBtn.click()
        ]);
        console.log('Exercise archived.');

        // Verificación 4: El ejercicio desaparece del catálogo
        console.log('--- Step 4: Verify Catalog ---');
        await page.getByTestId('exercise-search-input').fill(exName);
        await expect(page.locator(`h3:has-text("${exName}")`)).not.toBeVisible();
        console.log('Verified: Gone from catalog.');

        // Verificación 5: La rutina sigue funcionando y muestra el ejercicio
        console.log('--- Step 5: Verify Routine Integrity ---');
        await page.getByTestId('nav-btn-routines').click();
        await page.getByTestId(`routine-card-${routineName}`).scrollIntoViewIfNeeded();
        await page.getByTestId(`routine-card-${routineName}`).click();

        // Wait for page to finish loading
        await expect(page.locator('.animate-spin')).not.toBeVisible();
        await expect(page.getByTestId('routine-title-header')).toBeVisible();

        await page.screenshot({ path: 'step5-integrity-final-2.png', fullPage: true });

        // Should show the exercise name even if archived (use regex for case-insensitivity)
        const routineExercise = page.locator('h3').filter({ hasText: new RegExp(exName, 'i') }).first();
        await expect(routineExercise).toBeVisible({ timeout: 10000 });
        console.log('Verified: Exercise still in routine.');
    });
});
