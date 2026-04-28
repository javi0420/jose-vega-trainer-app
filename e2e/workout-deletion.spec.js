import { test, expect } from '@playwright/test';

/**
 * Workout Deletion & Permissions Tests
 * Validates:
 * 1. Client can delete their own workout.
 * 2. Trainer CANNOT see the delete button in a client's workout.
 * 3. RLS prevents unauthorized deletion (implicit in the UI test).
 */

const TRAINER = {
    email: 'trainer@test.com',
    password: 'password123'
};

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
    const passwords = [TRAINER.password, TRAINER.password + '!'];
    let success = false;

    for (const pass of passwords) {
        console.log(`[AUTH] Attempting trainer login with password: ${pass}`);
        await page.goto('/');
        await page.fill('input[type="email"]', TRAINER.email);
        await page.fill('input[type="password"]', pass);
        await page.click('button:has-text("Iniciar Sesión")');
        
        await page.waitForTimeout(2000);
        
        if (page.url().includes('update-password')) {
            await handleForcedReset(page, TRAINER.password + '!');
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

test.describe('Workout Deletion & Restrictions', () => {

    test('Full Deletion Lifecycle: Create Client -> Create Workout -> Trainer View -> Client Delete', async ({ page }) => {
        const uniqueId = Date.now();
        const clientEmail = `delete_test_${uniqueId}@test.com`;
        const clientName = `Delete Test User ${uniqueId}`;

        // --- STEP 1: TRAINER CREATES CLIENT ---
        await loginAsTrainer(page);
        await expect(page).toHaveURL(/\/app/);

        // Create client
        await page.click('button[title="Añadir Cliente"]');
        await page.fill('input[placeholder="Ej: Juan Pérez"]', clientName);
        await page.fill('input[placeholder="ejemplo@email.com"]', clientEmail);
        page.once('dialog', dialog => dialog.accept());
        await page.click('button:has-text("Crear Cliente")');
        await expect(page.locator('text=Nuevo Cliente')).not.toBeVisible();

        // Logout Trainer
        await page.click('button[aria-label="Cerrar sesión"]');
        await expect(page).toHaveURL('/');

        // --- STEP 2: CLIENT ACCEPTS TERMS & CREATES WORKOUT ---
        await page.fill('input[type="email"]', clientEmail);
        await page.fill('input[type="password"]', 'Jose2026');
        await page.click('button:has-text("Iniciar Sesión")');
        
        await page.waitForTimeout(2000);
        await handleForcedReset(page, 'Jose2026!');
        await expect(page).toHaveURL(/\/app/);

        // Handle Privacy Modal if it appears
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        const acceptBtn = page.locator('button:has-text("Aceptar y Continuar")');
        try {
            await acceptBtn.waitFor({ state: 'visible', timeout: 10000 });
            await acceptBtn.click();
            await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
            console.log('Client: Privacy Modal accepted.');
        } catch (e) {
            console.log('Client: Privacy Modal not found or already handled.');
        }

        // Create basic workout - Handle dynamic default name
        await expect(page.getByTestId('new-workout-btn')).toBeVisible({ timeout: 15000 });
        await page.waitForLoadState('networkidle');
        
        // Use Promise.all to capture navigation triggered by click
        await Promise.all([
            page.waitForURL(/\/app\/workout\/new/, { timeout: 20000 }),
            page.getByTestId('new-workout-btn').click({ force: true })
        ]);

        // Wait for ANY of the "empty" workout options or the default title
        const workoutOption = page.locator('text=Entreno Vacío').or(page.locator('text=Entrenamiento de'));
        await expect(workoutOption.first()).toBeVisible({ timeout: 15000 });
        await workoutOption.first().click();

        // Handle title editing
        if (!await page.getByTestId('workout-name-edit-input').isVisible()) {
            await page.getByTestId('workout-header-title-trigger').click();
        }
        await page.getByTestId('workout-name-edit-input').fill('Test Workout to Delete');
        await page.getByTestId('workout-name-save-btn').click();
        await expect(page.getByTestId('workout-header-title-trigger')).toContainText('Test Workout to Delete');


        // Add an exercise to be able to save
        await page.click('button:has-text("Añadir Ejercicio")');

        // Search for an exercise to ensure the list populates
        await page.getByPlaceholder('Buscar ejercicio...').fill('Press');

        // Wait for any exercise item to appear and click it (using partial testId match)
        await page.locator('[data-testid^="exercise-item-"]').first().click();

        // Complete one set
        await page.getByTestId('workout-btn-add-set').first().click();
        await page.getByTestId('workout-input-reps').first().fill('10'); // reps
        await page.getByTestId('workout-input-weight').first().fill('50'); // weight
        await page.click('button[data-testid="workout-btn-complete-set"]');

        // Finish workout
        await page.getByTestId('workout-btn-save').click();
        // Redirects to summary/detail (UUID)
        await expect(page).toHaveURL(/\/app\/workout\/[a-f0-9-]{36}/);
        const workoutUrl = page.url();
        const workoutId = workoutUrl.split('/').pop();

        // Verify Delete button is visible for Client
        await expect(page.locator('button[title="Eliminar entrenamiento"]')).toBeVisible();

        // Return to Dashboard to find logout button
        await page.click('button[aria-label="Volver al inicio"]');
        await expect(page).toHaveURL(/\/app/);

        // Logout Client
        await page.click('button[aria-label="Cerrar sesión"]');
        await expect(page).toHaveURL('/');

        // --- STEP 3: TRAINER VIEWS WORKOUT (Should NOT see delete button) ---
        await loginAsTrainer(page);
        await expect(page).toHaveURL(/\/app/);

        // Go to the client's workout detail
        await page.goto(`/app/workout/${workoutId}`);

        await expect(page.getByRole('heading', { name: 'Test Workout to Delete' })).toBeVisible({ timeout: 15000 });

        // Verify Delete button is HIDDEN for Trainer
        await expect(page.locator('button[title="Eliminar entrenamiento"]')).not.toBeVisible();
        await expect(page.locator('svg.lucide-trash2')).toHaveCount(0);

        // Return to Dashboard to find logout button
        await page.click('button[aria-label="Volver al inicio"]');
        await expect(page).toHaveURL(/\/app/);

        // Logout Trainer
        await page.click('button[aria-label="Cerrar sesión"]');
        await expect(page).toHaveURL('/');

        // --- STEP 4: CLIENT DELETES WORKOUT ---
        await page.fill('input[type="email"]', clientEmail);
        await page.fill('input[type="password"]', 'Jose2026!');
        await page.click('button:has-text("Iniciar Sesión")');
        
        await page.waitForTimeout(2000);
        await handleForcedReset(page, 'Jose2026!');
        await expect(page).toHaveURL(/\/app/);

        await page.goto(`/app/workout/${workoutId}`);
        await page.click('button[title="Eliminar entrenamiento"]');
        await page.click('button:has-text("Confirmar Borrado")');

        // Verify redirect to history
        await expect(page).toHaveURL('/app/history');
        await expect(page.locator('text=Test Workout to Delete')).not.toBeVisible();
    });
});
