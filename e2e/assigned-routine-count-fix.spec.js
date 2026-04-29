import { test, expect } from '@playwright/test';

test.describe('Bugfix: Assigned Routine Exercise Count', () => {
    const trainerEmail = 'trainer@test.com';
    const password = 'password123';

    test('should show correct exercise count in assigned routines list', async ({ page }) => {
        test.setTimeout(90000);

        // 1. Login as trainer
        await page.goto('/');
        await page.fill('input[type="email"]', trainerEmail);
        await page.fill('input[type="password"]', password);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/);

        // 2. Create a routine with 2 exercises
        await page.goto('/app/routines');
        const timestamp = Date.now();
        const routineName = `CountTest ${timestamp}`;

        await page.click('button[title="Crear Nueva Plantilla"]');
        await page.fill('input[id="routine-name"]', routineName);
        await page.click('button:has-text("Crear Plantilla")');
        await page.waitForTimeout(1000);

        // Add 2 exercises
        await page.getByTestId(`routine-card-${routineName}`).click();
        await page.getByTestId('routine-btn-add-exercise').click();

        // Add Exercise 1
        await page.fill('input[placeholder="Buscar ejercicio..."]', 'Press de Banca');
        await page.waitForTimeout(500);
        await page.click('button:has-text("Press de Banca")');
        await expect(page.locator('input[placeholder="Buscar ejercicio..."]')).not.toBeVisible();

        // Add Exercise 2
        await page.getByTestId('routine-btn-add-exercise').click();
        await page.fill('input[placeholder="Buscar ejercicio..."]', 'Sentadilla');
        await page.waitForTimeout(500);
        await page.click('button:has-text("Sentadilla")');
        await expect(page.locator('input[placeholder="Buscar ejercicio..."]')).not.toBeVisible();

        await page.screenshot({ path: 'trainer-routine-before-save.png' });
        await page.getByTestId('routine-btn-save').click();
        await page.waitForTimeout(500);
        await expect(page).toHaveURL(/\/app\/routines/);

        // 3. Assign to a client
        await page.goto('/app');
        const clientEmail = `client_count_${timestamp}@test.com`;
        const clientName = `Client Count ${timestamp}`;

        await page.click('button[title="Añadir Cliente"]');
        await page.fill('input[placeholder="Ej: Juan Pérez"]', clientName);
        await page.fill('input[placeholder="ejemplo@email.com"]', clientEmail);

        page.once('dialog', dialog => dialog.accept());
        await page.click('button:has-text("Crear Cliente")');
        await page.waitForTimeout(2000);

        // Assign Routine
        const searchInput = page.locator('input[placeholder*="Buscar"]').first();
        await searchInput.fill(clientEmail);
        await page.waitForTimeout(1000);

        const clientCard = page.locator('[data-testid^="client-card-"]').filter({ hasText: clientName }).first();
        await clientCard.getByTestId('action-assign').click();

        await page.fill('input[placeholder*="Buscar en mis plantillas"]', routineName);
        await page.waitForTimeout(500);

        const routineItem = page.locator('.grid > div').filter({ hasText: routineName }).first();
        await routineItem.locator('button', { has: page.locator('h4') }).click(); // Expand

        page.once('dialog', dialog => dialog.accept());
        await page.click('button:has-text("Confirmar Asignación")');
        await page.waitForTimeout(2000);

        // 4. Login as Client
        await page.evaluate(() => localStorage.clear());
        await page.goto('/');
        await page.fill('input[type="email"]', clientEmail);
        await page.fill('input[type="password"]', 'Jose2026'); // Default password for new clients
        await page.click('button:has-text("Iniciar Sesión")');

        // Handle password reset
        await expect(page).toHaveURL(/\/update-password/);
        await page.fill('input[type="password"] >> nth=0', 'Jose2026!');
        await page.fill('input[type="password"] >> nth=1', 'Jose2026!');
        await page.click('button:has-text("Actualizar contraseña")');

        await page.waitForURL(/.*\/app/);

        // Handle privacy modal
        const acceptBtn = page.locator('button:has-text("Aceptar y Continuar")');
        if (await acceptBtn.isVisible({ timeout: 5000 })) {
            await acceptBtn.click();
        }

        // 5. Navigate to assigned routines
        await page.click('button:has-text("Asignadas")');
        await expect(page).toHaveURL(/\/app\/assigned-routines/);
        await page.reload();
        await page.waitForTimeout(1000);

        // 6. VERIFY EXERCISE COUNT
        const routineCard = page.getByTestId(`assigned-routine-${routineName}`);
        try {
            await expect(routineCard).toContainText('2 ejercicios', { timeout: 10000 });
        } catch (e) {
            await page.screenshot({ path: 'failure-assigned-routine.png' });
            throw e;
        }

        console.log('Success: Exercise count is correctly showing "2 ejercicios"');
    });
});
