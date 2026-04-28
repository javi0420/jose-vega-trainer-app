import { test, expect } from '@playwright/test';

test.describe('Force Password Reset Flow', () => {
    const trainerEmail = 'trainer@test.com';
    const clientEmail = `new-client-${Date.now()}@test.com`;
    const trainerPassword = 'password123';
    const defaultPassword = 'Jose2026';
    const newPassword = 'Jose2026!';

    test('Trainer creates client, client logs in and is forced to change password', async ({ page }) => {
        // 1. Trainer logs in and creates a client
        await page.goto('http://localhost:5173/');
        await page.fill('input[type="email"]', trainerEmail);
        await page.fill('input[type="password"]', trainerPassword);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('http://localhost:5173/app');

        // Go to clients and create
        await page.getByRole('button', { name: 'Añadir Cliente' }).click();
        await page.fill('input[placeholder="ejemplo@email.com"]', clientEmail);
        await page.fill('input[placeholder="Ej: Juan Pérez"]', 'Client Forced Reset');
        await page.click('button:has-text("Crear Cliente")');
        
        // Wait for creation and logout
        await expect(page.locator(`text=${clientEmail}`)).toBeVisible();
        await page.click('button[aria-label="Cerrar sesión"]');
        await expect(page).toHaveURL('http://localhost:5173/');

        // 2. New client logs in with default password
        await page.fill('input[type="email"]', clientEmail);
        await page.fill('input[type="password"]', defaultPassword);
        await page.click('button[type="submit"]');

        // 3. Verify redirection to /update-password
        await expect(page).toHaveURL('http://localhost:5173/update-password', { timeout: 15000 });
        // Wait for the heading to be visible, handle potential loading state
        const heading = page.getByRole('heading', { name: 'Nueva contraseña' });
        await expect(heading).toBeVisible({ timeout: 20000 });

        // 4. Try to access /app directly (should be redirected back)
        await page.goto('http://localhost:5173/app');
        await expect(page).toHaveURL('http://localhost:5173/update-password');

        // 5. Update password
        await page.fill('input[placeholder="••••••••"] >> nth=0', newPassword);
        await page.fill('input[placeholder="••••••••"] >> nth=1', newPassword);
        await page.click('button:has-text("Actualizar contraseña")');

        // 6. Verify success or redirection
        await Promise.race([
            page.waitForURL(/.*\/app/, { timeout: 20000 }),
            expect(page.locator('text=¡Todo listo!')).toBeVisible({ timeout: 20000 })
        ]);
        
        // Wait for auto-redirect or force it
        await page.waitForTimeout(1000); 
        if (!page.url().includes('/app')) {
            await page.goto('http://localhost:5173/app');
        }
        await expect(page).toHaveURL(/.*\/app/, { timeout: 15000 });

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

        // 7. Verify can now access app components
        await expect(page.locator('button:has-text("Nuevo Entreno")')).toBeVisible({ timeout: 15000 });
    });

    test('User who does NOT need password change is redirected away from /update-password', async ({ page }) => {
        // Trainer (who doesn't need password change) logs in
        await page.goto('http://localhost:5173/');
        await page.fill('input[type="email"]', trainerEmail);
        await page.fill('input[type="password"]', trainerPassword);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('http://localhost:5173/app');

        // Attempt to go to /update-password
        await page.goto('http://localhost:5173/update-password');

        // Should be redirected back to /app
        await expect(page).toHaveURL('http://localhost:5173/app');
    });
});
