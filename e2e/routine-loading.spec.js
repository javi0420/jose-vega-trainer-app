import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local first (matching Vite priority)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

const CLIENT = { email: 'lindo@test.com', pass: 'IronTrack2025', id: '22222222-2222-2222-2222-222222222222' };
const TRAINER = { email: 'trainer@test.com', pass: 'password123', id: '11111111-1111-1111-1111-111111111111' };

// Use environment variables or defaults, but FORCE local if we are likely in a local test environment
let SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:55321';
if (SUPABASE_URL.includes('supabase.co')) {
    // If we're on localhost but hitting remote, force local (to match browser)
    SUPABASE_URL = 'http://127.0.0.1:55321';
}
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODQ2OTYwNzN9.BAbPiUgyCpJyxcK-zVxOU9_WnLOyt0pBrXKsyzF1sQFosuS2QqAjCGM32kzehmTVYzUJ4Icocj1-bGkTw_wEdQ';

test.describe('Routine Loading Optimization & Visibility', () => {

    const TEST_TIMEOUT = 120000;
    let supabase;
    let testRoutineId;
    let testAssignedRoutineId;

    test.beforeAll(async () => {
        console.log(`DEBUG: routine-loading.spec.js - SUPABASE_URL: ${SUPABASE_URL}`);
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    });

    test.beforeEach(async () => {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: CLIENT.email,
            password: CLIENT.pass
        });
        if (authError) throw authError;
        const currentClientId = authData.user.id;

        // Create client's own template routine
        const uniqueFullBody = `Full Body A Test ${Date.now()}`;
        const { data: clientRoutine, error: routineError } = await supabase
            .from('routines')
            .insert({
                name: uniqueFullBody,
                description: 'Test routine for E2E',
                user_id: currentClientId,
                created_by_trainer: null
            })
            .select()
            .single();

        if (routineError) throw routineError;
        testRoutineId = clientRoutine.id;

        // Create routine block
        const { data: block } = await supabase
            .from('routine_blocks')
            .insert({ routine_id: testRoutineId, order_index: 0 })
            .select()
            .single();

        // Get Sentadilla exercise
        const { data: exercisesSent } = await supabase
            .from('exercises')
            .select('id')
            .or('name.ilike.%sentadilla%,name_es.ilike.%sentadilla%')
            .limit(1);

        const exercise = exercisesSent?.[0];

        if (exercise && block) {
            await supabase
                .from('routine_exercises')
                .insert({
                    block_id: block.id,
                    exercise_id: exercise.id,
                    position: 0
                });
        }

        // Login as TRAINER to create assigned routine
        const { data: trainerAuth, error: trainerError } = await supabase.auth.signInWithPassword({
            email: TRAINER.email,
            password: TRAINER.pass
        });
        if (trainerError) throw trainerError;
        const currentTrainerId = trainerAuth.user.id;

        // Create trainer's routine
        const uniqueFuerza = `Rutina Fuerza Pro Test ${Date.now()}`;
        const { data: trainerRoutine } = await supabase
            .from('routines')
            .insert({
                name: uniqueFuerza,
                description: 'Assigned by trainer',
                user_id: currentClientId,
                created_by_trainer: currentTrainerId
            })
            .select()
            .single();

        testAssignedRoutineId = trainerRoutine.id;

        // Create block for trainer routine
        const { data: trainerBlock } = await supabase
            .from('routine_blocks')
            .insert({ routine_id: testAssignedRoutineId, order_index: 0 })
            .select()
            .single();

        // Get any 2 exercise IDs to ensure setup success
        const { data: anyExs, error: exsError } = await supabase
            .from('exercises')
            .select('id, name')
            .limit(2);
        
        if (exsError) throw exsError;
        
        const pressBancaEx = anyExs?.[0];
        const pesoMuertoEx = anyExs?.[1];

        console.log(`DEBUG: Setup - Ex1: ${pressBancaEx?.name} (${pressBancaEx?.id}), Ex2: ${pesoMuertoEx?.name} (${pesoMuertoEx?.id})`);

        console.log(`DEBUG: Setup - Press: ${pressBancaEx?.id}, Deadlift: ${pesoMuertoEx?.id}`);

        if (pressBancaEx && trainerBlock) {
            await supabase.from('routine_exercises').insert({
                block_id: trainerBlock.id,
                exercise_id: pressBancaEx.id,
                position: 0
            });
        }

        if (pesoMuertoEx && trainerBlock) {
            await supabase.from('routine_exercises').insert({
                block_id: trainerBlock.id,
                exercise_id: pesoMuertoEx.id,
                position: 1
            });
        }

        // Ensure trainer-client link exists in DB for these dynamic IDs
        await supabase.from('trainer_clients').upsert({
            trainer_id: currentTrainerId,
            client_id: currentClientId,
            status: 'active'
        }, { onConflict: 'trainer_id,client_id' });

        // Assign routine to client
        await supabase
            .from('assigned_routines')
            .insert({
                routine_id: testAssignedRoutineId,
                assigned_by: currentTrainerId,
                client_id: currentClientId
            });
    });

    test.afterEach(async () => {
        // Cleanup: delete test routines (cascades will handle blocks/exercises)
        if (testRoutineId) {
            await supabase.from('routines').delete().eq('id', testRoutineId);
        }
        if (testAssignedRoutineId) {
            await supabase.from('assigned_routines').delete().eq('routine_id', testAssignedRoutineId);
            await supabase.from('routines').delete().eq('id', testAssignedRoutineId);
        }
    });

    test.setTimeout(TEST_TIMEOUT);

    test('Step 1: Client can load their own template efficiently', async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[type="email"]', CLIENT.email);
        await page.fill('input[type="password"]', CLIENT.pass);
        await page.click('button[type="submit"]');

        // Wait for dashboard to settle
        await expect(page).toHaveURL('/app', { timeout: 10000 });
        await page.waitForLoadState('networkidle');

        // Navigate via Nuevo Entreno button
        await page.click('[data-testid="new-workout-btn"]');
        await expect(page).toHaveURL(/\/app\/workout\/new/, { timeout: 10000 });

        // Open Template Modal
        await page.click('[data-testid="btn-load-template"]');

        // Wait for modal to be visible using specific role locator
        await expect(page.getByRole('heading', { name: 'Cargar Plantilla' })).toBeVisible();

        // Ensure we are on "Mis Plantillas" tab (wait for it to appear after loading)
        const clientTab = page.locator('[data-testid="tab-client"]');
        await expect(clientTab).toBeVisible({ timeout: 15000 });
        await clientTab.click();

        // Wait for the specific template to appear 
        const templateItem = page.getByText(/Full Body A Test/).first();
        await expect(templateItem).toBeVisible({ timeout: 15000 });
        await templateItem.click();

        // Verify it loads correctly in editor (use regex for flexibility)
        await expect(page.getByTestId('exercise-name').filter({ hasText: /sentadilla|squat/i }).first()).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/Full Body A Test/)).toBeVisible();

        console.log(`DEBUG: Step 1 completed successfully`);
    });

    test('Step 2: Client can load Trainer-assigned routine (RLS Check)', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', CLIENT.email);
        await page.fill('input[type="password"]', CLIENT.pass);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/app', { timeout: 10000 });
        await page.waitForLoadState('networkidle');

        // Navigate via Nuevo Entreno button
        await page.click('[data-testid="new-workout-btn"]');
        await expect(page).toHaveURL(/\/app\/workout\/new/, { timeout: 10000 });

        // Open Assigned Routines Modal
        await page.getByTestId('btn-load-assigned').click();

        // Wait for modal
        await expect(page.locator('text="Rutinas Asignadas"')).toBeVisible();

        // Wait for assigned routine to appear 
        const assignedItem = page.getByText(/Rutina Fuerza Pro Test/).first();
        await expect(assignedItem).toBeVisible({ timeout: 10000 });
        await assignedItem.click();

        // Verify at least one exercise card is loaded
        await expect(page.getByTestId('exercise-name').first()).toBeVisible({ timeout: 15000 });
    });
});
