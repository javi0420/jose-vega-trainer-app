import { test, expect } from '@playwright/test';

test.describe('Client Deactivation Flow', () => {
    test.setTimeout(120000);

    const clientEmail = `flow_${Date.now()}@test.com`;
    const clientName = `Test User Flow ${Date.now()}`;
    const TRAINER = { email: 'trainer@test.com', pass: 'password123' };

    test('Flow integral 7 pasos', async ({ page }) => {
        // Global Dialog Handler
        page.on('dialog', async dialog => {
            console.log(`[Dialog] ${dialog.message()}`);
            await dialog.accept();
        });

        // 1. LOGIN COMO TRAINER
        console.log('--- PASO 1: Login como Trainer ---');
        await page.goto('http://localhost:5173/login');
        await page.fill('input[name="email"]', TRAINER.email);
        await page.fill('input[name="password"]', TRAINER.pass);
        await page.click('button[type="submit"]');
        await expect(page.locator('button[aria-label="Cerrar sesión"]')).toBeVisible({ timeout: 20000 });

        // 2. CREAR UN CLIENTE
        console.log('--- PASO 2: Crear Cliente ---');
        await page.click('button[title="Añadir Cliente"]');
        await page.fill('input[placeholder="Ej: Juan Pérez"]', clientName);
        await page.fill('input[placeholder="ejemplo@email.com"]', clientEmail);
        await page.click('button:has-text("Crear Cliente")');
        await page.waitForTimeout(4000);

        // 3. LOGOUT E INICIAR SESIÓN CON EL CLIENTE
        console.log('--- PASO 3: Login Cliente ---');
        await page.click('button[aria-label="Cerrar sesión"]');
        await page.fill('input[name="email"]', clientEmail);
        await page.fill('input[name="password"]', 'Joaquin2025');
        await page.click('button[type="submit"]');

        // Manejar Modal de Privacidad (si aparece) - Espera robusta
        try {
            const consentBtn = page.getByRole('button', { name: /Aceptar y Continuar/i });
            await consentBtn.waitFor({ state: 'visible', timeout: 10000 });
            await consentBtn.click();
            console.log('[Test] Modal de privacidad detectado y aceptado.');
        } catch (e) {
            console.log('[Test] El modal de privacidad no apareció (procediendo...).');
        }

        // Validar que estamos logueados buscando el botón de cerrar sesión
        await expect(page.locator('button[aria-label="Cerrar sesión"]')).toBeVisible({ timeout: 20000 });

        // 4. DESACTIVAR
        console.log('--- PASO 4: Desactivar Cliente ---');
        // Aseguramos que el botón de cerrar sesión sea interactuable
        const logoutBtn = page.locator('button[aria-label="Cerrar sesión"]');
        await expect(logoutBtn).toBeVisible({ timeout: 10000 });
        await logoutBtn.click();
        await page.fill('input[name="email"]', TRAINER.email);
        await page.fill('input[name="password"]', TRAINER.pass);
        await page.click('button[type="submit"]');

        await page.fill('input[placeholder="Buscar cliente..."]', clientName);
        await page.waitForTimeout(1000);
        const cardToDeact = page.getByRole('row', { name: clientName }).first();
        await cardToDeact.getByTestId('actions-trigger').click({ force: true });
        // Update TestID: action-toggle-status -> action-deactivate
        await page.getByTestId('action-deactivate').click({ force: true });
        await page.waitForTimeout(3000);
        await expect(cardToDeact).toHaveClass(/opacity-50/);

        // 5. BLOQUEO
        console.log('--- PASO 5: Verificar Bloqueo ---');
        await page.click('button[aria-label="Cerrar sesión"]');
        await page.fill('input[name="email"]', clientEmail);
        await page.fill('input[name="password"]', 'Joaquin2025');
        await page.click('button[type="submit"]');
        await expect(page.locator('text=Esta cuenta ha sido desactivada')).toBeVisible({ timeout: 15000 });

        // 6. REACTIVAR
        console.log('--- PASO 6: Reactivar Cliente ---');
        await page.fill('input[name="email"]', TRAINER.email);
        await page.fill('input[name="password"]', TRAINER.pass);
        await page.click('button[type="submit"]');

        await page.fill('input[placeholder="Buscar cliente..."]', clientName);
        await page.waitForTimeout(1000);
        const cardReact = page.getByRole('row', { name: clientName }).first();
        await cardReact.getByTestId('actions-trigger').click({ force: true });
        // Update TestID: action-toggle-status -> action-deactivate
        await page.getByTestId('action-deactivate').click({ force: true });
        await page.waitForTimeout(3000);
        await expect(cardReact).not.toHaveClass(/opacity-50/);

        // 7. ENTRAR DE NUEVO
        console.log('--- PASO 7: Login Final ---');
        const finalLogoutBtn = page.locator('button[aria-label="Cerrar sesión"]');
        await expect(finalLogoutBtn).toBeVisible({ timeout: 10000 });
        await finalLogoutBtn.click();
        await page.fill('input[name="email"]', clientEmail);
        await page.fill('input[name="password"]', 'Joaquin2025');
        await page.click('button[type="submit"]');

        // Manejar Modal de Privacidad (si aparece) - Espera robusta
        try {
            const consentBtn = page.getByRole('button', { name: /Aceptar y Continuar/i });
            await consentBtn.waitFor({ state: 'visible', timeout: 5000 });
            await consentBtn.click();
            console.log('[Test] Modal de privacidad detectado y aceptado (Paso 7).');
        } catch (e) {
            console.log('[Test] El modal de privacidad no apareció en Paso 7.');
        }

        // Validar que estamos logueados buscando el botón de cerrar sesión
        await expect(page.locator('button[aria-label="Cerrar sesión"]')).toBeVisible({ timeout: 20000 });
        console.log('Flujo completo exitoso!');
    });
});
