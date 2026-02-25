import { test, expect } from '@playwright/test';

const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Mobile Navigation (Bottom Tab Bar)', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('/');
        await page.fill('input[type="email"]', CLIENT_USER.email);
        await page.fill('input[type="password"]', CLIENT_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/);

        // FIX: Wait for app state to settle before checking modal
        await page.waitForLoadState('networkidle');

        // FIX: Wait for app state to settle before checking modal
        await page.waitForLoadState('networkidle');

        // Handle Privacy Consent Modal
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
            await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
        }
    });

    test('Should display bottom navigation and navigate correctly', async ({ page }) => {
        // Check if Nav exists
        const nav = page.locator('nav').first();
        await expect(nav).toBeVisible();

        // Check Links: Home, History, Profile
        const homeLink = page.getByTestId('nav-btn-home');
        const routinesLink = page.getByTestId('nav-btn-routines');
        const historyLink = page.getByTestId('nav-btn-history');
        const profileLink = page.getByTestId('nav-btn-profile');

        await expect(homeLink).toBeVisible();
        await expect(routinesLink).toBeVisible();
        await expect(historyLink).toBeVisible();
        await expect(profileLink).toBeVisible();

        // 1. Verify Active State (Home)
        await expect(homeLink).toHaveClass(/text-gold-500/);
        await expect(historyLink).toHaveClass(/text-gray-500/);

        // 2. Navigate to History
        await historyLink.click();
        await expect(page).toHaveURL(/\/app\/history/);
        await expect(historyLink).toHaveClass(/text-gold-500/);
        await expect(homeLink).toHaveClass(/text-gray-500/);

        // 3. Navigate to Profile
        await profileLink.click();
        await expect(page).toHaveURL(/\/app\/profile/);
        await expect(profileLink).toHaveClass(/text-gold-500/);

        // 4. Navigate back to Home
        await homeLink.click();
        await expect(page).toHaveURL(/\/app/);
    });

    test('Should NOT overlap with Active Workout Bar', async ({ page }) => {
        // Start a workout to trigger the bar
        await page.click('text=Nuevo Entreno');

        // In Editor, BottomNav should be HIDDEN (based on our Layout logic)
        // Wait for editor
        await expect(page).toHaveURL(/\/new/);

        // Check Nav Hidden in Editor
        const nav = page.locator('nav').first();
        await expect(nav).not.toBeVisible();

        // Create a set and discard or save? 
        // Just verify navigation away (if we can)

        // Actually, let's trigger the "Active Workout" state by navigating BACK (Use Logo or Browser Back?)
        // Workout Editor likely has a "Cancel/Back" button.
        // If we just go back to /app via URL, the active workout persists?
        // We need to ensure logic handles this.
        // Let's reload to /app manually to simulate 'leaving' without finishing
        await page.goto('/app');

        // Now ActiveWorkoutBar should be visible
        const activeBar = page.getByText('Entrenamiento en Curso');
        await expect(activeBar).toBeVisible();

        // And BottomNav should be visible
        await expect(nav).toBeVisible();

        // Check vertical stacking? 
        // Hard to check CSS stacking in Playwright easily without bounding box math.
        // But we can check they are both visible and don't block clicks.
        await nav.getByRole('link', { name: 'Historial' }).click();
        await expect(page).toHaveURL(/\/app\/history/);
    });
});
