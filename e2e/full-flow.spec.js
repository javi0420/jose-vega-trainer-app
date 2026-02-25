import { test, expect } from '@playwright/test';

// Mock Data
const MOCK_USER = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'authenticated'
};

const MOCK_EXERCISES = [
    { id: 'ex-1', name: 'Press Banca', muscle_group: 'pecho' },
    { id: 'ex-2', name: 'Sentadilla', muscle_group: 'pierna' }
];

test.describe('Authenticated User Flows', () => {

    // Setup: Mock Network Requests before each test
    test.beforeEach(async ({ page }) => {
        // 1. Mock Auth Token/Session Request
        // Supabase sends requests to /auth/v1/token or /auth/v1/user
        await page.route('**/auth/v1/user', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_USER)
            });
        });

        // 2. Mock Database Requests (REST API)

        // Exercises Fetch
        await page.route('**/rest/v1/exercises*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                headers: { 'content-range': '0-1/2' },
                body: JSON.stringify(MOCK_EXERCISES)
            });
        });

        // Workout Save RPC (Atomic)
        await page.route('**/rest/v1/rpc/save_full_workout*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify('new-workout-id')
            });
        });

        // 3. Inject Fake Session into LocalStorage to bypass Login Screen
        // We have to do this via an init script functionality or just visiting a page and setting it.
        // For Supabase, the key is usually `sb-<project-ref>-auth-token`
        // Since we don't know the Project ID easily from here (it's in env), 
        // we might verify if the app redirects to Login if NO token is present.

        // Alternative: Mock the AuthProvider's check directly? No, that's code.
        // Let's try to mock the Supabase Client auth state by simulating a successful "signInWithPassword" response directly in the Login test?
    });

    // Strategy B: Perform a "Fake Login" that succeeds due to Mocks
    test('Full Workout Creation Flow', async ({ page }) => {

        // --- 1. LOGIN ---
        // Mock the Token endpoint for Login (Relaxed pattern)
        await page.route('**/auth/v1/token*', async route => {
            console.log('Intercepted Auth Token Request');
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    access_token: 'fake-jwt-token',
                    token_type: 'bearer',
                    refresh_token: 'fake-refresh-token',
                    expires_in: 3600,
                    user: MOCK_USER,
                    session: {
                        access_token: 'fake-jwt-token',
                        token_type: 'bearer',
                        user: MOCK_USER
                    }
                })
            });
        });

        await page.goto('/');

        // Ensure page is loaded
        await expect(page.locator('button:has-text("Iniciar Sesión")')).toBeVisible();

        await page.locator('input[type="email"]').fill('test@example.com');
        await page.locator('input[type="password"]').fill('password');
        await page.locator('button:has-text("Iniciar Sesión")').click();

        // Debug: Check if error message appears
        const errorMsg = page.locator('.text-red-200');
        if (await errorMsg.isVisible()) {
            console.log('Login Error Visible:', await errorMsg.textContent());
        }

        // Should redirect to App/Dashboard
        // We wait for URL or a Dashboard element
        await expect(page).toHaveURL(/\/app/, { timeout: 10000 });

        // FIX: Wait for app state to settle before checking modal
        await page.waitForLoadState('networkidle');

        // FIX: Wait for app state to settle before checking modal
        await page.waitForLoadState('networkidle');

        // Handle Privacy Consent Modal
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
            await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
        }

        // --- 2. DASHBOARD -> EDITOR ---
        // Force navigation to ensure we validly reach the editor
        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/new/);

        // --- 3. WORKOUT EDITOR ---
        // Verify Editor Loaded and Name Editor Flow
        await expect(page.getByTestId('workout-header-title-trigger')).toBeVisible({ timeout: 15000 });
        await page.getByTestId('workout-header-title-trigger').click();

        const nameInput = page.getByTestId('workout-name-edit-input');
        await expect(nameInput).toBeVisible();
        await expect(nameInput).toBeFocused();
        await expect(nameInput).toHaveValue('Entrenamiento de Tarde');

        await nameInput.fill('Entrenamiento de Tarde');
        await page.getByTestId('workout-name-save-btn').click();
        await expect(nameInput).toBeHidden();

        // Open Add Exercise Modal
        await page.click('button:has-text("Añadir Ejercicio")');

        // Verify Mocked Exercises appear
        await expect(page.getByText('Press Banca')).toBeVisible();

        // Select Exercise
        await page.getByText('Press Banca').click();

        // Verify Exercise Added to List
        await expect(page.getByRole('heading', { level: 3, name: /Press Banca/i })).toBeVisible();

        // --- 4. FINISH WORKOUT ---
        // Click Finalizar
        await page.locator('button:has-text("Finalizar")').click();

        // Handle Confirm Dialog (if any) or validation
        // Our previous code added validation: "Must have 1 completed set".
        // Let's complete a set first!

        // 5. COMPLETE SET
        // Ensure at least one set exists.
        if (await page.getByTestId('workout-btn-add-set').first().isVisible()) {
            await page.getByTestId('workout-btn-add-set').first().click();
        }

        // Wait for inputs and fill data
        const weightInput = page.getByTestId('workout-input-weight').first();
        await expect(weightInput).toBeVisible({ timeout: 15000 });
        await weightInput.fill('100');

        // Click the "Completar set" button using test-id
        const completeBtn = page.getByTestId('workout-btn-complete-set').first();
        await completeBtn.click();

        // Small wait to ensure state update
        await page.waitForTimeout(500);

        // Click Finalizar and wait for response
        await Promise.all([
            page.waitForResponse(resp =>
                resp.url().includes('save_full_workout') &&
                resp.status() === 200
            ),
            page.getByTestId('workout-btn-save').click()
        ]);

        // Should redirect to summary or home
        // We mocked the POST response so it should succeed.
        await expect(page).toHaveURL(/\/app\/workout\/new-workout-id/);

        // Verify success alert or element?
        // Alert is handled by window.alert. Playwright auto-dismisses alerts but we can catch them.
        page.on('dialog', dialog => dialog.accept());
    });

});
