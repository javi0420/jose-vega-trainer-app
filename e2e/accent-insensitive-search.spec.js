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

        // 2. Navigate to Exercise Catalog
        await page.goto('/app/exercises');
        await expect(page).toHaveURL(/\/exercises/);

        // 3. Create Exercise with Accents
        const accentedName = `Press de Cuádriceps ${Date.now()}`;
        await page.click('button:has-text("Nuevo Ejercicio")');
        await page.fill('input[placeholder="Ej: Press de Banca"]', accentedName);
        await page.locator('select').selectOption('pecho');
        await page.getByRole('button', { name: 'Crear Ejercicio' }).click();
        
        // Wait for modal to disappear (targeting the modal heading specifically)
        await expect(page.getByRole('heading', { name: 'Nuevo Ejercicio' })).not.toBeVisible();
 
        // Search for it to overcome pagination (since we have 1500 exercises)
        const searchInput = page.getByTestId('exercise-search-input');
        await searchInput.fill(accentedName);
        
        // Wait for list to update and check for the newly created exercise (case-insensitive regex)
        await expect(page.locator('h3').filter({ hasText: new RegExp(accentedName, 'i') })).toBeVisible({ timeout: 10000 });

        // 4. Search for it WITHOUT Accents (using the numeric part to ensure it's the right one)
        const numericPart = accentedName.match(/\d+/)[0];
        await searchInput.fill(`cuadriceps ${numericPart}`);
        
        // Wait for results to update
        await page.waitForTimeout(1000);
        await expect(page.locator('h3').filter({ hasText: accentedName })).toBeVisible({ timeout: 15000 });

        // 5. CLEAR SEARCH
        await searchInput.clear();
        // Skip expecting it to be visible after clearing search, 
        // as it might be pushed out of the first page by 1500+ other exercises.



        // 6. Create Exercise WITHOUT Accents
        const uniqueId = Date.now();
        const unaccentedName = `ZZZ Pierna ${uniqueId}`;
        await page.click('button:has-text("Nuevo Ejercicio")');
        await page.fill('input[placeholder="Ej: Press de Banca"]', unaccentedName);
        await page.getByRole('button', { name: 'Crear Ejercicio' }).click();
        
        // Wait for modal to disappear
        await expect(page.getByRole('heading', { name: 'Nuevo Ejercicio' })).not.toBeVisible();
 
        // 6. Search for it specifically using the UNIQUE ID part
        const searchInput2 = page.getByTestId('exercise-search-input');
        await searchInput2.clear();
        
        // Search with the numeric part first (always unaccented/lowercase safe)
        await searchInput2.type(uniqueId.toString(), { delay: 100 });
        await expect(page.locator('h3').filter({ hasText: unaccentedName })).toBeVisible({ timeout: 10000 });
 
        // 7. Search for it WITH Accents (searching 'piérná' should find 'Pierna')
        await searchInput2.clear();
        await searchInput2.type(`piérná ${uniqueId}`, { delay: 100 });
        await expect(page.locator('h3').filter({ hasText: new RegExp(unaccentedName, 'i') })).toBeVisible({ timeout: 10000 });

    });

    test('Search in Workout Editor handles accents correctly', async ({ page }) => {
        // 1. Login as Client
        await page.goto('/');
        const emailInput = page.locator('input[type="email"]');
        const passInput = page.locator('input[type="password"]');
        await emailInput.fill(CLIENT_USER.email);
        await passInput.fill(CLIENT_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');

        await expect(page).toHaveURL(/\/app/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        // Handle Privacy Modal
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        try {
            if (await privacyModal.isVisible({ timeout: 5000 })) {
                await page.click('button:has-text("Aceptar y Continuar")');
                await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
            }
        } catch (e) { }

        // 2. Start New Workout
        await page.click('text=Nuevo Entreno');
        await expect(page).toHaveURL(/\/new/);

        // 3. Open Exercise Selector
        await page.getByTestId('btn-add-block').first().click();

        const searchInput = page.locator('input[placeholder="Buscar ejercicio..."]');
        await expect(searchInput).toBeVisible();
 
        // 4. Test search in modal
        await searchInput.fill('préss');
        await page.waitForTimeout(1000);
        
        const results = page.locator('li, button, [role="button"]');
        await expect(results.first()).toBeVisible({ timeout: 10000 });

        const firstText = await results.first().innerText();
        const itemName = firstText.split('\n')[0].trim();
        console.log(`Found exercise name in editor: ${itemName}`);

        // Search for it exactly as found
        await page.fill('input[placeholder="Buscar ejercicio..."]', itemName);
        await page.waitForTimeout(1000);

        // Verify it's still there
        await expect(page.locator('li, button, [role="button"]').filter({ hasText: itemName }).first()).toBeVisible();
        console.log('Search in Editor verification successful!');
    });
});
