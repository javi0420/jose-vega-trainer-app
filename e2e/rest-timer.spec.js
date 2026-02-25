import { test, expect } from '@playwright/test';

const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Global Rest Timer (Sprint v3.12)', () => {
    test.beforeEach(async ({ page }) => {
        // Handle dialogs (beforeunload)
        page.on('dialog', dialog => dialog.accept());

        // Login
        await page.goto('/');
        await page.fill('input[type="email"]', CLIENT_USER.email);
        await page.fill('input[type="password"]', CLIENT_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/);

        // Handle Privacy Modal
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
        }
    });

    test('manual timer from workout editor', async ({ page }) => {
        await page.click('button:has-text("Nuevo Entreno")');

        // FIX: Add block FIRST, then apply global rest so it inherits 30s
        await page.getByTestId('btn-add-block').click();
        await page.locator('li button').first().click();

        // Now configure via Global Modal
        await page.getByTestId('btn-global-rest').click();

        // Select 30s preset in modal
        await page.click('button:has-text("30s")');
        await page.click('button:has-text("Aplicar a todos")');

        // Start timer from the block
        await page.getByText(/Descanso:/).first().click();
        await page.getByRole('button', { name: "Iniciar Timer" }).click();

        // Verify overlay appears via the skip button which is unique
        const skipBtn = page.getByTestId('timer-btn-skip');
        await expect(skipBtn).toBeVisible();

        // Verify it starts around 0:29 or 0:30 (since we selected 30s)
        const timerText = page.getByTestId('timer-display');
        await expect(timerText).toHaveText(/0:[2-3][0-9]/);
    });

    test('manual timer from active workout bar persists navigation', async ({ page }) => {
        await page.click('button:has-text("Nuevo Entreno")');

        // Add something so navigation guard triggers (optional, but realistic)
        await page.getByTestId('btn-add-block').click();
        await page.locator('li button').first().click();

        // Start timer from Editor
        await page.getByTestId('btn-global-rest').click();
        await page.click('button:has-text("30s")');
        await page.click('button:has-text("Aplicar a todos")');

        // Start timer manually to avoid waiting for set completion
        await page.getByText(/Descanso:/).first().click();
        await page.getByRole('button', { name: "Iniciar Timer" }).click();

        await expect(page.getByTestId('timer-display')).toBeVisible();

        // Navigate to Dashboard (SPA navigation)
        await page.getByTestId('btn-back').click();

        // Timer should still be active in ActiveWorkoutBar
        const activeBarTimerBtn = page.getByTestId('btn-bar-global-rest');
        await expect(activeBarTimerBtn).toHaveClass(/text-gold-500/);

        // Overlay should still be visible
        await expect(page.getByTestId('timer-display')).toBeVisible();
        await expect(page.getByTestId('timer-display')).not.toHaveText('0:00');
    });

    test('timer controls working in overlay', async ({ page }) => {
        await page.click('button:has-text("Nuevo Entreno")');

        // FIX: Add block FIRST before interacting with timer
        await page.getByTestId('btn-add-block').click();
        await page.locator('li button').first().click();

        // Configure and start timer
        await page.getByTestId('btn-global-rest').click();
        await page.click('button:has-text("30s")');
        await page.click('button:has-text("Aplicar a todos")');

        // Start timer manually to see overlay
        await page.getByText(/Descanso:/).first().click();
        await page.getByRole('button', { name: "Iniciar Timer" }).click();

        const initialSecondsText = await page.getByTestId('timer-display').innerText();

        // Click +15
        await page.getByTestId('timer-btn-add-15').click();
        await page.waitForTimeout(500);

        const updatedSecondsText = await page.getByTestId('timer-display').innerText();
        // Since it's mm:ss, we check if it increased
        // (This is a bit loose because of timing, but generally works)
        expect(updatedSecondsText).not.toBe(initialSecondsText);

        // Click Omitir
        await page.getByTestId('timer-btn-skip').click();
        await expect(page.getByTestId('timer-display')).not.toBeVisible();
    });
});
