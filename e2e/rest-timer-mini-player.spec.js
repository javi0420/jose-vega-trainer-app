import { test, expect } from '@playwright/test';

const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Rest Timer Mini-Player (Sprint v3.13)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.getByTestId('login-input-email').fill(CLIENT_USER.email);
        await page.getByTestId('login-input-password').fill(CLIENT_USER.pass);
        await page.getByTestId('login-btn-submit').click();
        await expect(page).toHaveURL(/\/app/);

        // Handle Privacy Modal if present
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
        }
    });

    test('can minimize and expand the rest timer', async ({ page }) => {
        // 1. Start timer from Dashboard (via Nuevo Entreno)
        await page.getByTestId('new-workout-btn').click();

        // Configure and start timer
        await page.getByTestId('btn-global-rest').click();
        await page.click('button:has-text("30s")');
        await page.click('button:has-text("Aplicar a todos")');

        // Add exercise and start timer manually via popover
        await page.getByTestId('btn-add-block').click();
        await page.locator('li button').first().click();
        await page.getByText(/Descanso:/).first().click();
        await page.getByRole('button', { name: "Iniciar Timer" }).click();

        // 2. Verify Full View is visible by default
        await expect(page.getByTestId('timer-display')).toBeVisible();
        await expect(page.locator('button[aria-label="Minimizar temporizador"]')).toBeVisible();

        // 3. Click Minimize
        await page.locator('button[aria-label="Minimizar temporizador"]').click();

        // 4. Verify Mini-Player bar is visible and above bottom nav
        const miniPlayer = page.getByTestId('timer-mini-player');
        await expect(miniPlayer).toBeVisible();

        // 5. Verify Bottom Nav is still accessible
        // First navigate away from editor (where BottomNav is hidden)
        await page.getByTestId('btn-back').click(); // Back to dashboard
        await expect(page).toHaveURL(/\/app/);

        // Now BottomNav should be visible. Click "Historial"
        await page.getByTestId('nav-btn-history').click();
        await expect(page).toHaveURL(/\/history/);

        // Timer should still be there (persists navigation)
        await expect(miniPlayer).toBeVisible();
        console.log('Mini-player persists after navigation to History');

        // 6. Expand the timer by clicking the expand button
        console.log('Expanding timer...');
        await page.getByTestId('timer-mini-expand').click();
        await expect(page.locator('button[aria-label="Minimizar temporizador"]')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('timer-display')).toHaveClass(/text-6xl/);
        console.log('Timer expanded successfully');
    });

    test('skip button works in minimized state', async ({ page }) => {
        await page.getByTestId('new-workout-btn').click();

        // Configure and start timer
        await page.getByTestId('btn-global-rest').click();
        await page.click('button:has-text("30s")');
        await page.click('button:has-text("Aplicar a todos")');

        await page.getByTestId('btn-add-block').click();
        await page.locator('li button').first().click();
        await page.click('button:has-text("Descanso:")');
        await page.click('button:has-text("Iniciar Timer")');

        await page.locator('button[aria-label="Minimizar temporizador"]').click();

        // Verify mini-player Skip button
        const skipBtn = page.locator('button[aria-label="Omitir descanso"]');
        await expect(skipBtn).toBeVisible();
        await skipBtn.click();

        // Timer should disappear
        await expect(page.getByTestId('timer-mini-player')).not.toBeVisible();
        await expect(page.getByTestId('timer-display')).not.toBeVisible();
    });
});
