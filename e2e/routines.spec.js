import { test, expect } from '@playwright/test';

test.describe('Routines UI', () => {
    test.beforeEach(async ({ page }) => {
        // Increase timeout for this suite as login + navigation is slow
        test.setTimeout(90000);

        // Login
        await page.goto('/');
        // Use data-testid for login
        await page.getByTestId('login-input-email').fill('trainer@test.com');
        await page.getByTestId('login-input-password').fill('password123');
        await page.getByTestId('login-btn-submit').click();
        await expect(page).toHaveURL(/\/app/);

        // Go to routines page using data-testid
        await page.getByTestId('nav-btn-routines').click();
        await expect(page.locator('h1:has-text("Mis Plantillas")')).toBeVisible();
    });

    test('can create a new routine and see it in the list', async ({ page }) => {
        // 1. Open Modal
        await page.getByTestId('routine-btn-create-new').click();
        await expect(page.locator('h2:has-text("Nueva Plantilla")')).toBeVisible();

        // Fill Form
        const timestamp = Date.now();
        const routineName = `Routine Test ${timestamp}`;
        await page.fill('label:has-text("Nombre") + input', routineName);
        await page.fill('label:has-text("Descripción") + textarea', 'Description from E2E');

        // Submit
        await page.locator('form').getByRole('button', { name: 'Crear Plantilla' }).click();
        await expect(page.getByTestId('create-routine-modal')).toBeHidden({ timeout: 15000 });

        // 4. Verify Modal Closed and Item Exists
        await expect(page.getByTestId('create-routine-modal')).toBeHidden();

        // Clear search to be sure
        await page.getByPlaceholder('Buscar plantillas...').fill('');

        // Wait for list update
        await expect(page.locator(`text=${routineName}`)).toBeVisible();
    });

    test('can navigate to routine detail', async ({ page }) => {
        // 1. Create a routine first to ensure one exists
        await page.getByRole('button', { name: 'Crear Nueva Plantilla' }).click();
        const timestamp = Date.now();
        const routineName = `Routine Detail Test ${timestamp}`;
        await page.fill('label:has-text("Nombre") + input', routineName);
        await page.locator('form').getByRole('button', { name: 'Crear Plantilla' }).click();
        await expect(page.getByTestId('create-routine-modal')).toBeHidden();

        // 2. Click on the routine to navigate (click the clickable card)
        await page.getByTestId(`routine-card-${routineName}`).click();

        // 3. Verify URL and Header
        await expect(page).toHaveURL(/\/app\/routines\/.+/);
        await expect(page.locator('h1')).toContainText(routineName);
        await expect(page.locator('text=Añadir Primer Ejercicio')).toBeVisible();
    });

    test('can edit an existing routine (template)', async ({ page }) => {
        // 1. Create routine
        const timestamp = Date.now();
        const routineName = `Routine_${timestamp}`;
        const suffix = Math.floor(Math.random() * 10000);
        const newName = `Renamed_${suffix}`;

        await page.getByRole('button', { name: 'Crear Nueva Plantilla' }).click();
        await page.fill('label:has-text("Nombre") + input', routineName);
        await page.locator('form').getByRole('button', { name: 'Crear Plantilla' }).click();
        await expect(page.getByTestId('create-routine-modal')).toBeHidden();
        await expect(page.locator(`text=${routineName}`)).toBeVisible();

        // 2. Open Detail View using the new clickable card
        await page.getByTestId(`routine-card-${routineName}`).click({ force: true });

        // Wait for heading to be visible to ensure redirect
        await expect(page.locator('h1')).toContainText(routineName);

        // 3. Edit Name (Clicking the title in detail view to edit)
        await page.getByTestId('routine-name-edit').click();
        const nameInput = page.getByTestId('routine-name-input');
        await expect(nameInput).toBeVisible();

        await nameInput.click();
        await nameInput.clear();
        await nameInput.fill(newName);
        await page.keyboard.press('Enter');

        // Wait for input to be gone (edit mode closed)
        await expect(nameInput).toBeHidden({ timeout: 10000 });

        // Verify the heading shows the new name
        const heading = page.getByTestId('routine-title-header');
        await expect(heading).toBeVisible();
        await expect(heading).toContainText(newName, { timeout: 10000 });

        // Save
        const savePromise = page.waitForResponse(resp => resp.url().includes('/rest/v1/routines') && resp.request().method() === 'PATCH');
        await page.getByTestId('routine-btn-save').click();
        await savePromise;

        await page.waitForURL(/.*\/app\/routines$/);

        // 4. Verify Change in List
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000); // Resilience for list re-render

        // Explicitly clear search to ensure item is visible
        await page.getByTestId('routine-input-search').clear();
        await page.waitForTimeout(500);

        // Verify renamed routine appears using text locator (more stable for dynamic content)
        await expect(page.locator('h2', { hasText: newName })).toBeVisible({ timeout: 15000 });

        // Verify the old name is not present
        await expect(page.locator('h2', { hasText: routineName })).toHaveCount(0);
    });

    test('can delete a routine (template)', async ({ page }) => {
        // 1. Create routine
        const timestamp = Date.now();
        const routineName = `Routine Delete Test ${timestamp}`;

        await page.getByRole('button', { name: 'Crear Nueva Plantilla' }).click();
        await page.fill('label:has-text("Nombre") + input', routineName);
        await page.locator('form').getByRole('button', { name: 'Crear Plantilla' }).click();
        await expect(page.getByTestId('create-routine-modal')).toBeHidden();
        await expect(page.locator(`text=${routineName}`)).toBeVisible();

        // 2. Navigate to Detail
        await page.getByTestId(`routine-card-${routineName}`).click({ force: true });

        // 3. Delete
        await page.getByTestId('btn-delete-routine').click();

        // Handle Deletion Summary Modal
        const modal = page.locator('h3:has-text("Eliminar Plantilla")');
        await expect(modal).toBeVisible();
        await page.click('button:has-text("Confirmar Borrado")');

        // 4. Verify Removal
        await expect(page.locator('h1:has-text("Mis Plantillas")')).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(500); // Wait for list refresh
        await expect(page.locator(`text=${routineName}`)).toBeHidden({ timeout: 10000 });
    });

    test('can use quick controls and notes', async ({ page }) => {
        const timestamp = Date.now();
        const routineName = `QE-${timestamp}`;

        await page.getByRole('button', { name: 'Crear Nueva Plantilla' }).click();
        await page.fill('label:has-text("Nombre") + input', routineName);
        await page.locator('form').getByRole('button', { name: 'Crear Plantilla' }).click();
        await expect(page.getByText('Nueva Plantilla')).toBeHidden();

        await page.getByTestId(`routine-card-${routineName}`).click();
        await page.getByTestId('routine-btn-add-exercise').click();

        // Wait for modal to be visible
        await expect(page.locator('input[placeholder="Buscar ejercicio..."]')).toBeVisible({ timeout: 5000 });

        await page.fill('input[placeholder="Buscar ejercicio..."]', 'Abducción de Cadera');
        await page.waitForTimeout(300); // Wait for search
        await page.click('button:has-text("Abducción de Cadera")');

        // CRITICAL: Wait for modal to close
        await expect(page.locator('input[placeholder="Buscar ejercicio..."]')).not.toBeVisible({ timeout: 5000 });

        // Wait for exercise to appear in DOM
        await expect(page.locator('h3:has-text("Abducción de Cadera")')).toBeVisible({ timeout: 10000 });

        // Adjust values
        await page.getByLabel('Aumentar series').first().click();
        await page.getByLabel('Aumentar RPE').first().click();

        const notesText = "E2E Note " + timestamp;
        const notesField = page.locator('textarea[placeholder*="Instrucciones"]').first();
        await notesField.type(notesText);
        await notesField.blur();

        // Save and wait for redirect
        await page.getByTestId('routine-btn-save').click();
        await page.waitForURL('**/app/routines');

        // Re-open and verify
        console.log('Re-opening routine to verify persistence...');
        await page.getByTestId(`routine-card-${routineName}`).click();

        // Wait for routine to load (title in header)
        await expect(page.locator('h1')).toContainText(routineName);

        const seriesInput = page.locator('input[id*="series"]').first();
        const rpeInput = page.locator('input[id*="rpe"]').first();
        const finalNotesValue = page.locator('textarea[placeholder*="Instrucciones"]').first();

        console.log('Verifying final values...');
        await expect(seriesInput).toHaveValue('4', { timeout: 10000 });
        await expect(rpeInput).toHaveValue(/8\.5/, { timeout: 10000 });
        await expect(finalNotesValue).toHaveValue(notesText, { timeout: 10000 });
        console.log('Values verified successfully.');
    });
});
