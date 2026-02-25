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
        // Use a more specific selector to get the card container that has the button
        const clientCard = page.locator('div.group').filter({ hasText: clientEmail }).first();
        await clientCard.scrollIntoViewIfNeeded();
        await expect(clientCard).toBeVisible();
        await clientCard.locator('button[title="Gestionar Rutinas"]').click();

        // 3. Create a routine from scratch
        page.once('dialog', dialog => dialog.accept()); // For window.prompt
        await page.click('button:has-text("Crear desde cero")');
        // Wait for confirm dialog and redirect
        page.once('dialog', dialog => dialog.accept());
        await page.waitForURL(/\/app\/routines\/.+/);

        // 4. Save the routine
        await page.click('button:has-text("GUARDAR")');

        // 5. Verify redirection to Dashboard (/app)
        await expect(page).toHaveURL(/\/app/);

        // 6. Verify client is pre-selected in the Feed
        await expect(page.locator('text=Filtrando por: ' + clientName).first()).toBeVisible();
    });
});
