import { test, expect } from '@playwright/test';

const TRAINER_USER = { email: 'trainer@test.com', pass: 'password123' };
const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Accent-Insensitive Search', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        page.on('dialog', dialog => dialog.accept());
        // Fully clear state between tests
        await context.clearCookies();
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
    });

    test('Search in Exercise Catalog handles accents correctly', async ({ page }) => {
        // 1. Login as Trainer
        await page.goto('/');
        await page.fill('input[type="email"]', TRAINER_USER.email);
        await page.fill('input[type="password"]', TRAINER_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/, { timeout: 30000 });

        // Handle Privacy Consent Modal
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        try {
            if (await privacyModal.isVisible({ timeout: 5000 })) {
                await page.click('button:has-text("Aceptar y Continuar")');
                await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
            }
        } catch (e) { }

        // 2. Navigate to Exercise Catalog (direct navigation is more robust for focused tests)
        await page.goto('/app/exercises');
        await expect(page).toHaveURL(/\/exercises/);

        // 3. Create Exercise with Accents
        const accentedName = `Press de Cuádriceps ${Date.now()}`;
        await page.click('button:has-text("Nuevo Ejercicio")');
        await page.fill('input[placeholder="Ej: Press de Banca"]', accentedName);
        await page.locator('select').selectOption('pecho');
        await page.getByRole('button', { name: 'Crear Ejercicio' }).click();
        await expect(page.getByRole('heading', { name: accentedName })).toBeVisible();

        // 4. Search for it WITHOUT Accents
        await page.fill('input[placeholder*="Buscar"]', 'cuadriceps');
        await expect(page.getByRole('heading', { name: accentedName })).toBeVisible();

        // 5. CLEAR SEARCH (Crucial to find the next created item if it doesn't match 'cuadriceps')
        await page.fill('input[placeholder*="Buscar"]', '');

        // 6. Create Exercise WITHOUT Accents
        const unaccentedName = `Extension de Pierna ${Date.now()}`;
        await page.click('button:has-text("Nuevo Ejercicio")');
        await page.fill('input[placeholder="Ej: Press de Banca"]', unaccentedName);
        await page.getByRole('button', { name: 'Crear Ejercicio' }).click();

        // Use a filter-aware check: search for it specifically
        await page.fill('input[placeholder*="Buscar"]', unaccentedName);
        await expect(page.getByRole('heading', { name: unaccentedName })).toBeVisible();

        // 7. Search for it WITH Accents
        await page.fill('input[placeholder*="Buscar"]', 'piérná');
        await expect(page.getByRole('heading', { name: unaccentedName })).toBeVisible();
    });

    test('Search in Workout Editor handles accents correctly', async ({ page }) => {
        // 1. Login as Client (Trainers don't have "Nuevo Entreno" button on dashboard)
        console.log('Logging in as Client...');
        await page.goto('/');

        // Wait for page to be ready
        await expect(page.locator('button:has-text("Iniciar Sesión")')).toBeVisible();

        // Use placeholders found in other successful tests
        const emailInput = page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="@"]');
        const passInput = page.locator('input[type="password"], input[placeholder*="••••"]');

        await emailInput.fill(CLIENT_USER.email);
        await passInput.fill(CLIENT_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');

        await expect(page).toHaveURL(/\/app/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        // 2. Handle Privacy Modal IMMEDIATELY after login (before clicking anything)
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        try {
            if (await privacyModal.isVisible({ timeout: 5000 })) {
                await page.click('button:has-text("Aceptar y Continuar")');
                await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
            }
        } catch (e) { }

        // 3. Start New Workout (modal is now gone)
        console.log('Navigating to New Workout...');
        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/new/);

        // 3. Open Exercise Selector
        await page.getByTestId('btn-add-block').click();
        await page.waitForSelector('input[placeholder="Buscar ejercicio..."]');

        // 4. Test accent-insensitive search in the modal
        console.log('Testing search in modal...');
        await page.fill('input[placeholder="Buscar ejercicio..."]', 'préss');

        // Wait for results to update
        await page.waitForTimeout(500);

        const results = page.locator('li button, button:has(p)');
        await expect(results.first()).toBeVisible({ timeout: 10000 });

        const firstText = await results.first().innerText();
        const itemName = firstText.split('\n')[0].trim();
        console.log(`Found exercise name: ${itemName}`);

        // Clear and search exactly for that name but with different accents/case
        const normalized = itemName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
        console.log(`Searching with normalized term: ${normalized}`);

        await page.fill('input[placeholder="Buscar ejercicio..."]', normalized);
        await page.waitForTimeout(500);

        // Verify it's still there
        await expect(page.locator('li button, button:has(p)').filter({ hasText: itemName }).first()).toBeVisible();
        console.log('Search verification successful!');
    });
});
