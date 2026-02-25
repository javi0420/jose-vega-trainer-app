import { test, expect } from '@playwright/test';

const TRAINER = { email: 'trainer@test.com', pass: 'password123' };

test.describe('Client Actions (Action Menu)', () => {
    let clientEmail;
    let clientName;

    test.beforeEach(async ({ page }) => {
        // Login as Trainer
        await page.goto('http://localhost:5173/login');
        await page.fill('input[name="email"]', TRAINER.email);
        await page.fill('input[name="password"]', TRAINER.pass);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/app/);

        // Create a test client if it doesn't exist or just create a new one for isolation
        clientName = `Action test ${Date.now()}`;
        clientEmail = `action_${Date.now()}@test.com`;

        await page.click('button[title="Añadir Cliente"]');
        await page.fill('input[placeholder="Ej: Juan Pérez"]', clientName);
        await page.fill('input[placeholder="ejemplo@email.com"]', clientEmail);

        page.once('dialog', dialog => dialog.accept());
        await page.click('button:has-text("Crear Cliente")');

        // Wait for modal to close and list to update
        await page.waitForTimeout(2000);
        await page.fill('input[placeholder="Buscar cliente..."]', clientName);
        // Using a more flexible locator for the row
        const clientRow = page.locator('[data-testid^="client-card-"]').filter({ hasText: clientName }).first();
        await expect(clientRow).toBeVisible();
    });

    test('Generate Magic Link (Action Link)', async ({ page }) => {
        // Mock the Edge Function
        await page.route('**/generate-recovery-link', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ action_link: 'https://mock-link.com/auth' }),
            });
        });

        const row = page.locator('[data-testid^="client-card-"]').filter({ hasText: clientName }).first();
        await row.getByTestId('actions-trigger').click({ force: true });
        await page.getByTestId('action-magic-link').click({ force: true });

        // Verify Success Toast
        await expect(page.getByText(/Link de acceso copiado/i)).toBeVisible();
    });

    test('Deactivate and Visual Feedback', async ({ page }) => {
        const row = page.locator('[data-testid^="client-card-"]').filter({ hasText: clientName }).first();
        await row.getByTestId('actions-trigger').click({ force: true });

        page.once('dialog', dialog => dialog.accept());
        await page.getByTestId('action-deactivate').click({ force: true });

        // Check if row has opacity-50
        await expect(row).toHaveClass(/opacity-50/);
    });
});
