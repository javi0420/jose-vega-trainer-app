import { test, expect } from '@playwright/test';

test.describe('Load Assigned Routine Flow', () => {
    // Unique data for this test run
    const timestamp = Date.now();
    const routineName = `Assigned Routine ${timestamp}`;
    const clientName = `Client ${timestamp}`;
    const clientEmail = `client${timestamp}@test.com`;
    const password = 'Joaquin2025';

    test('trainer can assign routine and client can load it in workout editor', async ({ page }) => {
        test.setTimeout(120000); // Allow extra time for dual login flow

        console.log('START: Trainer Setup');
        // ==========================================
        // PHASE 1: TRAINER SETUP
        // ==========================================
        await page.goto('/');
        await page.getByTestId('login-input-email').fill('trainer@test.com');
        await page.getByTestId('login-input-password').fill('password123');
        await page.getByTestId('login-btn-submit').click();
        await expect(page).toHaveURL(/\/app/);

        // 1. Create Template Routine
        await page.getByTestId('nav-btn-routines').click();
        await page.getByRole('button', { name: 'Crear Nueva Plantilla' }).click();
        await page.fill('label:has-text("Nombre") + input', routineName);
        console.log('Creating routine:', routineName);
        await page.click('form button:has-text("Crear Plantilla")');

        // Add an exercise to the routine
        await page.click(`text=${routineName}`);
        await page.click('button:has-text("Añadir Primer Ejercicio")');
        await page.fill('input[placeholder="Buscar ejercicio..."]', 'Press Banca');
        await page.locator('button:has-text("Press Banca")').first().click();
        await page.click('button:has-text("GUARDAR")');
        await page.waitForTimeout(1000);
        await page.getByTestId('nav-btn-home').click();
        console.log('Routine created and saved');

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

        await expect(page).toHaveURL(/\/app/, { timeout: 10000 });
        console.log('Client successfully logged in and redirected');

        // 2. Handle Legal Terms (if new client)
        try {
            console.log('Waiting for Privacy Consent Modal...');
            const termsSelector = 'text=Consentimiento de Privacidad';
            // Increase timeout to 10s
            await page.locator(termsSelector).waitFor({ state: 'visible', timeout: 10000 });
            await page.click('button:has-text("Aceptar y Continuar")');
            console.log('Privacy consent accepted');
            await page.locator(termsSelector).waitFor({ state: 'hidden', timeout: 10000 });
            await page.waitForTimeout(2000); // Wait for DB propagation
        } catch (e) {
            console.log('Privacy modal interaction skipped (not found within 10s)');
        }

        console.log('Proceeding to New Workout via goto...');
        // 3. Go to New Workout
        // Use direct navigation to potential UI click issues
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

        // 7. Verify Exercises Loaded in Editor
        await expect(page.getByRole('heading', { level: 3, name: /Press Banca/i })).toBeVisible();
        await expect(page.getByTestId('workout-header-title-trigger')).toContainText(/Assigned Routine/i);
        console.log('Routine loaded successfully');
    });
});
