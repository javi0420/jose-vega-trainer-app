import { test, expect, devices } from '@playwright/test';

test.use({
    ...devices['iPhone SE'],
    defaultBrowserType: 'chromium'
});

test.describe('Routine Detail Mobile UI', () => {

    test.beforeEach(async ({ page }) => {
        // Increase timeout as mobile emulation + login can be slow
        test.setTimeout(120000);

        // Login
        await page.goto('/login');
        await page.fill('input[type="email"]', 'trainer@test.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/app');
    });

    test('header elements are visible and not overlapping on small screen', async ({ page }) => {
        const uniqueName = `TestRoutine_${Date.now()}`;

        // 1. Create a routine
        await page.goto('/app/routines');
        await page.getByRole('button', { name: 'Crear Nueva Plantilla' }).click();

        // Fill modal
        const modal = page.getByTestId('create-routine-modal');
        await modal.locator('#routine-name').fill(uniqueName);
        await modal.getByRole('button', { name: 'Crear Plantilla' }).click();

        // Wait for modal to fully disappear
        await expect(modal).toBeHidden({ timeout: 15000 });

        // 2. Wait and Navigate
        // Small delay to ensure the card is rendered after modal close
        await page.waitForTimeout(1000);
        const routineCard = page.getByTestId(`routine-card-${uniqueName}`);
        await expect(routineCard).toBeVisible({ timeout: 15000 });

        // Scroll to card and click it
        await routineCard.scrollIntoViewIfNeeded();
        await routineCard.click({ force: true });

        // 3. Verify header structure (Layout Checks)
        // Wait for specific routine title to ensure navigation is complete
        await expect(page.getByTestId('routine-title-header')).toContainText(uniqueName, { timeout: 15000 });

        const header = page.locator('header');
        await expect(header).toBeVisible();

        // Check Back arrow
        const backBtn = header.locator('button').first();
        await expect(backBtn).toBeVisible();

        // Check Save button (Should show "OK" on mobile)
        const saveBtn = header.locator('button:has-text("OK")');
        await expect(saveBtn).toBeVisible({ timeout: 10000 });

        // Check Delete button
        const deleteBtn = page.locator('button[title="Eliminar"]');
        await expect(deleteBtn).toBeVisible();

        // Visual Check
        const box = await header.boundingBox();
        if (box) {
            // Header should be reasonably short (not wrapped into chaos)
            expect(box.height).toBeLessThan(140);
        }
    });

    test('can enter edit mode without layout break', async ({ page }) => {
        await page.goto('/app/routines');

        const routineCard = page.locator('li').first();
        if (!(await routineCard.isVisible())) {
            // Create one if empty
            await page.getByRole('button', { name: 'Crear Nueva Plantilla' }).click();
            await page.fill('label:has-text("Nombre") + input', 'EditTestMode');
            await page.locator('form').getByRole('button', { name: 'Crear Plantilla' }).click({ force: true });
            await expect(page.getByTestId('create-routine-modal')).toBeHidden({ timeout: 15000 });
        }

        await page.locator('li').first().click({ force: true });

        // Click title to enter edit mode
        await page.getByTestId('routine-title-header').click();

        // Check if inputs are visible
        await expect(page.getByTestId('routine-name-input')).toBeVisible();

        // Verify Save button is "OK" on mobile
        const saveBtn = page.locator('button:has-text("OK")');
        await expect(saveBtn).toBeVisible();
    });
});
