import { test, expect } from '@playwright/test';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const CLIENT_USER = { email: 'lindo@test.com', pass: 'IronTrack2025' };

test.describe('Strict RLS & Anti-Hacking', () => {

    test('Block unauthorized DELETE of system exercise', async ({ page, request }) => {
        try {
            // MOVED LOGIN HERE TO CATCH ERRORS
            console.log('DEBUG: Starting Login...');
            await page.goto('/');
            await page.fill('input[type="email"]', CLIENT_USER.email);
            await page.fill('input[type="password"]', CLIENT_USER.pass);
            await page.click('button:has-text("Iniciar Sesión")');
            await expect(page).toHaveURL(/\/app/, { timeout: 15000 });
            console.log('DEBUG: Login Successful');

            // 1. Capture Valid Headers from Network Traffic
            console.log('DEBUG: Waiting for Supabase request...');
            // Trigger a fetch by navigating or knowing one happens on load
            // We are already on /app, so maybe minimal fetches happen. 
            // We can reload to force fetches.

            const [request] = await Promise.all([
                page.waitForRequest(req => req.url().includes('/rest/v1/') || req.url().includes('/auth/v1/')),
                page.reload()
            ]);

            const headers = request.headers();
            const authHeader = headers['authorization'] || headers['Authorization'];
            const apiKeyHeader = headers['apikey'] || headers['Apikey'];
            const url = request.url(); // e.g. https://xyz.supabase.co/rest/v1/params...

            // Extract Base URL
            const urlObj = new URL(url);
            const SUPABASE_ORIGIN = urlObj.origin;

            console.log(`DEBUG: Captured Origin: ${SUPABASE_ORIGIN}`);
            // console.log(`DEBUG: Captured Auth: ${authHeader}`); // Security risk? Keep minimal.

            if (!authHeader || !apiKeyHeader) {
                throw new Error('Failed to capture auth headers from network traffic');
            }

            // 2. Identify Target User (Self)
            const session = await page.evaluate(() => {
                const tokenKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
                return tokenKey ? JSON.parse(localStorage.getItem(tokenKey)) : null;
            });
            if (!session) throw new Error('No session in localStorage');


            // 3. Init Supabase Client with CAPTURED CONFIG
            console.log('DEBUG: Init Client with captured headers...');
            const supabase = createClient(SUPABASE_ORIGIN, apiKeyHeader);

            // Set session without verification if possible, or just use the token?
            // supabase-js setSession verifies locally. 
            // If we use the same Origin and Key, it should work.

            const { error: sessionError } = await supabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token
            });
            if (sessionError) throw new Error(`Set Session Error: ${sessionError.message}`);

            // 4. Fetch Exercises
            console.log('DEBUG: Fetching exercises...');
            const { data: exercises, error: fetchError } = await supabase
                .from('exercises')
                .select('*')
                .limit(10);

            if (fetchError) throw new Error(`Fetch Failed: ${fetchError.message}`);

            const targetExercise = exercises.find(ex => ex.created_by !== session.user.id);
            if (!targetExercise) throw new Error(`No target exercise! Users: ${exercises.map(e => e.created_by)}`);

            // 5. Attack
            console.log(`DEBUG: Attacking ${targetExercise.id}...`);
            const { error: deleteError, status } = await supabase
                .from('exercises')
                .delete()
                .eq('id', targetExercise.id);

            // 6. Verify
            const { data: verifyData } = await supabase
                .from('exercises')
                .select('id')
                .eq('id', targetExercise.id);

            if (verifyData.length === 0) throw new Error('SECURITY BREACH: Exercise was deleted!');
            console.log('DEBUG: Security Verified. Exercise remains.');


        } catch (err) {
            fs.writeFileSync('test_error.log', `ERROR: ${err.message}\nSTACK: ${err.stack}`);
            throw err; // Fail the test
        }
    });
});
