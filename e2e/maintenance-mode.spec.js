import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_LOCAL_SERVICE_KEY;

// Use service role to toggle maintenance mode during tests
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

test.describe('Maintenance Mode Flow', () => {
    const trainerEmail = 'trainer@test.com';
    const clientEmail = 'lindo@test.com';
    const password = 'password123'; // Assuming default or known password

    test.beforeAll(async () => {
        // Ensure maintenance mode is OFF initially
        await supabase.from('app_settings').update({ is_maintenance_mode: false }).eq('id', 1);
    });

    test.beforeEach(async ({ page }) => {
        // Clear session to ensure a clean start for each test
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.evaluate(() => sessionStorage.clear());
    });

    test.afterAll(async () => {
        // Ensure maintenance mode is OFF after tests
        await supabase.from('app_settings').update({ is_maintenance_mode: false }).eq('id', 1);
    });

    test('Normal user is redirected to /maintenance when active', async ({ page }) => {
        // 1. Activate maintenance mode
        await supabase.from('app_settings').update({ is_maintenance_mode: true }).eq('id', 1);

        // 2. Login as Normal User
        await page.goto('/');
        await page.fill('input[type="email"]', clientEmail);
        await page.fill('input[type="password"]', 'IronTrack2025'); 
        await page.click('button:has-text("Iniciar Sesión")');

        // 3. Verify redirection to /maintenance
        await expect(page).toHaveURL(/.*\/maintenance/, { timeout: 15000 });
        await expect(page.locator('h1')).toContainText('Modo Mantenimiento');
    });

    test('VIP Admin can bypass maintenance mode', async ({ page }) => {
        // 1. Activate maintenance mode
        await supabase.from('app_settings').update({ is_maintenance_mode: true }).eq('id', 1);

        // 2. Login as Trainer (VIP)
        await page.goto('/');
        await page.fill('input[type="email"]', trainerEmail);
        await page.fill('input[type="password"]', 'password123'); // Adjust password if needed
        await page.click('button:has-text("Iniciar Sesión")');

        // 3. Verify access to /app (should NOT be redirected)
        await expect(page).toHaveURL(/.*\/app/);
        await expect(page.locator('text=Panel de Entrenador')).toBeVisible();
        
        // Ensure NOT on maintenance page
        expect(page.url()).not.toContain('/maintenance');
    });

    test('App recovers in Realtime when maintenance mode is turned OFF', async ({ page }) => {
        // 1. Start on maintenance page
        await supabase.from('app_settings').update({ is_maintenance_mode: true }).eq('id', 1);
        await page.goto('/maintenance');
        await expect(page.locator('h1')).toContainText('Modo Mantenimiento');

        // 2. Deactivate via Supabase (simulating admin action elsewhere)
        await supabase.from('app_settings').update({ is_maintenance_mode: false }).eq('id', 1);

        // 3. Verify Realtime recovery (should redirect back to home/login)
        await expect(page).toHaveURL(/.*\//, { timeout: 10000 });
    });

    test('Trainer can toggle maintenance mode from the dashboard UI', async ({ page }) => {
        // 1. Login as Trainer
        await page.goto('/');
        await page.fill('input[type="email"]', trainerEmail);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button:has-text("Iniciar Sesión")');

        // 2. Locate Maintenance Widget
        // We'll wait for the text "Modo Mantenimiento" to appear
        await expect(page.locator('text=Modo Mantenimiento')).toBeVisible({ timeout: 15000 });

        // 3. Toggle ON from UI
        // NOTE: The toggle opens a custom ConfirmModal (React portal), NOT a native browser dialog.
        // page.once('dialog', ...) does NOT work here.
        const toggle = page.getByTestId('maintenance-toggle');
        await toggle.click();

        // Handle the ConfirmModal by clicking the "Activar" button
        const activarBtn = page.locator('button:has-text("Activar")');
        await expect(activarBtn).toBeVisible({ timeout: 5000 });
        await activarBtn.click();
        
        // 4. Verify in DB via Supabase FIRST (to ensure RPC worked)
        await expect.poll(async () => {
            const { data } = await supabase.from('app_settings').select('is_maintenance_mode').eq('id', 1).single();
            return data.is_maintenance_mode;
        }, { timeout: 10000, message: 'Database should update after toggle' }).toBe(true);

        // 5. Verify UI state change (Auto-retries) - Use regex for case insensitivity
        await expect(page.getByText(/Sistema Bloqueado/i)).toBeVisible({ timeout: 10000 });

        // 6. Toggle OFF and verify
        await toggle.click();
        // Handle the ConfirmModal for deactivation if present
        const desactivarBtn = page.locator('button:has-text("Desactivar")');
        if (await desactivarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await desactivarBtn.click();
        }
        
        await expect.poll(async () => {
            const { data } = await supabase.from('app_settings').select('is_maintenance_mode').eq('id', 1).single();
            return data.is_maintenance_mode;
        }, { timeout: 10000, message: 'Database should reset after toggle' }).toBe(false);

        await expect(page.getByText(/Operativo/i)).toBeVisible({ timeout: 10000 });
    });
});
