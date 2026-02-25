import { test, expect } from '@playwright/test';

// Credentials
const TRAINER_USER = { email: 'trainer@test.com', pass: 'password123' };
const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Security & RBAC Suite', () => {
    // Run sequentially to avoid session conflicts
    test.describe.configure({ mode: 'serial' });

    test('Unauthenticated user is redirected to login', async ({ page }) => {
        // Try to access protected route without logging in
        await page.goto('/app');

        // Should be redirected to login page
        await expect(page).toHaveURL('/', { timeout: 10000 });
        await expect(page.locator('button:has-text("Iniciar Sesión")')).toBeVisible();
    });

    test('Unauthenticated user cannot access workout editor', async ({ page }) => {
        // Try to access workout editor without logging in
        await page.goto('/app/workout/new');

        // Should be redirected to login page
        await expect(page).toHaveURL('/', { timeout: 10000 });
    });

    test('Trainer sees Trainer Dashboard elements', async ({ page }) => {
        // Login as Trainer
        await page.goto('/');
        await page.fill('input[placeholder="nombre@ejemplo.com"]', TRAINER_USER.email);
        await page.fill('input[placeholder="••••••••"]', TRAINER_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

        // Verify trainer sees trainer dashboard
        await expect(page.locator('text=Panel de Entrenador')).toBeVisible();

        // Verify trainer sees trainer-only elements
        await expect(page.locator('text=Catálogo de Ejercicios')).toBeVisible();
        await expect(page.locator('button[title="Añadir Cliente"]')).toBeVisible();
    });

    test('Trainer can access Exercise Manager', async ({ page }) => {
        // Login as Trainer
        await page.goto('/');
        await page.fill('input[placeholder="nombre@ejemplo.com"]', TRAINER_USER.email);
        await page.fill('input[placeholder="••••••••"]', TRAINER_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

        // Navigate to Exercise Manager
        await page.click('text=Catálogo de Ejercicios');

        // Should successfully reach exercises page
        await expect(page).toHaveURL(/\/app\/exercises/);
        await expect(page.locator('text=Gestión de Ejercicios')).toBeVisible();
    });

    test('Logout clears session', async ({ page }) => {
        // Login
        await page.goto('/');
        await page.fill('input[placeholder="nombre@ejemplo.com"]', TRAINER_USER.email);
        await page.fill('input[placeholder="••••••••"]', TRAINER_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

        // Navigate to profile and logout
        await page.goto('/app/profile');
        await page.click('button:has-text("Cerrar Sesión")');

        // Should be on login page
        await expect(page).toHaveURL('/', { timeout: 10000 });
        await expect(page.locator('button:has-text("Iniciar Sesión")')).toBeVisible();
    });

    // --- CLIENT ROLE TESTS ---

    test('Client sees Client Dashboard elements', async ({ page }) => {
        // Login as Client
        await page.goto('/');
        await page.fill('input[placeholder="nombre@ejemplo.com"]', CLIENT_USER.email);
        await page.fill('input[placeholder="••••••••"]', CLIENT_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

        // Verify client sees client dashboard elements
        await expect(page.locator('text=Nuevo Entreno')).toBeVisible();

        // Verify client does NOT see trainer-only elements
        await expect(page.locator('text=Panel de Entrenador')).not.toBeVisible();
        await expect(page.locator('button[title="Añadir Cliente"]')).not.toBeVisible();
    });

    test('Client cannot access Exercise Manager', async ({ page }) => {
        // Login as Client
        await page.goto('/');
        await page.fill('input[placeholder="nombre@ejemplo.com"]', CLIENT_USER.email);
        await page.fill('input[placeholder="••••••••"]', CLIENT_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

        // Try to access Exercise Manager (Trainer Only)
        await page.goto('/app/exercises');

        // Should be redirected back to dashboard
        await expect(page).not.toHaveURL(/\/app\/exercises/);
        await expect(page).toHaveURL('/app');
    });

});
