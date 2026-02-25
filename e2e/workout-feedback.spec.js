import { test, expect } from '@playwright/test';

test.describe('Workout Feedback UI Flow', () => {
    test('UI Lifecycle: trainer leaves feedback, client sees badge and views it', async ({ browser }) => {
        test.setTimeout(180000);

        const trainerContext = await browser.newContext();
        const clientContext = await browser.newContext();
        const trainerPage = await trainerContext.newPage();
        const clientPage = await clientContext.newPage();

        const uniqueId = Date.now();
        const clientEmail = `collab_badge_${uniqueId}@test.com`;
        const trainerEmail = 'trainer@test.com';
        const password = 'password123';

        // --- STEP 1: Trainer Login & Create Client ---
        await trainerPage.goto('/');
        await trainerPage.getByTestId('login-input-email').fill(trainerEmail);
        await trainerPage.getByTestId('login-input-password').fill(password);
        await trainerPage.getByTestId('login-btn-submit').click();
        await expect(trainerPage).toHaveURL('/app');

        await trainerPage.locator('button[title="Añadir Cliente"]').click();
        await trainerPage.fill('input[placeholder="Ej: Juan Pérez"]', `Badge User ${uniqueId}`);
        await trainerPage.fill('input[placeholder="ejemplo@email.com"]', clientEmail);

        const dialogPromise = trainerPage.waitForEvent('dialog');
        await trainerPage.click('button:has-text("Crear Cliente")');
        const dialog = await dialogPromise;
        await dialog.accept();

        await trainerPage.waitForTimeout(5000);

        // --- STEP 2: Client Creates Workout (Golden Path) ---
        await clientPage.goto('/');
        await clientPage.getByTestId('login-input-email').fill(clientEmail);
        await clientPage.getByTestId('login-input-password').fill('Joaquin2025');
        await clientPage.getByTestId('login-btn-submit').click();

        await expect(clientPage).toHaveURL('/app', { timeout: 20000 });
        const privacyModal = clientPage.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await clientPage.click('button:has-text("Aceptar y Continuar")');
        }

        await clientPage.click('button:has-text("Nuevo Entreno")');
        await clientPage.waitForURL(/\/app\/workout\/new/);

        await clientPage.click('button:has-text("Añadir Ejercicio")');
        await clientPage.waitForSelector('li button');
        await clientPage.locator('li button').first().click();
        await clientPage.waitForTimeout(500);

        await clientPage.click('button:has-text("Añadir Set")');
        await clientPage.locator('input[placeholder="kg"]').first().fill('40');
        await clientPage.locator('input[placeholder="reps"]').first().fill('10');
        await clientPage.getByTestId('workout-btn-complete-set').first().click();

        await Promise.all([
            clientPage.waitForURL(/\/app\/workout\/[a-f0-9-]{36}/),
            clientPage.click('button:has-text("Finalizar")')
        ]);

        await clientPage.goto('/app');

        // --- STEP 3: Trainer leaves feedback ---
        await trainerPage.goto('/app');
        await trainerPage.reload();
        await trainerPage.click(`text=Badge User ${uniqueId}`);
        const workoutCard = trainerPage.locator('div[class*="rounded-"]').filter({ hasText: /Badge Workout|Entrenamiento/i }).first();
        await workoutCard.click();

        const feedbackText = `Badge Test ${uniqueId}`;
        await trainerPage.locator('textarea').fill(feedbackText);
        await trainerPage.click('button:has-text("Enviar Feedback")');
        await expect(trainerPage.getByTestId('trainer-feedback-status')).toHaveText('Enviado', { timeout: 15000 });

        // --- STEP 4: Client sees Chip ---
        await clientPage.goto('/app');
        await clientPage.reload();
        await expect(clientPage.getByTestId('feedback-chip').first()).toBeVisible({ timeout: 20000 });

        // Check history too
        await clientPage.goto('/app/history');
        await expect(clientPage.getByTestId('feedback-chip').first()).toBeVisible({ timeout: 15000 });

        // --- STEP 5: Client views feedback (marks as read) ---
        await clientPage.locator('div:has(> [data-testid="feedback-chip"])').first().click();
        await expect(clientPage.getByTestId('trainer-feedback-block')).toBeVisible();
        await expect(clientPage.getByTestId('trainer-feedback-block')).toContainText(feedbackText);

        // --- STEP 6: Chip disappears ---
        await clientPage.goto('/app');
        await expect(clientPage.getByTestId('feedback-chip')).toBeHidden({ timeout: 15000 });

        await clientPage.goto('/app/history');
        await expect(clientPage.getByTestId('feedback-chip')).toBeHidden({ timeout: 10000 });
    });
});
