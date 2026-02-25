import { test, expect } from '@playwright/test';

// Use known working user
const TEST_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Progress & Statistics (UX v2)', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        test.setTimeout(60000);
        await page.goto('/');

        // If not already in /app, login
        if (!page.url().includes('/app')) {
            await page.getByTestId('login-input-email').fill(TEST_USER.email);
            await page.getByTestId('login-input-password').fill(TEST_USER.pass);
            await page.getByTestId('login-btn-submit').click();
            await expect(page).toHaveURL(/\/app/);
        }

        // Privacy Consent
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
        }

        await page.getByTestId('progress-btn').click();
        await expect(page).toHaveURL(/progress/);
        // Wait for exercises to load from Supabase
        await page.waitForTimeout(1000);
    });

    test('Modern exercise search should find and filter exercises', async ({ page }) => {
        // Toggle dropdown using data-testid
        const toggle = page.getByTestId('searchable-select-toggle');
        await expect(toggle).toBeVisible();
        await toggle.click();

        const searchInput = page.getByTestId('exercise-search-input');
        await expect(searchInput).toBeVisible();

        // 1. Filter test (use "Press" which is almost certainly in any DB)
        await searchInput.fill('Press');

        // Wait for results
        const firstOption = page.locator('[data-testid^="exercise-option-"]').first();
        await expect(firstOption).toBeVisible({ timeout: 10000 });

        // Should show something with "Press"
        await expect(firstOption).toContainText('Press');

        // 2. Select option
        await firstOption.click();

        // Modal should close
        await expect(searchInput).not.toBeVisible();
    });

    test('Selecting an exercise should show Chart Container', async ({ page }) => {
        await page.getByTestId('searchable-select-toggle').click();
        const searchInput = page.getByTestId('exercise-search-input');

        await searchInput.fill('Press');
        const option = page.locator('[data-testid^="exercise-option-"]').first();
        await option.click();

        // The header "Análisis de Rendimiento" should be visible after selection
        await expect(page.locator('text=Análisis de Rendimiento')).toBeVisible();

        // If there's data, we expect the chart. If not, the "Sin datos" message.
        // Both indicate the selection flow worked.
        const chartOrNoData = page.locator('text=Sin datos seleccionados').or(page.locator('.recharts-surface'));
        await expect(chartOrNoData.first()).toBeVisible();
    });

    test('Search "No Results" case', async ({ page }) => {
        await page.getByTestId('searchable-select-toggle').click();
        const searchInput = page.getByTestId('exercise-search-input');

        await searchInput.fill('EjercicioInexistenteXYZ');
        await expect(page.locator('text=No se encontraron resultados')).toBeVisible();
    });
});
