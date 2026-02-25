import { test, expect } from '@playwright/test';

const TEST_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Workout Summary Feature', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        // Listen to console errors
        page.on('console', msg => {
            if (msg.type() === 'error') console.log(`[Browser Error]: ${msg.text()}`);
        });
        page.on('pageerror', err => console.log(`[Page Error]: ${err.message}`));

        // Login
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.fill('input[placeholder="nombre@ejemplo.com"]', TEST_USER.email);
        await page.fill('input[placeholder="••••••••"]', TEST_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/, { timeout: 25000 });

        // Handle Privacy Consent Modal
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
            await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
        }
    });

    test('Displays correct summary elements for a populated workout', async ({ page }) => {
        // 1. Create a new workout directly via UI
        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/new/);

        // Add Exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.waitForSelector('li button');
        await page.locator('li button').first().click();
        await page.waitForTimeout(500); // Wait for block to appear

        // 3. Add a set with data
        // Explicitly add a set to ensure inputs exist
        // Handle "Empty State" where we need to add first exercise
        const addFirstBtn = page.locator('button:has-text("Añadir Primer Ejercicio")');
        if (await addFirstBtn.isVisible()) {
            await addFirstBtn.click();
            // Wait for exercise selector or just default addition? 
            // The button usually opens selector or adds default depending on impl. 
            // Assuming it opens catalog, we need to pick one.
            // If the flow adds a default exercise, we are good.
            // If it opens a modal, we need to select one.
            // Let's assume we need to select one if a modal appears.
            if (await page.locator('text=Catálogo').isVisible()) {
                await page.click('button:has-text("Añadir") >> nth=0'); // Add first available
                await page.click('button[aria-label="Cerrar"]'); // Close modal if needed
            }
        }

        // Now ensure we have a set button
        await page.click('button:has-text("Añadir Set")');

        // Fill weight and reps.
        const weightInput = page.locator('input[placeholder="kg"]');
        const repsInput = page.locator('input[placeholder="reps"]');
        await expect(weightInput).toBeVisible({ timeout: 5000 });
        await weightInput.fill('100');
        await repsInput.fill('10');

        // Complete the set
        const completeBtn = page.getByRole('button', { name: 'Completar set' }).first();
        await completeBtn.click();

        // 4. Save workout
        // Handle the potential "No has marcado ninguna serie como completada" confirm dialog
        page.once('dialog', async dialog => {
            console.log(`[Positive Case] Handling dialog: ${dialog.message()}`);
            await dialog.accept();
        });

        await Promise.all([
            page.waitForResponse(resp =>
                resp.url().includes('save_full_workout') &&
                resp.status() === 200,
                { timeout: 20000 }
            ),
            page.click('button:has-text("Finalizar")')
        ]);

        // Confirm save if a second dialog/button appears (handling variations)
        const confirmBtn = page.locator('button:has-text("Guardar Entrenamiento")');
        if (await confirmBtn.isVisible()) {
            await confirmBtn.click();
        }

        // 5. Verify redirection to Summary/Detail
        // Check if redirected to Detail (Client) or Dashboard (Trainer)
        await expect(page).not.toHaveURL(/\/new$/, { timeout: 15000 });

        const onDashboard = await page.locator('text=Panel de Entrenador').isVisible().catch(() => false);
        if (onDashboard || page.url().endsWith('/app')) {
            if (await page.locator('button:has-text("Revisar")').first().isVisible()) {
                await page.locator('button:has-text("Revisar")').first().click();
            }
        }

        await page.waitForURL(/\/app\/workout\/.*/, { timeout: 20000 });
        await page.waitForLoadState('networkidle');

        // Debug: Log content if failing
        // Debug: Log content if failing
        // console.log(await page.content());

        // 6. Verify New Summary Elements (Positive Case)
        // Header Stats
        await expect(page.locator('text=Volumen Total').first()).toBeVisible({ timeout: 25000 });
        // await expect(page.locator('text=Debug Mode: Summary Header Disabled')).toBeVisible(); // Check for debug text
        await expect(page.locator('text=ton')).toBeVisible();
        await expect(page.locator('text=1.0')).toBeVisible();

        // Muscle Heatmap (Text might vary based on exercise, checking container title)
        await expect(page.locator('text=Enfoque Muscular')).toBeVisible();

        // Exercise Card
        await expect(page.locator('text=Resumen de Ejercicios')).toBeVisible();
        await expect(page.locator('text=Mejor Set')).toBeVisible();
        await expect(page.getByTestId('summary-best-set-value')).toHaveText('100kg × 10');
        await expect(page.getByTestId('summary-set-value').first()).toHaveText('100kg × 10');
    });

    test('Handles empty workout gracefully (Negative Case)', async ({ page }) => {
        // 1. Create a new workout directly via UI
        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/new/);

        // 2. Click Finish (attempt to save empty)
        page.once('dialog', dialog => {
            console.log(`[Negative Case] Accepting dialog: ${dialog.message()}`);
            dialog.accept();
        });

        // Use dispatch or force since "Finalizar" might be visually distinct
        await page.click('button:has-text("Finalizar")');

        // 3. Verify Validation Block
        // The App should PREVENT saving an empty workout.
        // Therefore, we should STILL be on the /new page (or have an error toast).

        // Wait a short moment to ensure no redirect happens
        await page.waitForTimeout(1000);
        await expect(page).toHaveURL(/\/new/);

        // Optional: Check for error message if UI shows one (e.g. toast)
        // await expect(page.locator('text=No puedes guardar un entreno vacío')).toBeVisible();
    });
});
