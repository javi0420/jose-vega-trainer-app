import { test, expect } from '@playwright/test';

test.describe('Feedback Loop & Collaboration', () => {

    test('Full Feedback Cycle: Trainer Review -> Client Read Confirmation', async ({ browser }) => {
        // Increase timeout for this complex test
        test.setTimeout(120000);

        const trainerContext = await browser.newContext();
        const clientContext = await browser.newContext();
        const trainerPage = await trainerContext.newPage();
        const clientPage = await clientContext.newPage();

        // --- SETUP: Trainer Creates Client ---
        await trainerPage.goto('/');
        await trainerPage.fill('input[placeholder="nombre@ejemplo.com"]', 'trainer@test.com');
        await trainerPage.fill('input[placeholder="••••••••"]', 'password123');
        await trainerPage.waitForTimeout(500); // Wait for state update
        await trainerPage.click('button:has-text("Iniciar Sesión")');
        await expect(trainerPage).toHaveURL('/app', { timeout: 30000 });

        const uniqueId = Date.now();
        const clientEmail = `collab_${uniqueId}@test.com`;
        const clientName = `Collab User ${uniqueId}`;

        await trainerPage.locator('button[title="Añadir Cliente"]').click();
        await expect(trainerPage.getByText('Nuevo Cliente', { exact: true })).toBeVisible();
        await trainerPage.fill('input[placeholder="Ej: Juan Pérez"]', clientName);
        await trainerPage.fill('input[placeholder="ejemplo@email.com"]', clientEmail);

        const dialogPromise = trainerPage.waitForEvent('dialog');
        await trainerPage.click('button:has-text("Crear Cliente")');
        const dialog = await dialogPromise;
        await dialog.accept();

        await trainerPage.waitForTimeout(2000);

        // --- STEP 1: Client Creates Workout ---
        await clientPage.goto('/');
        await clientPage.fill('input[placeholder="nombre@ejemplo.com"]', clientEmail);
        await clientPage.fill('input[placeholder="••••••••"]', 'Joaquin2025');
        await clientPage.click('button:has-text("Iniciar Sesión")');

        // FIX: Wait for app to settle
        await clientPage.waitForLoadState('networkidle');

        // Handle Privacy Consent Modal
        const privacyModal = clientPage.locator('text=Consentimiento de Privacidad');
        try {
            if (await privacyModal.isVisible({ timeout: 5000 })) {
                await clientPage.click('button:has-text("Aceptar y Continuar")');
                await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
                await clientPage.waitForTimeout(2000); // Wait for DB propagation
            }
        } catch (e) {
            console.log('Privacy modal not shown or already accepted');
        }

        await clientPage.click('button:has-text("Nuevo Entreno")');
        await clientPage.waitForURL(/\/app\/workout\/new/);

        // Add Exercise
        await clientPage.click('button:has-text("Añadir Ejercicio")');
        await clientPage.waitForSelector('li button');
        await clientPage.locator('li button').first().click();
        await clientPage.waitForTimeout(500);

        // Complete a set (required for saving)
        await clientPage.click('button:has-text("Añadir Set")');
        const weightInput = clientPage.locator('input[placeholder="kg"]');
        await expect(weightInput).toBeVisible({ timeout: 5000 });
        await weightInput.fill('50');
        const completeBtn = clientPage.getByRole('button', { name: 'Completar set' }).first();
        await completeBtn.click();

        // Finalize workout
        await clientPage.click('button:has-text("Finalizar")');

        // Save might take a moment
        await clientPage.waitForURL(/\/app\/workout\/[a-f0-9-]{36}/, { timeout: 30000 });
        const workoutUrl = clientPage.url();

        // --- STEP 2: Trainer Reviews Workout ---
        console.log(`Trainer: Navigating to workout detail: ${workoutUrl}`);
        await trainerPage.goto(workoutUrl);

        // Wait for the loader to disappear or any content to appear
        await trainerPage.waitForLoadState('networkidle');
        await trainerPage.waitForSelector('h1', { timeout: 30000 });

        // Ensure we are in trainer mode - check for the specific header
        console.log('Trainer: Verifying feedback section visibility');
        const trainerHeader = trainerPage.locator('h3:has-text("Instrucciones del Coach")');
        await expect(trainerHeader).toBeVisible({ timeout: 20000 });

        // Directly look for the feedback box - it should be there for the trainer
        console.log('Trainer: Looking for feedback textarea');
        const feedbackBox = trainerPage.locator('textarea');
        await expect(feedbackBox).toBeVisible({ timeout: 15000 });

        const feedbackText = `Great job ${clientName}! ${uniqueId}`;
        await feedbackBox.fill(feedbackText);

        console.log('Trainer: Saving feedback');
        const saveBtn = trainerPage.locator('button:has-text("Enviar Feedback"), button:has-text("Enviado")');

        // Wait for the specific PATCH request to update the workout
        const [response] = await Promise.all([
            trainerPage.waitForResponse(resp => resp.url().includes('/rest/v1/workouts') && resp.request().method() === 'PATCH' && resp.ok(), { timeout: 10000 }),
            saveBtn.click()
        ]);

        console.log(`Save response status: ${response.status()}`);

        // Wait for the button to stop showing "Guardando..."
        await expect(saveBtn).not.toBeDisabled({ timeout: 15000 });

        // Use a more flexible assertions or just skip text check if data is verified by step 3
        // But we want to ensure UI feedback exists
        await expect(trainerPage.getByTestId('trainer-feedback-status')).toHaveText('Enviado', { timeout: 10000 });

        // --- STEP 3: Client Sees Feedback & Confirms ---
        console.log('Client: Checking for feedback');
        // Small delay to ensure database consistency
        await trainerPage.waitForTimeout(1000);
        await clientPage.reload();
        await clientPage.waitForLoadState('networkidle');
        // Scope to the specific block to avoid strict mode violation (duplicate text)
        await expect(clientPage.getByTestId('trainer-feedback-block').getByText(feedbackText)).toBeVisible({ timeout: 15000 });

        console.log('Client: Confirming feedback as read');
        const confirmBtn = clientPage.getByRole('button', { name: 'Confirmar Lectura' });
        await confirmBtn.click();

        // Wait for button to disappear (confirmation of viewed status)
        await expect(confirmBtn).toBeHidden({ timeout: 10000 });

        // Trainer should now see "Visto por cliente"
        await trainerPage.reload();
        await expect(trainerPage.locator('text=Visto por cliente')).toBeVisible({ timeout: 10000 });

        // --- CLEANUP ---
        console.log('Cleanup: Deleting test client');
        await trainerPage.goto('/app');
        await trainerPage.fill('input[placeholder="Buscar cliente..."]', clientEmail);
        await trainerPage.waitForTimeout(3000); // Wait for search to filter

        const deleteBtn = trainerPage.locator(`button[aria-label="Eliminar ${clientName}"]`);
        if (await deleteBtn.isVisible()) {
            console.log('Cleanup: Delete button visible, clicking...');
            await Promise.all([
                trainerPage.waitForEvent('dialog').then(dialog => dialog.accept()),
                deleteBtn.click()
            ]);
            console.log('Cleanup: Client deleted successfully');
        } else {
            console.log('Cleanup: Delete button not found after search');
        }
    });

});
