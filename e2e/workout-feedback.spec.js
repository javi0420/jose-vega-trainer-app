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
        const defaultClientPassword = process.env.VITE_DEFAULT_PASSWORD || 'Jose2026';

        // Centralized, robust helper to handle the mandatory password reset
        async function handleForcedReset(page, newPass) {
            if (page.url().includes('update-password')) {
                console.log(`[AUTH] Forced reset detected at ${page.url()}. Updating password...`);
                await page.fill('input[type="password"] >> nth=0', newPass);
                await page.fill('input[type="password"] >> nth=1', newPass);
                await page.click('button:has-text("Actualizar contraseña")');
                
                // Wait for the success state or redirect
                await Promise.race([
                    page.waitForURL(/\/app/, { timeout: 15000 }),
                    expect(page.locator('text=¡Todo listo!')).toBeVisible({ timeout: 15000 })
                ]);
                
                if (!page.url().includes('/app')) {
                    await page.goto('/app');
                }
                await expect(page).toHaveURL(/\/app/, { timeout: 10000 });
                console.log('[AUTH] Forced reset handled successfully.');
            }
        }

        // Robust trainer login helper that tries both password variants
        async function loginAsTrainer(page) {
            const passwords = ['password123', 'password123!'];
            let success = false;

            for (const pass of passwords) {
                console.log(`[AUTH] Attempting trainer login with password: ${pass}`);
                await page.goto('/');
                await page.fill('input[type="email"]', 'trainer@test.com');
                await page.fill('input[type="password"]', pass);
                await page.click('button:has-text("Iniciar Sesión")');
                
                await page.waitForTimeout(2000);
                
                if (page.url().includes('update-password')) {
                    await handleForcedReset(page, 'password123!');
                    success = true;
                    break;
                }
                
                if (page.url().includes('/app')) {
                    success = true;
                    break;
                }
            }

            if (!success) {
                throw new Error('Failed to login as trainer with either password variant');
            }
        }

        // --- STEP 1: Trainer Login & Create Client ---
        await loginAsTrainer(trainerPage);
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
        await clientPage.fill('input[type="password"]', defaultClientPassword);
        await clientPage.click('button:has-text("Iniciar Sesión")');
        
        // Wait for potential redirect or dashboard
        await clientPage.waitForTimeout(2000);
        await handleForcedReset(clientPage, 'Jose2026!');
        await expect(clientPage).toHaveURL('/app', { timeout: 20000 });
        const privacyModal = clientPage.locator('text=Consentimiento de Privacidad');
        try {
            if (await privacyModal.isVisible({ timeout: 5000 })) {
                await clientPage.click('button:has-text("Aceptar y Continuar")');
                await expect(privacyModal).toBeHidden({ timeout: 10000 });
                await clientPage.waitForTimeout(1000); // Buffer for animations
            }
        } catch (e) {
            // Modal not found or already handled
        }

        await expect(clientPage.getByTestId('new-workout-btn')).toBeVisible({ timeout: 15000 });
        await clientPage.waitForLoadState('networkidle');
        
        // Use Promise.all to capture navigation triggered by click
        await Promise.all([
            clientPage.waitForURL(/\/app\/workout\/new/, { timeout: 20000 }),
            clientPage.getByTestId('new-workout-btn').click({ force: true })
        ]);

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
