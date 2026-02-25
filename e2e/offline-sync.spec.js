import { test, expect } from '@playwright/test';

const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Offline Support & Sync', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('/');
        await page.fill('input[type="email"]', CLIENT_USER.email);
        await page.fill('input[type="password"]', CLIENT_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/);

        // Handle Privacy Modal if present
        const privacyBtn = page.locator('button:has-text("Aceptar y Continuar")');
        if (await privacyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await privacyBtn.click();
        }
    });

    test('saves workout in offline mode and syncs when online', async ({ page, context }) => {
        // 1. Go to New Workout
        await page.click('button:has-text("Nuevo Entreno")');
        await expect(page).toHaveURL(/\/app\/workout\/new/);

        // 2. Add an exercise (required to save)
        await page.click('button:has-text("Añadir Ejercicio")');
        // Wait for modal
        await page.waitForTimeout(1000);
        // Use a known exercise
        await page.fill('input[placeholder="Buscar ejercicio..."]', 'Press Banca');
        await page.click('button:has-text("Press Banca")');

        // 3. Add a set
        await page.click('button:has-text("Set")');
        await page.locator('input[placeholder="kg"]').first().fill('100');
        await page.locator('input[placeholder="reps"]').first().fill('5');

        // 4. GO OFFLINE
        await context.setOffline(true);
        await page.waitForTimeout(2000); // Allow efficient useNetworkStatus to update

        // 5. Save Workout
        // Handle "No sets completed" alert if it appears
        page.on('dialog', dialog => dialog.accept());

        await page.click('button:has-text("Finalizar")');

        // 6. Verify Offline Toast
        // "Guardado en modo OFFLINE"
        await expect(page.locator('text=Guardado en modo OFFLINE')).toBeVisible({ timeout: 10000 });

        // 7. Verify Redirection to History/Dashboard
        await expect(page).toHaveURL(/\/app\/history/);

        // 8. GO ONLINE
        await context.setOffline(false);

        // 9. Verify Sync Toast/Status
        // "Sincronizando..." or "Sincronizados"
        // We look for part of the success message or activity indicator
        await expect(page.locator('text=Sincronizad')).toBeVisible({ timeout: 15000 });
    });
});
