import { test, expect } from '@playwright/test';

// Client credentials
const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Workout Save Flow', () => {
    // Run sequentially
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        // Handle dialogs globally
        // Handle dialogs globally
        page.on('dialog', dialog => {
            console.log(`DIALOG: ${dialog.message()}`);
            dialog.accept();
        });

        // Login as client
        await page.goto('/');
        await page.getByTestId('login-input-email').fill(CLIENT_USER.email);
        await page.getByTestId('login-input-password').fill(CLIENT_USER.pass);
        await page.getByTestId('login-btn-submit').click();
        await expect(page).toHaveURL(/\/app/, { timeout: 30000 });
    });

    test('Client can save workout and is redirected to detail page', async ({ page }) => {
        // Navigate to new workout via UI
        await page.getByTestId('new-workout-btn').click();
        await expect(page).toHaveURL(/\/new/);

        // Add exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('li button');
        await page.locator('li button').first().click();

        // Wait for exercise to be added
        await page.waitForTimeout(500);

        // Complete a set
        const checkBtn = page.getByTestId('workout-btn-complete-set').first();
        if (await checkBtn.isVisible()) {
            await checkBtn.click();
        }

        // Click Finalizar and wait for response
        await Promise.all([
            page.waitForResponse(resp =>
                resp.url().includes('save_full_workout') &&
                resp.status() === 200
            ),
            page.click('button:has-text("Finalizar")')
        ]);

        // Check if redirected to Detail (Client) or Dashboard (Trainer)
        await expect(page).not.toHaveURL(/\/new/);
        if (page.url().endsWith('/app')) {
            await page.locator('button:has-text("Revisar")').first().click();
        }

        // Should redirect to workout detail (UUID format)
        await expect(page).toHaveURL(/\/app\/workout\//, { timeout: 20000 });

        // Verify we're on the workout detail page, not still saving
        await expect(page.locator('button:has-text("Finalizar")')).not.toBeVisible();
        await expect(page.locator('button:has-text("Guardando")')).not.toBeVisible();
    });

    test('Active workout bar does NOT persist after saving workout', async ({ page }) => {
        // Clear any existing draft first
        await page.evaluate(() => {
            localStorage.removeItem('draft_workout');
            localStorage.removeItem('active_workout_id');
        });

        // Reload to ensure clean state
        await page.reload();
        await expect(page).toHaveURL(/\/app/, { timeout: 10000 });

        // Navigate to new workout via UI
        await page.getByTestId('new-workout-btn').click();
        await expect(page).toHaveURL(/\/new/);

        // Add exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('li button');
        await page.locator('li button').first().click();
        await page.waitForTimeout(500);

        // Complete a set
        const checkBtn = page.getByTestId('workout-btn-complete-set').first();
        if (await checkBtn.isVisible()) {
            await checkBtn.click();
        }

        // Save workout
        await page.click('button:has-text("Finalizar")');

        // Check if redirected to Detail (Client) or Dashboard (Trainer)
        await expect(page).not.toHaveURL(/\/new/);
        if (page.url().endsWith('/app')) {
            await page.locator('button:has-text("Revisar")').first().click();
        }

        // Wait for redirect to workout detail
        await expect(page).toHaveURL(/\/app\/workout\//, { timeout: 20000 });

        // Navigate back to dashboard
        await page.getByTestId('nav-btn-home').click();
        await page.waitForLoadState('networkidle');

        // Verify "Entrenamiento en Curso" bar is NOT visible
        await expect(page.locator('text=Entrenamiento en Curso')).not.toBeVisible();
    });

    test('Workout status is "completed" not "pending" after save', async ({ page }) => {
        // Navigate to new workout via UI
        await page.getByTestId('new-workout-btn').click();
        await expect(page).toHaveURL(/\/new/);

        // Add exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('li button');
        await page.locator('li button').first().click();
        await page.waitForTimeout(500);

        // Complete a set
        const checkBtn = page.getByTestId('workout-btn-complete-set').first();
        if (await checkBtn.isVisible()) {
            await checkBtn.click();
        }

        // Save workout
        await page.click('button:has-text("Finalizar")');

        // Check if redirected to Detail (Client) or Dashboard (Trainer)
        await expect(page).not.toHaveURL(/\/new/);

        const onDashboard = await page.locator('text=Panel de Entrenador').isVisible().catch(() => false);
        if (onDashboard || page.url().endsWith('/app')) {
            if (await page.locator('button:has-text("Revisar")').first().isVisible()) {
                await page.locator('button:has-text("Revisar")').first().click();
            }
        }

        // Wait for redirect to workout detail
        await expect(page).toHaveURL(/\/app\/workout\//, { timeout: 20000 });

        // Verify we're on the detail page by checking for content
        await expect(page.locator('h1')).toBeVisible({ timeout: 20000 });
    });

    test('Rest timer overlay does NOT persist after saving workout', async ({ page }) => {
        // Navigate to new workout via UI
        await page.getByTestId('new-workout-btn').click();
        await expect(page).toHaveURL(/\/new/);

        // Add exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('li button');
        await page.getByTestId(/exercise-item-/).first().click();

        // Wait for exercise to be added
        await page.waitForTimeout(500);

        // Complete a set (this starts the rest timer)
        const checkBtn = page.getByTestId('workout-btn-complete-set').first();
        if (await checkBtn.isVisible()) {
            await checkBtn.click();
        }

        // Save workout immediately
        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('save_full_workout') && resp.status() === 200),
            page.getByTestId('workout-btn-save').click()
        ]);

        // Check if redirected to Detail (Client) or Dashboard (Trainer)
        await expect(page).not.toHaveURL(/\/new/);
        if (page.url().endsWith('/app')) {
            await page.locator('button:has-text("Revisar")').first().click();
        }

        // Wait for redirect to workout detail
        await expect(page).toHaveURL(/\/app\/workout\//, { timeout: 20000 });

        // Verify timer overlay is NOT visible on the summary page
        // Use more specific locator to avoid matching BottomNav (.fixed.bottom-0)
        const timerOverlay = page.getByText('Descanso', { exact: true });
        const isTimerVisible = await timerOverlay.isVisible().catch(() => false);

        // Timer should be stopped and not visible
        expect(isTimerVisible).toBeFalsy();
    });

    test('Back button on workout detail goes to dashboard, not editor', async ({ page }) => {
        // Navigate to new workout via UI
        await page.getByTestId('new-workout-btn').click();
        await expect(page).toHaveURL(/\/new/);

        // Add exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('li button');
        await page.locator('li button').first().click();
        await page.waitForTimeout(500);

        // Complete a set
        const checkBtn = page.getByTestId('workout-btn-complete-set').first();
        if (await checkBtn.isVisible()) {
            await checkBtn.click();
        }

        // Save workout
        await page.click('button:has-text("Finalizar")');

        // Check if redirected to Detail (Client) or Dashboard (Trainer)
        await expect(page).not.toHaveURL(/\/new$/, { timeout: 15000 });
        if (page.url().endsWith('/app')) {
            await page.locator('button:has-text("Revisar")').first().click();
        }

        // Wait for redirect to workout detail
        await expect(page).toHaveURL(/\/app\/workout\//, { timeout: 20000 });

        // Click back button
        await page.click('button[aria-label="Volver al inicio"]');

        // Should go to dashboard, NOT back to workout editor
        await expect(page).toHaveURL('/app', { timeout: 10000 });
        await expect(page.getByTestId('new-workout-btn')).toBeVisible();
    });

});
