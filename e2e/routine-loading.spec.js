import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const CLIENT = { email: 'lindo@test.com', pass: 'IronTrack2025', id: '22222222-2222-2222-2222-222222222222' };
const TRAINER = { email: 'trainer@test.com', pass: 'password123', id: '11111111-1111-1111-1111-111111111111' };

// FIX: Create test data programmatically using Supabase client
// Uses same pattern as other E2E tests (security-extended.spec.js, v3.12-enhancements.spec.js)
const SUPABASE_URL = 'http://127.0.0.1:55321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODQ2OTYwNzN9.BAbPiUgyCpJyxcK-zVxOU9_WnLOyt0pBrXKsyzF1sQFosuS2QqAjCGM32kzehmTVYzUJ4Icocj1-bGkTw_wEdQ';

test.describe('Routine Loading Optimization & Visibility', () => {

    const TEST_TIMEOUT = 120000;
    let supabase;
    let testRoutineId;
    let testAssignedRoutineId;

    test.beforeAll(async () => {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    });

    test.beforeEach(async () => {
        // Login as CLIENT to create their own routine
        await supabase.auth.signInWithPassword({
            email: CLIENT.email,
            password: CLIENT.pass
        });

        // Create client's own template routine
        const { data: clientRoutine, error: routineError } = await supabase
            .from('routines')
            .insert({
                name: 'Full Body A',
                description: 'Test routine for E2E',
                user_id: CLIENT.id,
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
        const { data: exercise } = await supabase
            .from('exercises')
            .select('id')
            .ilike('name', '%sentadilla%')
            .limit(1)
            .single();

        if (exercise && block) {
            await supabase
                .from('routine_exercises')
                .insert({
                    block_id: block.id,
                    exercise_id: exercise.id,
                    position: 'a'
                });
        }

        // Login as TRAINER to create assigned routine
        await supabase.auth.signInWithPassword({
            email: TRAINER.email,
            password: TRAINER.pass
        });

        // Create trainer's routine
        const { data: trainerRoutine } = await supabase
            .from('routines')
            .insert({
                name: 'Rutina Fuerza Pro',
                description: 'Assigned by trainer',
                user_id: TRAINER.id,
                created_by_trainer: TRAINER.id
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

        // Get exercise IDs
        const { data: pressBancaEx } = await supabase
            .from('exercises')
            .select('id')
            .ilike('name', '%press%banca%')
            .limit(1)
            .single();

        const { data: pesoMuertoEx } = await supabase
            .from('exercises')
            .select('id')
            .ilike('name', '%peso%muerto%')
            .limit(1)
            .single();

        if (pressBancaEx && trainerBlock) {
            await supabase.from('routine_exercises').insert({
                block_id: trainerBlock.id,
                exercise_id: pressBancaEx.id,
                position: 'a'
            });
        }

        if (pesoMuertoEx && trainerBlock) {
            await supabase.from('routine_exercises').insert({
                block_id: trainerBlock.id,
                exercise_id: pesoMuertoEx.id,
                position: 'b'
            });
        }

        // Assign routine to client
        await supabase
            .from('assigned_routines')
            .insert({
                routine_id: testAssignedRoutineId,
                assigned_by: TRAINER.id,
                client_id: CLIENT.id
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

        // Wait for the specific template to appear (from seed.sql: "Full Body A")
        const templateItem = page.getByText(/Full Body A/).first();
        await expect(templateItem).toBeVisible({ timeout: 15000 });
        await templateItem.click();

        // Verify it loads correctly in editor (use regex for flexibility)
        await expect(page.getByText(/Sentadilla/)).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/Full Body A/)).toBeVisible();

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

        // Wait for assigned routine to appear (from seed.sql: "Rutina Fuerza Pro")
        const assignedItem = page.getByText(/Rutina Fuerza Pro/).first();
        await expect(assignedItem).toBeVisible({ timeout: 10000 });
        await assignedItem.click();

        // Verify it loads correctly in editor
        await expect(page.getByText(/Press Banca/)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/Peso Muerto/)).toBeVisible();
    });
});
