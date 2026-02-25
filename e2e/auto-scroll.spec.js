import { test, expect } from '@playwright/test';

const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Feature: Auto-Scroll', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('/');
        await page.fill('input[type="email"]', CLIENT_USER.email);
        await page.fill('input[type="password"]', CLIENT_USER.pass);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

        // Handle Privacy Consent Modal if it appears
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
            await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
        }

        // Clear draft
        await page.evaluate(() => localStorage.removeItem('draft_workout'));
    });

    test('Elements are reachable when adding an exercise (Manual Scroll)', async ({ page }) => {
        await page.click('text=Nuevo Entreno');

        // Add first exercise
        await page.getByTestId('btn-add-block').click();
        await page.waitForSelector('li button');
        await page.locator('li button').first().click();

        // Check if the "Add Exercise" button is visible (might need manual scroll now)
        const addBtn = page.getByTestId('btn-add-block').last();

        // Use scrollIntoViewIfNeeded to simulate user reaching the button
        await addBtn.scrollIntoViewIfNeeded();
        await expect(addBtn).toBeInViewport();

        // Add another exercise
        await addBtn.click();
        await page.locator('li button').nth(1).click();

        // After adding, the button is NOT forced into viewport automatically anymore
        // This is intentional to avoid jumpy UX. We scroll manually in the test.
        await addBtn.scrollIntoViewIfNeeded();
        await expect(addBtn).toBeInViewport();
    });

    test('Bottom actions are reachable when adding sets', async ({ page }) => {
        await page.click('text=Nuevo Entreno');

        // Add exercise
        await page.click('button:has-text("Añadir Ejercicio")');
        await page.locator('li button').first().click();

        const addSetBtn = page.locator('button:has-text("Añadir Set")');
        const addExBtn = page.getByTestId('btn-add-block').last();

        // Add several sets to push content down
        for (let i = 0; i < 8; i++) {
            await addSetBtn.click();
            await page.waitForTimeout(50);
        }

        // Verify we can scroll to the bottom action even with many sets
        await addExBtn.scrollIntoViewIfNeeded();
        await expect(addExBtn).toBeVisible();
        await expect(addExBtn).toBeInViewport();
    });
});
