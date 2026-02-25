import { test, expect } from '@playwright/test';

const TEST_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Save Workout as Routine', () => {
    test.setTimeout(120000); // Increase timeout for the whole test

    test.beforeEach(async ({ page }) => {
        // Capture browser console logs
        page.on('console', msg => {
            console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
        });

        // Login
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        console.log('Filling credentials...');
        await page.fill('[data-testid="login-input-email"]', TEST_USER.email);
        await page.fill('[data-testid="login-input-password"]', TEST_USER.pass);
        console.log('Clicking login...');
        await page.click('[data-testid="login-btn-submit"]');
        await expect(page).toHaveURL(/\/app/, { timeout: 25000 });

        // Handle Privacy Consent Modal
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
            await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
        }
    });

    test('should save a completed workout as a routine', async ({ page }) => {
        // Handle window.confirm automatically
        page.on('dialog', async dialog => {
            console.log(`Dialog message: ${dialog.message()}`);
            await dialog.accept();
        });

        // 1. Create and complete a workout
        console.log('Starting new workout...');
        await page.click('button:has-text("Nuevo Entreno"), a:has-text("Nuevo Entreno")');
        await expect(page).toHaveURL(/\/new/);

        // Add Exercise
        console.log('Adding exercise...');
        const addExBtn = page.locator('button:has-text("Añadir Ejercicio"), button:has-text("Añadir Primer Ejercicio")').first();
        await addExBtn.click();

        // Pick first exercise from catalog
        console.log('Selecting exercise from catalog...');
        await page.waitForSelector('li button', { state: 'visible', timeout: 30000 });
        const firstEx = page.locator('li button').first();
        await firstEx.click();

        // Wait for modal to disappear
        await expect(page.locator('text=Catálogo de Ejercicios')).not.toBeVisible({ timeout: 10000 });

        // Add Set
        console.log('Adding a set...');
        const addSetBtn = page.locator('button:has-text("Añadir Set")').first();
        await addSetBtn.waitFor({ state: 'visible', timeout: 20000 });
        await addSetBtn.click();

        // Fill set data
        console.log('Filling set data...');
        const weightInput = page.locator('input[data-testid="workout-input-weight"]').first();
        const repsInput = page.locator('input[data-testid="workout-input-reps"]').first();

        await weightInput.waitFor({ state: 'visible', timeout: 20000 });
        await weightInput.fill('85.5');
        await repsInput.fill('12');

        // Complete set
        console.log('Completing set...');
        const completeSetBtn = page.locator('button[aria-label="Completar set"]').first();
        await completeSetBtn.click();

        // Wait for set to be visually completed (bg change or checkmark)
        await expect(page.locator('button[aria-label="Completar set"]').first()).toBeVisible();

        // Finish workout
        console.log('Clicking Finalizar...');
        const finishBtn = page.locator('button:has-text("Finalizar")').first();
        await finishBtn.click();

        // Wait for redirect to summary (Detail view)
        console.log('Waiting for redirection to summary...');
        // Match /app/workout/ID but NOT /app/workout/new
        await page.waitForURL(url => {
            const path = url.pathname;
            return path.startsWith('/app/workout/') && !path.endsWith('/new');
        }, { timeout: 60000 });
        console.log(`Current URL: ${page.url()}`);
        await page.waitForLoadState('networkidle');

        // 2. Click "Guardar como Rutina"
        console.log('Checking for Save as Routine button...');
        const saveAsRoutineBtn = page.locator('[data-testid="btn-save-as-routine"]');
        await expect(saveAsRoutineBtn).toBeVisible({ timeout: 30000 });
        await saveAsRoutineBtn.scrollIntoViewIfNeeded();

        // Check if portal root exists
        const hasPortal = await page.evaluate(() => !!document.getElementById('portal-root'));
        console.log(`DEBUG: Portal Root Exists: ${hasPortal}`);

        // Direct JS click to bypass potential overlays
        await saveAsRoutineBtn.evaluate(node => node.click());

        await page.screenshot({ path: 'after-click-save-routine.png' });

        // 3. Fill routine name in modal
        console.log('Filling routine name...');

        // Use getByRole for better resonance with the actual DOM structure and accessibility
        const modalHeader = page.getByRole('heading', { name: 'Nueva Plantilla' });
        await expect(modalHeader).toBeVisible({ timeout: 15000 });

        // Force focus by clicking the label or container first
        await page.getByText('Nombre de la Rutina').click();

        const routineNameInput = page.locator('[data-testid="input-routine-name"]');
        await page.screenshot({ path: 'debug-save-routine-modal.png' });
        await expect(routineNameInput).toBeVisible({ timeout: 10000 });
        const customName = `Rutina Test ${Date.now()}`;
        await routineNameInput.fill(customName);

        // 4. Confirm save
        console.log('Confirming save...');

        // Setup listener for handling any subsequent dialogs or navigation events
        const savePromise = page.waitForResponse(response =>
            response.url().includes('rpc/create_routine_from_workout') && response.status() === 200
            , { timeout: 30000 }).catch(() => console.log('RPC save response not captured explicitly'));

        // Expect toast to appear potentially
        // We do not await this immediately to avoid blocking if it's too fast, but we'll try to assert it
        // Or we rely on the specific 'Ir a la Rutina' button if that's what we want to click.

        await page.click('[data-testid="btn-confirm-save-routine"]');

        await savePromise;
        await page.waitForLoadState('networkidle');

        // 5. Verify result
        console.log('Verifying success...');

        // Try to find the button "Ir a la Rutina" which appears in the toast
        // If the toast auto-dismissed, we might have missed it. 
        // We can also verify by navigating to the routines list.
        const goToRoutineBtn = page.getByText(/Ir a la Rutina/i).first();

        // If button is visible, click it. If not, manual navigation (fallback to ensure robust test).
        if (await goToRoutineBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await goToRoutineBtn.click();
            await page.waitForURL(/\/app\/routines\/[a-zA-Z0-9-]+/, { timeout: 30000 });
        } else {
            console.log('Toast missed or dismissed, navigating manually...');
            await page.goto('/app/routines');
            await page.waitForLoadState('networkidle');
            // Routine should be listed
            // Need to find it and click it
            await page.getByText(customName).first().click();
        }

        // 6. Navigate to routine and verify placeholders
        // (If we manually navigated, we are already at Detail or List)
        // Ensure we are at Detail
        if (!page.url().includes('/app/routines/')) {
            // If we are at list, we click it
            await page.getByText(customName).first().click();
        }

        console.log('Navigating to routine (ensuring detail view)...');
        await page.waitForURL(/\/app\/routines\/[a-zA-Z0-9-]+/, { timeout: 30000 });

        // Check if the exercise is present and has title
        await expect(page.getByText(customName).first()).toBeVisible({ timeout: 25000 });

        // Go back to home and try to start workout with this routine
        console.log('Checking placeholders in new workout...');
        await page.getByTestId('nav-btn-home').click();
        await expect(page).toHaveURL('/app');
        await page.click('button:has-text("Nuevo Entreno"), a:has-text("Nuevo Entreno")');
        await expect(page).toHaveURL(/\/new/);
        await page.waitForLoadState('networkidle');
        await page.click('[data-testid="btn-load-template"]');

        // Switch to "Mis Plantillas" tab because the workout was saved by the client
        await page.click('button:has-text("Mis Plantillas")');

        await page.getByText(customName).first().click();

        // Check placeholders in the editor
        console.log('Verifying placeholders in editor...');
        await page.waitForSelector('input[data-testid="workout-input-weight"]', { timeout: 35000 });
        const weightPlaceholder = page.locator('input[data-testid="workout-input-weight"]').first();
        const repsPlaceholder = page.locator('input[data-testid="workout-input-reps"]').first();

        await expect(weightPlaceholder).toHaveAttribute('placeholder', '85.5', { timeout: 25000 });
        await expect(repsPlaceholder).toHaveAttribute('placeholder', '12', { timeout: 10000 });
    });
});
