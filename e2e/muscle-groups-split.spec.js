import { test, expect } from '@playwright/test';

test.describe('Muscle Groups: Brazos Split (Bíceps/Tríceps)', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('/');
        await page.fill('input[type="email"]', 'trainer@test.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/);
    });

    test('should list "Bíceps" and "Tríceps" instead of "Brazos" in exercise catalog', async ({ page }) => {
        // Navigate to exercise catalog
        await page.goto('/app/exercises');

        // Wait for catalog to load
        await expect(page.locator('h2:has-text("Catálogo de Ejercicios")')).toBeVisible();

        // Open create exercise modal
        await page.click('button:has-text("Nuevo Ejercicio")');

        // Wait for modal
        await expect(page.locator('h3:has-text("Nuevo Ejercicio")')).toBeVisible();

        // Check muscle group dropdown
        const muscleGroupSelect = page.locator('select').filter({ hasText: 'Seleccionar...' });

        // Verify "Bíceps" option exists (options are hidden by default in select)
        await expect(muscleGroupSelect.locator('option[value="Bíceps"]')).toHaveCount(1);

        // Verify "Tríceps" option exists
        await expect(muscleGroupSelect.locator('option[value="Tríceps"]')).toHaveCount(1);

        // Verify "Brazos" option does NOT exist
        await expect(muscleGroupSelect.locator('option[value="brazos"]')).toHaveCount(0);
    });

    test('should search exercises by "Biceps" (without tilde) and find "Bíceps" exercises', async ({ page }) => {
        // Navigate to exercise catalog
        await page.goto('/app/exercises');

        // Wait for catalog to load
        await page.waitForLoadState('networkidle');

        // Search for "biceps" (without tilde)
        const searchInput = page.locator('input[placeholder*="Buscar ejercicio"]');
        await searchInput.fill('biceps');

        // Wait for search to filter
        await page.waitForTimeout(500);

        // Verify that results are shown (assuming there are bíceps exercises)
        // The search should be accent-insensitive, so "biceps" should match "Bíceps"
        const exerciseCards = page.locator('div').filter({ hasText: /bíceps|biceps/i });

        // At least one result should be visible
        await expect(exerciseCards.first()).toBeVisible({ timeout: 5000 });
    });

    test('should search exercises by "Triceps" (without tilde) and find "Tríceps" exercises', async ({ page }) => {
        // Navigate to exercise catalog
        await page.goto('/app/exercises');

        // Wait for catalog to load
        await page.waitForLoadState('networkidle');

        // Search for "triceps" (without tilde)
        const searchInput = page.locator('input[placeholder*="Buscar ejercicio"]');
        await searchInput.fill('triceps');

        // Wait for search to filter
        await page.waitForTimeout(500);

        // Verify that results are shown
        const exerciseCards = page.locator('div').filter({ hasText: /tríceps|triceps/i });

        // At least one result should be visible
        await expect(exerciseCards.first()).toBeVisible({ timeout: 5000 });
    });

    test('can create exercise with "Bíceps" muscle group', async ({ page }) => {
        // Navigate to exercise catalog
        await page.goto('/app/exercises');

        // Open modal
        await page.click('button:has-text("Nuevo Ejercicio")');

        // Fill form
        const timestamp = Date.now();
        const exerciseName = `Curl Test ${timestamp}`;

        await page.fill('input[placeholder*="Press de Banca"]', exerciseName);
        await page.selectOption('select', 'Bíceps');

        // Submit
        await page.click('button:has-text("Crear Ejercicio")');

        // Wait for modal to close
        await expect(page.locator('h3:has-text("Nuevo Ejercicio")')).not.toBeVisible({ timeout: 5000 });

        // Verify exercise appears in list with "Bíceps" muscle group
        await expect(page.locator(`text=${exerciseName}`)).toBeVisible();

        // Find the specific exercise card and verify its muscle group
        // Navigate up to the card container and then find the muscle group paragraph
        const exerciseHeading = page.locator(`h3:has-text("${exerciseName}")`);
        const exerciseCard = exerciseHeading.locator('../..');
        await expect(exerciseCard.locator('p.capitalize:has-text("Bíceps")')).toBeVisible();
    });
});
