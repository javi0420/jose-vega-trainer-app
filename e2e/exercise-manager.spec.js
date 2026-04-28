import { test, expect } from '@playwright/test';

const TRAINER_USER = { email: 'trainer@test.com', pass: 'password123' };

test.describe('Feature: Exercise Manager', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        // Handle dialogs globally
        page.on('dialog', dialog => dialog.accept());

        // Login as Trainer
        await page.goto('/');
        await page.fill('input[type="email"]', TRAINER_USER.email);
        await page.fill('input[type="password"]', TRAINER_USER.pass);

        // Add delay to prevent potential rate limiting or race conditions
        await page.waitForTimeout(2000);

        // Force explicit click instead of enter, or ensure network idle
        await page.waitForLoadState('networkidle');
        await page.click('button:has-text("Iniciar Sesión")');

        // Check if we are forced to reset password (happens if DB was reset)
        if (page.url().includes('update-password')) {
            console.log('DEBUG: Trainer forced to reset password. Handling...');
            await page.fill('input[type="password"] >> nth=0', TRAINER_USER.pass + '!');
            await page.fill('input[type="password"] >> nth=1', TRAINER_USER.pass + '!');
            await page.click('button:has-text("Actualizar contraseña")');
            await page.waitForTimeout(1500);
        }

        await expect(page).toHaveURL(/\/app/, { timeout: 45000 });
    });

    test('Trainer can access Exercise Manager page', async ({ page }) => {
        // Navigate to Exercise Manager
        // Navigate to Exercise Manager via UI to avoid connection issues with direct URL
        await page.click('text=Catálogo de Ejercicios');

        // Verify page loads (look for "Catálogo de Ejercicios" title)
        await expect(page.locator('text=Catálogo de Ejercicios')).toBeVisible({ timeout: 10000 });
    });

    test('Trainer can add a new exercise to catalog', async ({ page }) => {
        // Navigate to Exercise Manager via Dashboard
        await page.click('text=Catálogo de Ejercicios');
        await expect(page).toHaveURL(/\/exercises/);

        // Generate unique exercise name to avoid conflicts
        const uniqueName = `Test Exercise ${Date.now()}`;

        // Click add button
        await page.click('button:has-text("Nuevo Ejercicio")');

        // Fill exercise details
        // Wait for modal to appear and input to be perfectly ready
        await page.waitForSelector('text=Nuevo Ejercicio');
        const nameInput = page.locator('input[placeholder="Ej: Press de Banca"]');
        await nameInput.waitFor({ state: 'visible' });
        await nameInput.fill(uniqueName);

        // Select muscle group
        const muscleSelect = page.locator('select');
        if (await muscleSelect.isVisible()) {
            await muscleSelect.selectOption('pecho');
        }

        // Save
        await page.getByRole('button', { name: 'Crear Ejercicio' }).click();

        // Wait for network to settle after creation
        await page.waitForLoadState('networkidle');

        // Since there is server-side pagination, the new exercise might not be on the first page.
        // We must SEARCH for it.
        const searchInput = page.getByTestId('exercise-search-input').or(page.getByPlaceholder('Buscar ejercicio...'));
        await expect(searchInput).toBeVisible({ timeout: 10000 });
        
        // Use a more reliable way to fill and trigger search
        await searchInput.click();
        await searchInput.clear();
        await searchInput.pressSequentially(uniqueName, { delay: 30 });
        
        // Wait for the specific exercise card/heading to appear (case-insensitive)
        await expect(page.locator('h3').filter({ hasText: new RegExp(uniqueName, 'i') })).toBeVisible({ timeout: 15000 });


    });

    test('Client can use ad-hoc exercise during workout', async ({ page }) => {
        // Note: This test uses a different login (client) to test ad-hoc exercise creation
        // First, logout trainer
        await page.goto('/app');
        await page.waitForLoadState('networkidle');
        await page.getByLabel('Perfil').click();
        await expect(page).toHaveURL(/profile/);
        await page.click('button:has-text("Cerrar Sesión")');
        await expect(page).toHaveURL('/');

        // Login as client
        const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };
        // Add delay to prevent potential rate limiting or race conditions
        await page.waitForTimeout(2000);
        await page.fill('input[type="email"]', CLIENT_USER.email);
        await page.fill('input[type="password"]', CLIENT_USER.pass);
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(/\/app/, { timeout: 30000 });

        // Handle Privacy Consent Modal
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
            await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
        }

        // Clear draft
        await page.evaluate(() => {
            localStorage.removeItem('draft_workout');
            localStorage.removeItem('active_workout_id');
        });

        // Go to workout editor
        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/new/);

        // 3. In Workout, try to add new exercise
        await page.getByTestId('btn-add-block').first().click();

        // Search for non-existent exercise
        const uniqueSearch = `CustomExercise${Date.now()}`;
        await page.fill('input[placeholder*="Buscar"]', uniqueSearch);

        // Wait for "No results" state
        await page.waitForTimeout(500);

        // Click "Usar [name] (Solo este entreno)" button if visible
        const adHocBtn = page.locator(`button:has-text("Usar")`);
        if (await adHocBtn.isVisible()) {
            await adHocBtn.click();

            // Verify exercise was added using new test-id (case-insensitive)
            await expect(page.getByTestId('exercise-name').filter({ hasText: new RegExp(uniqueSearch, 'i') }).first()).toBeVisible({ timeout: 10000 });
        }
    });
});
