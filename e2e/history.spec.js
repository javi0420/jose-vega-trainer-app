import { test, expect } from '@playwright/test';

// Use known working user
const TEST_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Workout History', () => {
    // Run sequentially to avoid session conflicts
    test.describe.configure({ mode: 'serial' });

    test('User can view history page', async ({ page }) => {
        // Login
        await page.goto('/');
        await page.fill('input[placeholder="nombre@ejemplo.com"]', TEST_USER.email);
        await page.fill('input[placeholder="••••••••"]', TEST_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

        // FIX: Wait for app state to settle before checking modal
        await page.waitForLoadState('networkidle');

        // Handle Privacy Consent Modal
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
            await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
        }

        // Navigate to history
        await page.click('text=Ver todo');
        await expect(page).toHaveURL(/history/);

        // Verify history page loaded
        await expect(page.locator('h1:has-text("Historial de Entrenos")')).toBeVisible();
    });

    test('History shows workout list or empty state', async ({ page }) => {
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

        // Navigate to history
        await page.click('text=Ver todo');
        await expect(page).toHaveURL(/history/);

        // Wait for loading to complete
        await page.waitForLoadState('networkidle');

        // Should show either workouts or empty state
        const hasWorkouts = await page.locator('.rounded-2xl.bg-gray-900').first().isVisible();
        const hasEmptyState = await page.locator('text=Sin historial').isVisible();

        expect(hasWorkouts || hasEmptyState).toBeTruthy();
    });

    test('User can navigate to workout detail from history', async ({ page }) => {
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

        // Navigate to history
        await page.click('text=Ver todo');
        await page.waitForLoadState('networkidle');

        // Check if there are workouts
        const workoutCard = page.locator('.rounded-2xl.bg-gray-900').first();

        if (await workoutCard.isVisible()) {
            // Click on first workout
            await workoutCard.click();

            // Should navigate to workout detail
            await expect(page).toHaveURL(/\/app\/workout\/[a-f0-9-]+/, { timeout: 10000 });
        }
    });

});
