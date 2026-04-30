import { test, expect } from '@playwright/test';

test.describe('Navigation Flow (Trainer)', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);
        await page.goto('/');
        await page.getByTestId('login-input-email').fill('trainer@test.com');
        await page.getByTestId('login-input-password').fill('password123');
        await page.getByTestId('login-btn-submit').click();
        await expect(page).toHaveURL(/\/app/);
    });

    test('saving a template redirects to Mis Plantillas', async ({ page }) => {
        await page.getByTestId('nav-btn-routines').click();
        await page.getByRole('button', { name: 'Crear Nueva Plantilla' }).click();

        const timestamp = Date.now();
        const routineName = `Template Flow ${timestamp}`;
        await page.fill('label:has-text("Nombre") + input', routineName);
        await page.locator('form').getByRole('button', { name: 'Crear Plantilla' }).click();

        await page.click(`text=${routineName}`);
        await page.click('button:has-text("GUARDAR")');

        await expect(page).toHaveURL(/\/app\/routines/);
        await expect(page.locator('h1:has-text("Mis Plantillas")')).toBeVisible();
    });

    test('saving a client routine redirects to Dashboard with client selected', async ({ page }) => {
        // 1. Create a fresh client to ensure they exist and we have the name
        const uniqueId = Date.now();
        const clientName = `Flow Client ${uniqueId}`;
        const clientEmail = `flow_${uniqueId}@test.com`;

        await page.click('button[title="Añadir Cliente"]');
        await page.fill('input[placeholder="Ej: Juan Pérez"]', clientName);
        await page.fill('input[placeholder="ejemplo@email.com"]', clientEmail);
        await page.click('button:has-text("Crear Cliente")');
        await expect(page.locator(`text=${clientEmail}`)).toBeVisible();

        // 2. Open their routine management
        // Use search to find the client reliably
        await page.getByPlaceholder('Buscar cliente...').fill(clientEmail);
        await page.waitForTimeout(1000);

        // Use 'row' role (rendered as <tr> with role=row) or target by visible text
        const clientRow = page.locator(`[role="row"]:has-text("${clientEmail}")`).first();
        await clientRow.scrollIntoViewIfNeeded();
        await expect(clientRow).toBeVisible();
        // Click the "Gestionar Rutinas" button within the row (uses title attribute, not text content)
        await clientRow.locator('button[title="Gestionar Rutinas"]').click();

        // 3. Wait for the Routine Management panel/modal to open
        // "Crear desde cero" appears in the AssignRoutineModal that slides open
        const crearBtn = page.locator('button:has-text("Crear desde cero")');
        await expect(crearBtn).toBeVisible({ timeout: 10000 });
        await crearBtn.click();
        
        // The form expands inline: fill name and confirm
        const nameInput = page.locator('input[value="Nueva Rutina"]');
        await expect(nameInput).toBeVisible({ timeout: 5000 });
        await nameInput.fill(`Routine ${uniqueId}`);
        await page.locator('button:has-text("Confirmar Creación")').click();
        
        // After creation, app shows a ConfirmModal asking:
        // "La rutina se ha creado y asignado con éxito. ¿Deseas ir a editarla ahora?"
        // We must click "Ir a editar" to navigate to /app/routines/{id}
        const irAEditarBtn = page.locator('button:has-text("Ir a editar")');
        await expect(irAEditarBtn).toBeVisible({ timeout: 10000 });
        await irAEditarBtn.click();

        // Wait for redirect to Routine Editor (client-side navigation)
        await expect(page).toHaveURL(/\/app\/routines\/.+/, { timeout: 20000 });
        await page.waitForLoadState('networkidle');

        // 4. Save the routine
        const saveBtn = page.getByRole('button', { name: 'GUARDAR' }).or(page.locator('button:has-text("GUARDAR")'));
        await saveBtn.click();

        // 5. Verify redirection back to Dashboard
        await expect(page).toHaveURL(/\/app/, { timeout: 30000 });

        // 6. Verify client is pre-selected in the Feed
        await expect(page.locator('text=Filtrando por: ' + clientName).first()).toBeVisible();
    });
});
