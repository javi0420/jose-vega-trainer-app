import { test, expect } from '@playwright/test';

test.describe('Load Assigned Routine Flow', () => {
    // Unique data for this test run
    const timestamp = Date.now();
    const routineName = `Assigned Routine ${timestamp}`;
    const clientName = `Client ${timestamp}`;
    const clientEmail = `client${timestamp}@test.com`;
    const password = 'Jose2026';

    test('trainer can assign routine and client can load it in workout editor', async ({ page }) => {
        test.setTimeout(120000); // Allow extra time for dual login flow

        // Helper to handle the mandatory password reset
        async function handleForcedReset(page, newPass) {
            // Wait for potential redirect to /update-password
            try {
                await page.waitForURL(/.*\/update-password/, { timeout: 8000 });
            } catch (e) {
                // If we're already on /app or elsewhere, just return
                if (page.url().includes('/app')) return;
            }

            if (page.url().includes('update-password')) {
                console.log('Forced reset detected, updating password...');
                await page.fill('input[type="password"] >> nth=0', newPass);
                await page.fill('input[type="password"] >> nth=1', newPass);
                await page.click('button:has-text("Actualizar contraseña")');
                
                // Use Promise.race to wait for either success UI or redirect
                await Promise.race([
                    page.waitForURL(/.*\/app/, { timeout: 20000 }),
                    expect(page.locator('text=¡Todo listo!')).toBeVisible({ timeout: 20000 })
                ]);
                
                // Allow time for auto-redirect
                await page.waitForTimeout(2000); 
                if (!page.url().includes('/app')) {
                    await page.goto('/app');
                }
            }
        }

        console.log('START: Trainer Setup');
        // ==========================================
        // PHASE 1: TRAINER SETUP
        // ==========================================
        await page.goto('/');
        await page.getByTestId('login-input-email').fill('trainer@test.com');
        await page.getByTestId('login-input-password').fill('password123');
        await page.getByTestId('login-btn-submit').click();

        // If base password fails, try the updated one
        const errorMsg = page.locator('text=Invalid login credentials');
        if (await errorMsg.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('Retrying with updated trainer password...');
            await page.getByTestId('login-input-password').fill('password123!');
            await page.getByTestId('login-btn-submit').click();
        }

        await handleForcedReset(page, 'password123!');
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

        // 1. Create Template Routine
        await page.getByTestId('nav-btn-routines').click();
        await page.getByRole('button', { name: 'Crear Nueva Plantilla' }).click();
        await page.fill('label:has-text("Nombre") + input', routineName);
        console.log('Creating routine:', routineName);
        await page.click('form button:has-text("Crear Plantilla")');

        // Add an exercise to the routine
        await page.click(`text=${routineName}`);
        await page.click('button:has-text("Añadir Primer Ejercicio")');
        await page.fill('input[placeholder="Buscar ejercicio..."]', 'Press de Banca');
        await page.locator('button:has-text("Press de Banca")').first().click();
        // Verify exercise is added to the editor before saving
        await expect(page.locator('h3:has-text("Press de Banca")')).toBeVisible({ timeout: 5000 });
        await page.click('button:has-text("GUARDAR")');
        // Wait for the save redirect to the routines list
        await expect(page).toHaveURL(/\/app\/routines$/, { timeout: 20000 });
        console.log('Routine created and saved');
        await page.getByTestId('nav-btn-home').click();

        // 2. Create Client
        const addClientBtn = page.getByRole('button', { name: 'Añadir Cliente' });
        await expect(addClientBtn).toBeVisible({ timeout: 10000 });
        await addClientBtn.click();
        await page.fill('input[placeholder="Ej: Juan Pérez"]', clientName);
        await page.fill('input[placeholder="ejemplo@email.com"]', clientEmail);
        await page.click('button:has-text("Crear Cliente")');
        await page.getByRole('button', { name: 'Crear Cliente' }).waitFor({ state: 'hidden' });
        console.log('Client created:', clientName);

        // 3. Assign Routine to Client
        await page.fill('input[placeholder="Buscar cliente..."]', clientName);
        await page.getByText(clientName).waitFor({ state: 'visible' });

        await page.locator('button[title="Gestionar Rutinas"]').first().click({ force: true });

        await page.locator('input[placeholder="Buscar en mis plantillas..."]').fill(routineName);
        await page.click(`h4:has-text("${routineName}")`);
        await page.click('button:has-text("Confirmar Asignación")');
        console.log('Assignment confirmed');

        // Wait for modal to close
        await page.locator('h2:has-text("Asignar Rutina")').waitFor({ state: 'hidden', timeout: 5000 });
        console.log('Assignment modal closed');

        // 4. Logout Trainer (Navigate to profile first)
        await page.goto('/app/profile');
        await page.click('button:has-text("Cerrar Sesión")');
        await expect(page).toHaveURL('/');
        console.log('Trainer logged out');

        // ==========================================
        // PHASE 2: CLIENT VERIFICATION
        // ==========================================

        // 1. Login as Client
        await page.getByTestId('login-input-email').fill(clientEmail);
        await page.getByTestId('login-input-password').fill(password);
        await page.getByTestId('login-btn-submit').click();
        console.log('Client login submitted');

        await handleForcedReset(page, password + '!');
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });
        console.log('Client successfully logged in and redirected');

        // 2. Handle Legal Terms (if new client)
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

        console.log('Proceeding to New Workout via goto...');
        // 3. Go to New Workout
        // Use direct navigation to potential UI click issues
        // Auto-accept any confirmation dialogs (e.g. "Cargar esta plantilla?")
        page.on('dialog', dialog => dialog.accept());
        await page.goto('/app/workout/new?auth=true');
        await page.waitForLoadState('networkidle');
        console.log('Navigated to Workout Editor (via goto)');

        await expect(page).toHaveURL(/\/app\/workout\/new/, { timeout: 10000 });

        // 4. Open "Rutina Entrenador" Modal
        const loadAssignedBtn = page.locator('text=Rutina Entrenador');

        try {
            if (await loadAssignedBtn.isVisible({ timeout: 3000 })) {
                console.log('Clicking visible text button');
                await loadAssignedBtn.click();
            } else {
                throw new Error('Button not visible');
            }
        } catch (e) {
            console.log('Text button not found, clicking header icon');
            await page.locator('button[title="Cargar rutina asignada por entrenador"]').click();
        }

        // 5. Verify Modal Content
        await expect(page.locator('h2:has-text("Rutinas Asignadas")')).toBeVisible();
        await expect(page.locator(`text=${routineName}`)).toBeVisible();
        console.log('Routine visible in list');

        // 6. Load the Routine
        await page.click(`text=${routineName}`);
        await expect(page.locator('h2:has-text("Rutinas Asignadas")')).toBeHidden({ timeout: 10000 });

        // 7. Verify Exercises Loaded in Editor
        // Wait for the empty state to disappear first
        await expect(page.locator('button:has-text("Añadir Primer Ejercicio")')).toBeHidden({ timeout: 10000 });
        
        // Use the new stable test-id for exercise name (case-insensitive)
        const exerciseElement = page.getByTestId('exercise-name').filter({ hasText: /press/i }).first();
        await expect(exerciseElement).toBeVisible({ timeout: 25000 });

        
        await expect(page.getByTestId('workout-header-title-trigger')).toContainText(new RegExp(routineName, 'i'));
        console.log('Routine loaded successfully');
    });
});
