import { test, expect } from '@playwright/test';

test('Simple database test', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[placeholder="nombre@ejemplo.com"]', 'trainer@test.com');
    await page.fill('input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Iniciar Sesión")');

    await expect(page).toHaveURL(/\/app/, { timeout: 20000 });
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
        const { data, error } = await window.supabase
            .from('profiles')
            .select('id, email')
            .eq('email', 'lindo@test.com')
            .single();

        if (error) {
            console.log('Error:', error);
            return { success: false, error: error.message };
        }

        console.log('Success:', data);
        return { success: true, data };
    });

    console.log('Result:', result);
    expect(result.success).toBe(true);
});
