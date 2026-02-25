import { test, expect } from '@playwright/test';

// Use known working user
const TEST_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Advanced Workout Features', () => {
    // Run sequentially to avoid session conflicts
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        // Handle dialogs globally
        page.on('dialog', dialog => dialog.accept());

        // Login
        await page.goto('/');
        await page.fill('input[placeholder="nombre@ejemplo.com"]', TEST_USER.email);
        await page.fill('input[placeholder="••••••••"]', TEST_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

        // Handle Privacy Consent Modal
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
            await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
        }
    });

    test('Add exercise to workout', async ({ page }) => {
        // Navigate to new workout
        // Navigate to new workout
        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/new/);

        // Add first exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('li button');
        await page.locator('li button').first().click();

        // Wait for exercise to be added and verify
        await page.waitForTimeout(1000);

        // Verify exercise added by checking for exercise name heading
        await expect(page.locator('h3').first()).toBeVisible();
    });

    test('Fill set data and complete', async ({ page }) => {
        // Navigate to new workout
        // Navigate to new workout
        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/new/);

        // Add exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('li button');
        await page.locator('li button').first().click();

        // Wait for exercise
        await page.waitForTimeout(500);

        // Check if kg input exists
        const kgInput = page.locator('input[type="number"]').first();
        if (await kgInput.isVisible()) {
            await kgInput.fill('50');
        }

        // Complete set
        const checkBtn = page.getByLabel('Completar set').first();
        if (await checkBtn.isVisible()) {
            await checkBtn.click();
        }
    });

    test('Save workout redirects to detail', async ({ page }) => {
        // Navigate to new workout
        // Navigate to new workout
        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/new/);

        // Add exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('li button');
        await page.locator('li button').first().click();

        // Wait for exercise
        await page.waitForTimeout(500);

        // Complete the set first
        const checkBtn = page.getByLabel('Completar set').first();
        if (await checkBtn.isVisible()) {
            await checkBtn.click();
        }

        // Save workout
        await page.click('button:has-text("Finalizar")');

        // Should redirect to workout detail
        await expect(page).toHaveURL(/\/app\/workout\//, { timeout: 20000 });
    });

});
