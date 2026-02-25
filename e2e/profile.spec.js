import { test, expect } from '@playwright/test';

// Use known working user (trainer) for tests that don't require client-specific role
const TEST_USER = { email: 'trainer@test.com', pass: 'password123' };

test.describe('User Profile', () => {
    // Run sequentially to avoid session conflicts
    test.describe.configure({ mode: 'serial' });

    test('User can view profile page and see personal info', async ({ page }) => {
        // Login
        await page.goto('/');
        await page.fill('input[placeholder="nombre@ejemplo.com"]', TEST_USER.email);
        await page.fill('input[placeholder="••••••••"]', TEST_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

        // Navigate to profile
        await page.goto('/app/profile');

        // Verify profile page elements
        await expect(page.locator('h1:has-text("Mi Perfil")')).toBeVisible();
        await expect(page.locator('text=Información Personal')).toBeVisible();
        await expect(page.locator('text=Seguridad')).toBeVisible();

        // Verify user email is displayed
        await expect(page.locator(`text=${TEST_USER.email}`)).toBeVisible();
    });

    test('User can update name successfully', async ({ page }) => {
        // Handle alert dialogs
        page.on('dialog', dialog => dialog.accept());

        // Login
        await page.goto('/');
        await page.fill('input[placeholder="nombre@ejemplo.com"]', TEST_USER.email);
        await page.fill('input[placeholder="••••••••"]', TEST_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

        // Navigate to profile
        await page.getByLabel('Perfil').click();
        await expect(page).toHaveURL(/profile/);

        // Update name with unique value
        const newName = `Test User ${Date.now()}`;
        const nameInput = page.locator('input[placeholder="Tu nombre"]');
        await nameInput.fill(newName);

        // Click save
        await page.click('button:has-text("Guardar Cambios")');

        // Wait for save to complete (alert will be auto-accepted)
        await page.waitForTimeout(2000);

        // Verify the name was updated in the display
        await expect(page.locator(`h2:has-text("${newName}")`)).toBeVisible();
    });

    test('Password change shows error for mismatched passwords', async ({ page }) => {
        // Track alert messages
        let alertMessage = '';
        page.on('dialog', async dialog => {
            alertMessage = dialog.message();
            await dialog.accept();
        });

        // Login
        await page.goto('/');
        await page.fill('input[placeholder="nombre@ejemplo.com"]', TEST_USER.email);
        await page.fill('input[placeholder="••••••••"]', TEST_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

        // Navigate to profile
        await page.getByLabel('Perfil').click();
        await expect(page).toHaveURL(/profile/);

        // Fill mismatched passwords (these are in the profile page, not login)
        const passwordInputs = page.locator('input[type="password"]');
        await passwordInputs.first().fill('newpass123');
        await passwordInputs.last().fill('different123');

        // Click update password
        await page.click('button:has-text("Actualizar Contraseña")');

        // Wait for alert
        await page.waitForTimeout(500);

        // Verify error message
        expect(alertMessage).toContain('Las contraseñas no coinciden');
    });

    test('Logout from profile redirects to login', async ({ page }) => {
        // Login
        await page.goto('/');
        await page.fill('input[placeholder="nombre@ejemplo.com"]', TEST_USER.email);
        await page.fill('input[placeholder="••••••••"]', TEST_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

        // Navigate to profile
        await page.getByLabel('Perfil').click();
        await expect(page).toHaveURL(/profile/);

        // Click logout in profile page
        await page.click('button:has-text("Cerrar Sesión")');

        // Verify redirect to login
        await expect(page).toHaveURL('/', { timeout: 10000 });
        await expect(page.locator('button:has-text("Iniciar Sesión")')).toBeVisible();
    });

});
