import { test, expect } from '@playwright/test';

// Credentials provided by user
const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };
const TRAINER_USER = { email: 'trainer@test.com', pass: 'password123' };

test.describe('Real World Flows (Live Database)', () => {

    test('Client: Login, Ad-hoc Workout, Finish', async ({ page }) => {
        // 1. LOGIN
        await page.goto('/');

        // Ensure we are on login
        await expect(page.locator('button:has-text("Iniciar Sesión")')).toBeVisible();

        await page.fill('input[type="email"]', CLIENT_USER.email);
        await page.fill('input[type="password"]', CLIENT_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');

        // Wait for redirect to App
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

        // Handle Privacy Consent Modal
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
            await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
        }

        // 2. CREATE WORKOUT
        // Force navigation to new workout to ensure clean state
        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/new/);

        // 3. ADD AD-HOC EXERCISE
        await page.click('button:has-text("Añadir Ejercicio")');

        const timestamp = Date.now();
        const adHocName = `Test E2E ${timestamp}`;

        await page.fill('input[placeholder="Buscar ejercicio..."]', adHocName);

        // Wait for the "Usar 'Name' (Solo este entreno)" button
        // Logic might take a split second to appear
        // Note: UI uses double quotes: Usar "Name" ...
        const adHocBtn = page.locator('button').filter({ hasText: `Usar "${adHocName}"` });
        await adHocBtn.click();

        // 4. VERIFY IT ADDED
        await expect(page.getByRole('heading', { level: 3, name: new RegExp(adHocName, 'i') })).toBeVisible();

        // 5. ADD SET
        // Check if sets exist (usually 0 for new exercise?)
        const setRows = page.locator('input[placeholder="kg"]');
        if (await setRows.count() === 0) {
            await page.locator('button:has-text("Añadir Set")').first().click();
        }

        // Fill Data
        await page.locator('input[placeholder="kg"]').first().fill('20');
        await page.locator('input[placeholder="reps"]').first().fill('12');

        // 6. COMPLETE SET
        const checkBtn = page.getByLabel('Completar set').first();
        await checkBtn.click();

        // 7. FINISH WORKOUT - handle confirm dialog if it appears
        const dialogPromise = page.waitForEvent('dialog', { timeout: 5000 })
            .then(dialog => dialog.accept())
            .catch(() => console.log('No dialog appeared'));

        await page.click('button:has-text("Finalizar")');
        await dialogPromise;

        // Wait for redirect to saved workout detail (UUID format)
        await expect(page).toHaveURL(/\/app\/workout\/[a-f0-9-]{36}/, { timeout: 20000 });

        console.log('Client flow success');
    });

    test('Trainer: Login Verification', async ({ page }) => {
        // 1. LOGIN
        await page.goto('/');

        await page.fill('input[type="email"]', TRAINER_USER.email);
        await page.fill('input[type="password"]', TRAINER_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');

        // Wait for redirect to App
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

        // Trainer might have different dashboard, just checking access
        console.log('Trainer login success');
    });

});
