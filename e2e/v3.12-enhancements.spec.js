import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

function log(...args) {
    const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
    ).join(' ');
    console.log(`[TEST-LOG] ${message}`);
}

// Load environment variables with same priority as Vite
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envDir = process.cwd();
if (fs.existsSync(path.join(envDir, '.env.local'))) {
    dotenv.config({ path: path.join(envDir, '.env.local'), override: true });
} else {
    dotenv.config();
}

// Initialize Supabase client for test operations
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(
    supabaseUrl || 'http://127.0.0.1:55321', 
    supabaseAnonKey || 'fake-key'
);

// Centralized, robust helper to handle the mandatory password reset
async function handleForcedReset(page, newPass) {
    if (page.url().includes('update-password')) {
        log('Forced reset detected. Handling...');
        await page.fill('input[type="password"] >> nth=0', newPass);
        await page.fill('input[type="password"] >> nth=1', newPass);
        await page.click('button:has-text("Actualizar contraseña")');
        
        // Wait for the success state or redirect
        await Promise.race([
            page.waitForURL(/\/app/, { timeout: 15000 }),
            expect(page.locator('text=¡Todo listo!')).toBeVisible({ timeout: 15000 })
        ]);
        
        if (!page.url().includes('/app')) {
            await page.goto('/app');
        }
        await expect(page).toHaveURL(/\/app/, { timeout: 10000 });
        log('Forced reset handled successfully.');
    }
}

// Robust trainer login helper that tries both password variants
async function loginAsTrainer(page) {
    const trainerEmail = 'trainer@test.com';
    const passwords = ['password123', 'password123!'];
    let success = false;

    for (const pass of passwords) {
        log(`[AUTH] Attempting trainer login with password: ${pass}`);
        await page.goto('/');
        await page.fill('input[placeholder="nombre@ejemplo.com"]', trainerEmail);
        await page.fill('input[placeholder="••••••••"]', pass);
        await page.click('button:has-text("Iniciar Sesión")');
        
        await page.waitForTimeout(2000);
        
        if (page.url().includes('update-password')) {
            await handleForcedReset(page, 'password123!');
            success = true;
            break;
        }
        
        if (page.url().includes('/app')) {
            success = true;
            break;
        }
    }

    if (!success) {
        throw new Error('Failed to login as trainer with either password variant');
    }
}

