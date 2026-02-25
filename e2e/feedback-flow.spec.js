import { test, expect } from '@playwright/test';

test.describe('Trainer Feedback Priority UI Flow', () => {
    test('Full Lifecycle: Priority Card -> Detail -> Read Confirmation', async ({ browser }) => {
        // High timeout for complex multi-context test
        test.setTimeout(240000);

        const trainerContext = await browser.newContext();
        const clientContext = await browser.newContext();
        const trainerPage = await trainerContext.newPage();
        const clientPage = await clientContext.newPage();

        const uniqueId = Date.now();
        const clientEmail = `collab_priority_${uniqueId}@test.com`;
        const trainerEmail = 'trainer@test.com';
        const password = 'password123';

        // --- STEP 1: Trainer Login & Create Client ---
        console.log('Trainer: Logging in...');
        await trainerPage.goto('/');
        await trainerPage.getByTestId('login-input-email').fill(trainerEmail);
        await trainerPage.getByTestId('login-input-password').fill(password);
        await trainerPage.getByTestId('login-btn-submit').click();
        await expect(trainerPage).toHaveURL('/app', { timeout: 30000 });

        console.log('Trainer: Creating client...');
        await trainerPage.locator('button[title="Añadir Cliente"]').click();
        await trainerPage.fill('input[placeholder="Ej: Juan Pérez"]', `Priority Client ${uniqueId}`);
        await trainerPage.fill('input[placeholder="ejemplo@email.com"]', clientEmail);

        const dialogPromise = trainerPage.waitForEvent('dialog');
        await trainerPage.click('button:has-text("Crear Cliente")');
        const dialog = await dialogPromise;
        await dialog.accept();

        await trainerPage.waitForTimeout(5000); // Wait for auth to settle

        // --- STEP 2: Client Login & Create Workout ---
        console.log(`Client: Logging in (${clientEmail})...`);
        await clientPage.goto('/');
        await clientPage.getByTestId('login-input-email').fill(clientEmail);
        await clientPage.getByTestId('login-input-password').fill('Joaquin2025');
        await clientPage.getByTestId('login-btn-submit').click();

        await expect(clientPage).toHaveURL('/app', { timeout: 30000 });
        console.log('Client: Logged in.');

        // Handle Privacy Modal
        const privacyModal = clientPage.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await clientPage.click('button:has-text("Aceptar y Continuar")');
        }

        console.log('Client: Creating workout...');
        await clientPage.click('button:has-text("Nuevo Entreno")');
        await clientPage.waitForURL(/\/app\/workout\/new/, { timeout: 15000 });

        // Add an exercise
        await clientPage.click('button:has-text("Añadir Ejercicio")');
        // Improved selector for exercise list item
        await clientPage.waitForSelector('li button', { timeout: 10000 });
        await clientPage.locator('li button').first().click();
        await clientPage.waitForTimeout(1000);

        // Add a set
        await clientPage.click('button:has-text("Añadir Set")');
        const weightInput = clientPage.locator('input[placeholder="kg"]').first();
        await weightInput.fill('65');
        // Fix: Also fill repetitions
        const repsInput = clientPage.locator('input[placeholder="reps"]').first();
        await repsInput.fill('8');

        await clientPage.getByTestId('workout-btn-complete-set').first().click();

        console.log('Client: Saving workout...');
        await Promise.all([
            clientPage.waitForURL(/\/app\/workout\/[a-f0-9-]{36}/, { timeout: 35000 }),
            clientPage.click('button:has-text("Finalizar")')
        ]);

        console.log('Client: Workout created.');
        await clientPage.goto('/app');
        await clientPage.waitForLoadState('networkidle');

        // --- STEP 3: Trainer leaves feedback ---
        console.log('Trainer: Navigating to client workout...');
        await trainerPage.goto('/app');
        await trainerPage.reload();
        await trainerPage.click(`text=Priority Client ${uniqueId}`);

        // Wait for the workout to definitely appear
        const workoutSelector = trainerPage.locator('div[class*="rounded-"]').filter({ hasText: /Priority Workout 1|Entrenamiento/i }).first();
        await expect(workoutSelector).toBeVisible({ timeout: 20000 });
        await workoutSelector.click();

        console.log('Trainer: Sending feedback...');
        const feedbackText = `Final Priority Check ${uniqueId}`;
        await trainerPage.locator('textarea').fill(feedbackText);
        await trainerPage.click('button:has-text("Enviar Feedback")');
        await expect(trainerPage.getByTestId('trainer-feedback-status')).toHaveText('Enviado', { timeout: 15000 });

        // CRITICAL: Wait for network idle to ensure DB update propagates
        await trainerPage.waitForLoadState('networkidle');
        await trainerPage.waitForTimeout(2000);

        // --- STEP 4: Client sees Priority Card ---
        console.log('Client: Verifying Priority Card visibility...');
        await clientPage.goto('/app');
        await clientPage.reload();
        await clientPage.waitForLoadState('networkidle');

        // Increased timeout for Priority Card
        const chip = clientPage.getByTestId('feedback-chip').first();
        await expect(chip).toBeVisible({ timeout: 25000 });

        const priorityCard = clientPage.locator('div:has(> [data-testid="feedback-chip"])').first();
        await priorityCard.click();

        // --- STEP 5: Verification of Read State ---
        console.log('Client: Viewing feedback...');
        await expect(clientPage.getByTestId('trainer-feedback-block')).toBeVisible({ timeout: 15000 });
        await expect(clientPage.getByTestId('trainer-feedback-block')).toContainText(feedbackText);

        await clientPage.goto('/app');
        await expect(clientPage.getByTestId('feedback-chip')).toBeHidden({ timeout: 15000 });
        console.log('Test completed successfully.');
    });
});
