import { test, expect } from '@playwright/test';

const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('UI Occlusion & Scroll Validation', () => {
    test.beforeEach(async ({ page }) => {
        // Handle dialogs (beforeunload)
        // Handle dialogs (beforeunload)
        page.on('dialog', dialog => {
            console.log(`DEBUG: Dialog message: ${dialog.message()}`);
            dialog.accept();
        });

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

        // Clean up any active workout if exists
        await page.evaluate(() => localStorage.removeItem('draft_workout'));
    });

    test('should not block Add Exercise button when timer is maximized', async ({ page }) => {
        console.log('Starting from Dashboard...');
        await page.goto('/app');
        await page.click('button:has-text("Nuevo Entreno")');
        await expect(page).toHaveURL(/\/workout\/new/);

        console.log('Navigated to Workout Editor.');

        // 1. Add some exercises to make the page scrollable
        for (let i = 0; i < 3; i++) {
            console.log(`Adding exercise ${i + 1}...`);
            // Use last() because after the first exercise, there's another "Añadir Ejercicio" in the list
            await page.getByTestId('btn-add-block').last().click();
            await page.locator('input[placeholder*="Buscar"]').fill('Sentadilla');
            await page.waitForTimeout(1000); // Wait for debounced search
            await page.locator('li button').first().click();
        }

        console.log('Starting timer...');
        // 2. Configure and Start Timer
        await page.getByTestId('btn-global-rest').click();
        await page.click('button:has-text("30s")');
        await page.click('button:has-text("Aplicar a todos")');

        // Start timer manually for occlusion check
        await page.click('button:has-text("Descanso:")');
        await page.click('button:has-text("Iniciar Timer")');

        await expect(page.getByTestId('timer-display')).toBeVisible();

        console.log('Scrolling to bottom...');
        // 3. Scroll to the absolute bottom
        await page.evaluate(() => {
            const main = document.querySelector('main');
            if (main) main.scrollTop = main.scrollHeight;
        });

        console.log('Clicking Add Exercise...');
        // 4. Verify that "Añadir Ejercicio" button is CLICKABLE and not intercepted
        const addExBtn = page.getByTestId('btn-add-block').last();
        await expect(addExBtn).toBeVisible();

        // This will fail if intercepted by timer
        await addExBtn.click();

        console.log('Verifying modal open...');
        // If modal opens, it means it wasn't intercepted
        await expect(page.locator('h2:has-text("Añadir Ejercicio")')).toBeVisible();
    });

    test('should allow clicking Finish (Finalizar) button with active timer', async ({ page }) => {
        console.log('Starting from Dashboard (Test 2)...');
        await page.goto('/app');
        await page.click('button:has-text("Nuevo Entreno")');
        await expect(page).toHaveURL(/\/workout\/new/);

        // 1. Add one exercise and complete a set to enable "Finalizar"
        await page.getByTestId('btn-add-block').last().click();
        await page.locator('input[placeholder*="Buscar"]').fill('Sentadilla');
        await page.waitForTimeout(1000);
        await page.locator('li button').first().click();
        await page.getByTestId('workout-btn-add-set').click();

        const firstSet = page.locator('[data-testid^="set-row-"]').first();
        await firstSet.getByTestId('workout-input-weight').fill('50');
        await firstSet.getByTestId('workout-input-reps').fill('10');
        await page.getByTestId('workout-btn-complete-set').first().click();

        // 2. Start Timer
        console.log('Starting timer...');
        await page.getByTestId('btn-global-rest').click();
        await page.click('button:has-text("30s")');
        await page.click('button:has-text("Aplicar a todos")');

        // Start timer manually
        await page.click('button:has-text("Descanso:")');
        await page.click('button:has-text("Iniciar Timer")');

        await expect(page.getByTestId('timer-display')).toBeVisible();

        // 3. Attempt to Save Workout (Header button)
        // Toggle settings to minimize if needed or just minimize manually?
        // RestTimerOverlay starts extended. We should minimize it to access header if it's blocking.
        // Assuming the overlay has a minimize button
        const minimizeBtn = page.locator('button[aria-label="Minimizar temporizador"]');
        if (await minimizeBtn.isVisible()) {
            await minimizeBtn.click();
            // Wait for the mini player to appear (positive assertion of state change)
            await expect(page.getByTestId('timer-mini-player')).toBeVisible();
        }

        const finishBtn = page.getByTestId('workout-btn-save');
        console.log('Clicking Finalizar...');
        await finishBtn.click();
        console.log('Clicked Finalizar. Waiting for navigation...');

        // Wait for potential save process or navigation
        await expect(finishBtn).not.toBeVisible({ timeout: 15000 });
        console.log('Finalizar button is no longer visible.');
    });
});
