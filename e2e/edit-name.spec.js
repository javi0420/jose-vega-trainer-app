import { test, expect } from '@playwright/test';

const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Edit Workout Name', () => {
    test.describe.configure({ mode: 'serial' });

    test('User can rename a workout in Detail view', async ({ page }) => {
        // 1. Login
        // Handle dialogs (confirm save without sets)
        page.on('dialog', dialog => dialog.accept());

        await page.goto('/');
        await page.fill('input[type="email"]', CLIENT_USER.email);
        await page.fill('input[type="password"]', CLIENT_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/);

        // Handle Privacy Consent Modal
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        const acceptBtn = page.locator('button:has-text("Aceptar y Continuar")');
        try {
            if (await privacyModal.isVisible({ timeout: 5000 })) {
                await acceptBtn.click();
                await expect(privacyModal).not.toBeVisible();
            }
        } catch (e) { }

        // 2. Create a fresh workout to ensure we have data
        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/workout\/new/);

        // Add one exercise to be valid
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('li button');
        await page.click('li button >> nth=0'); // Add first available

        // Save
        await page.click('button:has-text("Finalizar")');

        // Handle confirmation if it appears
        try {
            const confirmBtn = page.locator('button:has-text("Guardar Entrenamiento")');
            if (await confirmBtn.isVisible({ timeout: 2000 })) {
                await confirmBtn.click();
            }
        } catch (e) { }

        // 3. Wait for redirect to Summary/Detail
        await expect(page).toHaveURL(/\/app\/workout\/.*/, { timeout: 15000 });

        // Wait for data load (SummaryHeader)
        await expect(page.locator('text=Volumen Total')).toBeVisible({ timeout: 10000 });

        // 4. Click Pencil Icon to Edit
        const pencilBtn = page.locator('button[aria-label="Editar nombre"]');
        await expect(pencilBtn).toBeVisible({ timeout: 10000 });
        await pencilBtn.click();

        // 5. Input New Name
        // The input replaces the H1, so look for input inside the header area or just by type text
        const input = page.locator('input[type="text"]').first();
        await expect(input).toBeVisible();

        const newName = `Renamed ${Date.now()}`;
        await input.fill(newName);
        await input.press('Enter');

        // 6. Verify Update locally
        await expect(page.locator(`h1:has-text("${newName}")`)).toBeVisible();

        // 7. Verify Persistence (Reload)
        await page.reload();
        await expect(page.locator('text=Volumen Total')).toBeVisible();
        await expect(page.locator(`h1:has-text("${newName}")`)).toBeVisible();
    });
});
