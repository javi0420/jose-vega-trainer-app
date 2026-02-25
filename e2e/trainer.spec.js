import { test, expect } from '@playwright/test';

const TRAINER = { email: 'trainer@test.com', pass: 'password123' };
const DEFAULT_CLIENT_PASS = 'Joaquin2025';

test.describe('Trainer Workflow Suite', () => {
    // Run tests sequentially to avoid session/RLS conflicts
    test.describe.configure({ mode: 'serial' });

    test('1. Auth Flows (Login Success, Fail, Logout)', async ({ page }) => {
        // A. Login Incorrecto
        await page.goto('/');
        await page.fill('input[type="email"]', 'wrong@test.com');
        await page.fill('input[type="password"]', 'badpass');
        await page.click('button:has-text("Iniciar Sesión")');
        // Expect error message
        await expect(page.locator('.text-red-200')).toBeVisible();

        // B. Login Correcto
        await page.fill('input[type="email"]', TRAINER.email);
        await page.fill('input[type="password"]', TRAINER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/);
        await expect(page.locator('text=Panel de Entrenador')).toBeVisible();

        // C. Cerrar Sesión
        // Use force to click even if something overlaps or is tricky
        await page.click('button[aria-label="Cerrar sesión"]', { force: true });

        // Assert we are back at login
        await expect(page).toHaveURL('/', { timeout: 10000 });
        await expect(page.locator('button:has-text("Iniciar Sesión")')).toBeVisible();
    });

    test('2. Client Management (Create, Edit, Filter, Delete)', async ({ page }) => {
        // Setup: Login
        await page.goto('/');
        await page.fill('input[type="email"]', TRAINER.email);
        await page.fill('input[type="password"]', TRAINER.pass);
        await page.click('button:has-text("Iniciar Sesión")');

        const uniqueId = Date.now();
        const clientName = `Test Client ${uniqueId}`;
        const clientEmail = `client${uniqueId}@test.com`;

        // A. Creación de Cliente
        await page.click('button[title="Añadir Cliente"]');
        await expect(page.locator('text=Nuevo Cliente')).toBeVisible();

        await page.fill('input[placeholder="Ej: Juan Pérez"]', clientName);
        await page.fill('input[placeholder="ejemplo@email.com"]', clientEmail);

        // Handle Dialog (Alert with Password)
        page.once('dialog', dialog => {
            console.log(`Alert message: ${dialog.message()}`);
            dialog.dismiss();
        });

        await page.click('button:has-text("Crear Cliente")');

        // Wait for modal to close (alert is handled by event listener)
        await expect(page.locator('text=Nuevo Cliente')).not.toBeVisible({ timeout: 10000 });
        // A. Creación de Cliente

        // B. Filtrado
        await page.fill('input[placeholder="Buscar cliente..."]', uniqueId.toString());
        await expect(page.locator(`text=${clientName}`)).toBeVisible();
        // B. Filtrado

        // C. Edición
        // New Pattern: Find row -> Open menu -> Click action
        const clientRow = page.getByTestId(`client-card-${clientName}`).last();
        await clientRow.getByTestId('actions-trigger').click({ force: true });
        await page.getByTestId('action-edit').click({ force: true });

        await expect(page.locator('text=Editar Cliente')).toBeVisible();

        const newName = `${clientName} Edited`;
        await page.fill('input[value="' + clientName + '"]', newName);
        await page.getByRole('button', { name: 'Guardar Cambios' }).click();

        // Wait for update with a small buffer
        await page.waitForTimeout(1000);
        await expect(page.getByText(newName).first()).toBeVisible({ timeout: 15000 });

        // D. Borrado
        // New Pattern: Find row -> Open menu -> Click action
        const editedRow = page.getByTestId(`client-card-${newName}`).last();
        await editedRow.getByTestId('actions-trigger').click({ force: true });

        // Handle delete confirmation dialogs
        page.on('dialog', dialog => {
            console.log(`[Delete Test] Accepting dialog: ${dialog.message()}`);
            dialog.accept();
        });

        // Wait for removal
        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('/rest/v1/rpc/delete_client_completely') && resp.ok(), { timeout: 15000 }),
            page.getByTestId('action-delete').click({ force: true })
        ]);

        await expect(page.locator(`text=${newName}`)).not.toBeVisible();
        // D. Borrado
    });

    test('3. Exercise Creation & Deletion', async ({ page }) => {
        // Debug Dialogs
        page.on('dialog', dialog => {
            console.log(`[Exercise Test Check] Dialog: ${dialog.message()}`);
            dialog.accept();
        });

        // Login
        await page.goto('/');
        await page.fill('input[type="email"]', TRAINER.email);
        await page.fill('input[type="password"]', TRAINER.pass);
        await page.click('button:has-text("Iniciar Sesión")');

        // Nav to Exercises
        await page.click('text=Catálogo de Ejercicios');
        await expect(page).toHaveURL(/\/app\/exercises/);

        // Create
        await page.click('button:has-text("Nuevo Ejercicio")');

        const exName = `Test Exercise ${Date.now()}`;
        // Wait for modal
        await expect(page.locator('text=Nuevo Ejercicio').last()).toBeVisible();

        await page.fill('input[placeholder="Ej: Press de Banca"]', exName);
        await page.selectOption('select', 'pecho'); // Value 'pecho'

        // Wait for network response (robustness) - accept any success status
        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('/rest/v1/exercises') && resp.ok(), { timeout: 60000 }),
            page.click('button:has-text("Crear Ejercicio")')
        ]);

        // Verify
        await page.fill('input[placeholder*="Buscar"]', exName);

        // Wait for list to update and verify
        await expect(page.locator(`text=${exName}`)).toBeVisible();

        // Delete
        // Ensure we accept the confirm dialog (which we handled globally above, but ensure it triggers)
        // search term is filtered, so target the delete button in the visible card
        const deleteBtn = page.locator('button[title="Eliminar"]').first();
        await expect(deleteBtn).toBeVisible();

        // Wait for DELETE response
        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('/rest/v1/exercises') && resp.status() === 204, { timeout: 10000 }),
            deleteBtn.click()
        ]);

        // Clear search field to see full list and verify deletion
        await page.fill('input[placeholder*="Buscar"]', '');

        // Give React Query time to refetch and update the DOM
        await page.waitForTimeout(2000);

        // Wait for the specific exercise to be removed from DOM
        await page.waitForSelector(`h3:has-text("${exName}")`, { state: 'detached', timeout: 10000 });
    });

    test('4. Full Lifecycle: Create Client -> Logout -> Login as Client', async ({ page }) => {
        // 1. Login Trainer
        await page.goto('/');
        await page.fill('input[type="email"]', TRAINER.email);
        await page.fill('input[type="password"]', TRAINER.pass);
        await page.click('button:has-text("Iniciar Sesión")');

        // 2. Create Client
        const uniqueId = Date.now();
        const clientEmail = `newlogin${uniqueId}@test.com`;

        await page.click('button[title="Añadir Cliente"]');
        await page.fill('input[placeholder="Ej: Juan Pérez"]', 'Login User');
        await page.fill('input[placeholder="ejemplo@email.com"]', clientEmail);

        page.once('dialog', dialog => dialog.accept());

        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('/rest/v1/rpc/create_client_as_trainer') && resp.ok(), { timeout: 15000 }),
            page.click('button:has-text("Crear Cliente")')
        ]);
        await expect(page.locator('text=Nuevo Cliente')).not.toBeVisible();

        // 3. Logout Trainer
        // Wait for any toast/alert effects to settle
        await page.waitForTimeout(2000);
        await page.click('button[aria-label="Cerrar sesión"]', { force: true });
        await expect(page).toHaveURL('/', { timeout: 15000 });
        await expect(page.locator('button:has-text("Iniciar Sesión")')).toBeVisible();

        await page.waitForTimeout(1000);

        // 4. Login as New Client
        await page.fill('input[type="email"]', clientEmail);
        await page.fill('input[type="password"]', DEFAULT_CLIENT_PASS);

        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('/auth/v1/token') && resp.ok(), { timeout: 15000 }),
            page.click('button:has-text("Iniciar Sesión")')
        ]);

        // 5. Verify Access (Client Dashboard)
        await expect(page).toHaveURL(/\/app/, { timeout: 20000 });
        // Client dashboard has "Nuevo Entreno" button
        await expect(page.locator('text=Nuevo Entreno')).toBeVisible();

        console.log(`Created and tested user: ${clientEmail}`);
    });

});
