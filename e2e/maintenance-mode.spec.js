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
});