test.describe('v3.12 Enhancements: Feedback, Calendar & Summaries', () => {

    test('2-Way Feedback Loop & Trainer Notifications', async ({ browser }) => {
        test.setTimeout(180000);

        const trainerContext = await browser.newContext();
        const clientContext = await browser.newContext();
        const trainerPage = await trainerContext.newPage();
        const clientPage = await clientContext.newPage();

        const clientEmail = 'lindo@test.com';
        const clientPass = 'IronTrack2025';

        // 1. Trainer Login
        await loginAsTrainer(trainerPage);
        await expect(trainerPage).toHaveURL('/app');

        // 2. Client Login & Create Workout
        await clientPage.goto('/');
        await clientPage.fill('input[placeholder="nombre@ejemplo.com"]', clientEmail);
        await clientPage.fill('input[placeholder="••••••••"]', clientPass);
        await clientPage.click('button:has-text("Iniciar Sesión")');
        
        await clientPage.waitForTimeout(2000);
        await handleForcedReset(clientPage, clientPass + '!');
        await expect(clientPage).toHaveURL('/app');

        // Handle privacy modal if seen
        try {
            const acceptBtn = clientPage.locator('button:has-text("Aceptar y Continuar")');
            if (await acceptBtn.isVisible({ timeout: 5000 })) {
                await acceptBtn.click();
            }
        } catch (e) { }

        // Use Promise.all to capture navigation triggered by click
        await Promise.all([
            clientPage.waitForURL(/\/app\/workout\/new/, { timeout: 20000 }),
            clientPage.locator('[data-testid="new-workout-btn"]').click({ force: true })
        ]);

        await clientPage.click('button:has-text("Añadir Ejercicio")');
        await clientPage.locator('li button').first().click();
        await clientPage.click('button:has-text("Añadir Set")');
        await clientPage.locator('input[placeholder="kg"]').fill('40');
        await clientPage.getByRole('button', { name: 'Completar set' }).first().click();
        await clientPage.click('button:has-text("Finalizar")');
        await clientPage.waitForURL(/\/app\/workout\/[a-f0-9-]{36}/, { timeout: 30000 });
        const workoutUrl = clientPage.url();

        // 3. Client replies to trainer
        const uniqueId = Date.now();
        const clientReply = `Client reply ${uniqueId}`;
        await clientPage.locator('textarea[placeholder*="Cómo te sentiste"]').fill(clientReply);
        await clientPage.click('button:has-text("Enviar Mensaje")');
        await expect(clientPage.getByTestId('client-feedback-status')).toHaveText('Enviado', { timeout: 10000 });

        // 4. Trainer sees notification
        await trainerPage.goto('/app');
        await trainerPage.waitForLoadState('networkidle');
        await trainerPage.reload();
        await trainerPage.waitForTimeout(3000);

        const unreadWorkoutCard = trainerPage.locator('.group.relative.flex.gap-4')
            .filter({ hasText: 'Cliente de Prueba' })
            .filter({ has: trainerPage.locator('.bg-blue-500') })
            .first();

        await expect(unreadWorkoutCard).toBeVisible({ timeout: 25000 });

        // 5. Trainer leaves feedback
        await trainerPage.goto(workoutUrl);
        await trainerPage.waitForLoadState('networkidle');
        const coachNote = `Coach note ${uniqueId}`;
        await trainerPage.locator('textarea').first().fill(coachNote);
        await trainerPage.click('button:has-text("Enviar Feedback")');
        await expect(trainerPage.getByTestId('trainer-feedback-status')).toHaveText('Enviado');

        // 6. Client confirms reading
        await clientPage.reload();
        await clientPage.waitForLoadState('networkidle');
        await expect(clientPage.getByTestId('trainer-feedback-block').getByText(coachNote)).toBeVisible({ timeout: 15000 });
        try {
            await clientPage.click('button:has-text("Confirmar Lectura")', { timeout: 5000 });
        } catch (e) { }
    });

    test('Assigned Routine Feedback & Deletion Summary', async ({ browser }) => {
        test.setTimeout(180000);
        const trainerContext = await browser.newContext();
        const clientContext = await browser.newContext();
        const trainerPage = await trainerContext.newPage();
        const clientPage = await clientContext.newPage();

        const clientEmail = 'lindo@test.com';
        const clientPass = 'IronTrack2025';
        const trainerEmail = 'trainer@test.com';
        const trainerPass = 'password123';

        // Login Trainer (UI)
        await loginAsTrainer(trainerPage);
        await expect(trainerPage).toHaveURL(/\/app/, { timeout: 20000 });

        // Authenticate Supabase JS for direct DB ops
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: trainerEmail,
            password: trainerPass
        });
        if (authError) {
            // Try with rotated password if first one fails
            await supabase.auth.signInWithPassword({
                email: trainerEmail,
                password: trainerPass + '!'
            });
        }

        const routineName = `Rutina Test ${Date.now()}`;
        const { data: clientData } = await supabase.from('profiles').select('id').eq('email', clientEmail).single();

        // Create routine directly
        const { data: routine } = await supabase.from('routines').insert({
            user_id: clientData.id,
            name: routineName,
            created_by_trainer: authData.user.id
        }).select().single();

        await supabase.from('assigned_routines').insert({
            routine_id: routine.id,
            client_id: clientData.id,
            assigned_by: authData.user.id
        });

        // Login Client
        await clientPage.goto('/');
        await clientPage.fill('input[placeholder="nombre@ejemplo.com"]', clientEmail);
        await clientPage.fill('input[placeholder="••••••••"]', clientPass);
        await clientPage.click('button:has-text("Iniciar Sesión")');
        
        await clientPage.waitForTimeout(2000);
        await handleForcedReset(clientPage, clientPass + '!');

        // Ensure routine is visible (might need a reload if created via RPC/Insert)
        await clientPage.goto('/app/assigned-routines');
        await clientPage.reload();
        await clientPage.waitForLoadState('networkidle');
        const routineCard = clientPage.locator(`[data-testid="assigned-routine-${routineName}"]`);
        await expect(routineCard).toBeVisible({ timeout: 20000 });

        const routineFeedback = `Routine feedback ${Date.now()}`;
        const textareaInCard = routineCard.locator('textarea');
        await textareaInCard.fill(routineFeedback);
        await routineCard.locator('.relative button').first().click();
        await expect(routineCard.locator('button.bg-emerald-500')).toBeVisible({ timeout: 10000 });

        // Trainer verifies
        await trainerPage.goto('/app');
        await trainerPage.fill('input[placeholder="Buscar cliente..."]', clientEmail);
        const clientCard = trainerPage.locator('[data-testid^="client-card-"]').filter({ hasText: clientEmail });
        await clientCard.locator('[data-testid="action-assign"]').click();
        const modal = trainerPage.getByTestId('assign-routine-modal');
        await expect(modal.getByTestId(`routine-card-${routineName}`)).toContainText(routineFeedback, { timeout: 15000 });
    });

    test('Month Calendar & Horizontal Chart', async ({ page }) => {
        const clientEmail = 'lindo@test.com';
        const clientPass = 'IronTrack2025';
        await page.goto('/');
        await page.fill('input[placeholder="nombre@ejemplo.com"]', clientEmail);
        await page.fill('input[placeholder="••••••••"]', clientPass);
        await page.click('button:has-text("Iniciar Sesión")');
        
        await page.waitForTimeout(2000);
        await handleForcedReset(page, clientPass + '!');
        await expect(page).toHaveURL('/app');

        // Fix strict mode: look specifically in the consistency chart
        await expect(page.locator('div:has-text("Consistencia Semanal")').locator('span').filter({ hasText: /^l$/i }).first()).toBeVisible({ timeout: 15000 });
        await page.getByText('Este Mes').first().locator('xpath=..').click();
        await expect(page.locator('h3.capitalize').first()).toBeVisible({ timeout: 15000 });
        await expect(page.locator('.grid-cols-7')).toBeVisible();
    });
});
