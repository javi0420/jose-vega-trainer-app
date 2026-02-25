import { test, expect } from '@playwright/test';

const TRAINER = { email: 'trainer@test.com', pass: 'password123' };

test.describe('Client New Features (Magic Link & Deactivation)', () => {
    let clientName;
    let clientEmail;

    test.beforeEach(async ({ page }) => {
        // Login as Trainer
        await page.goto('/login');
        await page.fill('input[name="email"]', TRAINER.email);
        await page.fill('input[name="password"]', TRAINER.pass);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/app/);

        // Create a test client for isolation
        clientName = `Feature test ${Date.now()}`;
        clientEmail = `feat_${Date.now()}@test.com`;

        await page.click('button[title="Añadir Cliente"]');
        await page.fill('input[placeholder="Ej: Juan Pérez"]', clientName);
        await page.fill('input[placeholder="ejemplo@email.com"]', clientEmail);

        page.once('dialog', dialog => dialog.accept());
        await page.click('button:has-text("Crear Cliente")');

        // Wait for modal to close
        await page.waitForTimeout(1500);
        await page.fill('input[placeholder="Buscar cliente..."]', clientName);
        await expect(page.locator(`text=${clientName}`).first()).toBeVisible();
    });

    test('1. Should generate and copy Magic Link', async ({ page }) => {
        // Mock the Edge Function for magic link
        await page.route('**/generate-recovery-link', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ action_link: 'https://mock-link.com/auth' }),
            });
        });

        const clientRow = page.locator('[data-testid^="client-card-"]').filter({ hasText: clientName }).first();
        await clientRow.getByTestId('actions-trigger').click({ force: true });

        await page.getByTestId('action-magic-link').click({ force: true });

        // Verify Success Toast (updated text as per requirement)
        await expect(page.getByText(/Link de acceso copiado con éxito/i)).toBeVisible();
    });

    test('2. Should toggle client deactivation and update UI', async ({ page }) => {
        const clientRow = page.locator('[data-testid^="client-card-"]').filter({ hasText: clientName }).first();

        // Open menu
        await clientRow.getByTestId('actions-trigger').click({ force: true });

        // Confirm dialog and click Deactivate
        page.once('dialog', dialog => dialog.accept());
        const deactivateBtn = page.getByTestId('action-deactivate');
        await expect(deactivateBtn).toBeVisible({ timeout: 5000 });
        await deactivateBtn.click({ force: true });

        // Verify visual feedback via data attribute and class
        await expect(clientRow).toHaveAttribute('data-active', 'false');
        await expect(clientRow).toHaveClass(/opacity-50/);
    });

    test('3. Should apply z-index fix when menu is open', async ({ page }) => {
        const clientRow = page.locator('[data-testid^="client-card-"]').filter({ hasText: clientName }).first();

        // Before opening, it should NOT have z-50
        expect(await clientRow.getAttribute('class')).not.toContain('z-50');

        // Open menu
        await clientRow.getByTestId('actions-trigger').click({ force: true });

        // Now it should have z-50
        expect(await clientRow.getAttribute('class')).toContain('z-50');

        // Close menu
        await page.click('body', { position: { x: 0, y: 0 } }); // Force click outside
        await page.waitForTimeout(500);
        expect(await clientRow.getAttribute('class')).not.toContain('z-50');
    });
});
