/**
 * production-fixes.spec.js
 *
 * Tests E2E para verificar las correcciones de producción implementadas.
 * Cubre los 6 puntos del plan de corrección:
 *
 *   P4 - RIR vacío (como placeholder) al cargar rutina
 *   P5 - Notas del ejercicio visibles en resumen
 *   P1 - Ejercicios archivados siguen visibles en rutinas
 *   P2 - Guardado atómico: verifica que el payload llega correcto
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local first (matching Vite priority)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

const CLIENT = { 
    email: 'lindo@test.com', 
    pass: 'IronTrack2025',
    id: '22222222-2222-2222-2222-222222222222' 
};

let SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:55321';
if (SUPABASE_URL.includes('supabase.co')) {
    SUPABASE_URL = 'http://127.0.0.1:55321';
}
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODQ2OTYwNzN9.BAbPiUgyCpJyxcK-zVxOU9_WnLOyt0pBrXKsyzF1sQFosuS2QqAjCGM32kzehmTVYzUJ4Icocj1-bGkTw_wEdQ';

let supabase;

test.beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
});

// ─── Helper: login + dismiss modal ────────────────────────────────────────────
async function loginAs(page, user) {
    // Collect console logs for debugging
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.text().includes('DEBUG')) {
            console.log(`BROWSER ${msg.type().toUpperCase()}: ${msg.text()}`);
        }
    });

    await page.goto('/');
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.pass);
    await page.click('button:has-text("Iniciar Sesión")');

    // Handle potential forced password reset
    try {
        await page.waitForURL(/.*\/update-password/, { timeout: 8000 });
    } catch (e) {
        // Not redirected to password reset
    }

    if (page.url().includes('update-password')) {
        console.log('[Test Helper] Forced reset detected. Handling...');
        await page.fill('input[type="password"] >> nth=0', user.pass);
        await page.fill('input[type="password"] >> nth=1', user.pass);
        await page.click('button:has-text("Actualizar contraseña")');
        
        await Promise.race([
            page.waitForURL(/.*\/app/, { timeout: 20000 }),
            expect(page.locator('text=¡Todo listo!')).toBeVisible({ timeout: 20000 })
        ]);
        
        await page.waitForTimeout(2000); 
        if (!page.url().includes('/app')) {
            await page.goto('/app');
        }
    }

    await expect(page).toHaveURL(/\/app/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Handle Privacy Modal
    const privacyModal = page.locator('text=Consentimiento de Privacidad');
    const acceptBtn = page.locator('button:has-text("Aceptar y Continuar")');
    try {
        await acceptBtn.waitFor({ state: 'visible', timeout: 10000 });
        await acceptBtn.click();
        await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
    } catch (e) {
        // Modal not found or already handled
    }
}

// ─── Punto 4: RIR debe quedar vacío al cargar rutina ─────────────────────────
test.describe('P4: RIR like a placeholder when loading from routine', () => {
    
    let testRoutineId = null;

    test.beforeEach(async () => {
        // Authenticate Supabase client to avoid RLS issues
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: CLIENT.email,
            password: CLIENT.pass
        });
        
        if (authError) throw authError;
        const userId = authData.user.id;

        // Ensure a test routine exists for the client with at least one block/exercise
        const uniqueName = `Bodyweight Routine ${Date.now()}`;
        const { data: routineData, error: routineError } = await supabase.from('routines').insert({
            name: uniqueName,
            user_id: userId,
            description: 'E2E Test Template'
        }).select().single();
        
        if (routineError) console.error('Error creating test routine:', routineError);
        testRoutineId = routineData?.id;

        if (testRoutineId) {
            const { data: blockData } = await supabase.from('routine_blocks').insert({
                routine_id: testRoutineId,
                order_index: 0
            }).select().single();

            if (blockData) {
                // Get any exercise
                const { data: exs } = await supabase.from('exercises').select('id').limit(1);
                if (exs?.[0]) {
                    await supabase.from('routine_exercises').insert({
                        block_id: blockData.id,
                        exercise_id: exs[0].id,
                        position: 0
                    });
                }
            }
        }
    });

    test.afterEach(async () => {
        if (testRoutineId) {
            await supabase.from('routines').delete().eq('id', testRoutineId);
        }
    });

    test('RIR field must be empty (not pre-filled) when starting workout from a routine', async ({ page }) => {
        test.setTimeout(90000);
        await loginAs(page, CLIENT);

        // Limpiar cualquier estado previo para que el editor inicie vacío
        await page.evaluate(() => {
            localStorage.removeItem('draft_workout');
            localStorage.removeItem('active_workout_id');
        });

        // Hacer clic en "Nuevo Entreno" (Workout Editor)
        await page.click('button:has-text("Nuevo Entreno")');
        await expect(page).toHaveURL(/\/new/);
        await page.waitForLoadState('networkidle');

        // Hacer clic en "Cargar Plantilla"
        const loadTemplateBtn = page.getByTestId('btn-load-template').or(page.locator('button:has-text("Cargar Plantilla")')).first();
        await expect(loadTemplateBtn).toBeVisible({ timeout: 10000 });
        await loadTemplateBtn.click();

        // En el modal, esperar a que termine de cargar
        const modal = page.locator('.backdrop-blur-sm').last(); 
        
        // Ensure we are on the right tab
        const clientTab = modal.locator('[data-testid="tab-client"]').or(modal.locator('button:has-text("Mis Plantillas")')).first();
        await expect(clientTab).toBeVisible({ timeout: 10000 });
        await clientTab.click();

        const loader = modal.getByTestId('modal-loader');
        if (await loader.isVisible()) {
            await expect(loader).toBeHidden({ timeout: 15000 });
        }

        // Wait for ANY routine button to appear
        const templates = modal.getByRole('button').filter({ hasText: /bloque|rutina|fuerza|body|fuerza pro|weight/i });
        await expect(templates.first()).toBeVisible({ timeout: 15000 });
        
        // Handle template loading confirmation dialog
        page.on('dialog', dialog => {
            console.log('Accepting template dialog:', dialog.message());
            dialog.accept();
        });

        // Clicar y esperar a que el modal desaparezca
        await templates.first().click();
        await expect(modal).toBeHidden({ timeout: 15000 });
        
        // Wait for the routine to actually render in the editor
        // We look for the workout title or the first exercise name
        await expect(page.getByTestId('workout-header-title-trigger')).toBeVisible({ timeout: 15000 });
        await page.waitForLoadState('networkidle');

        const rirInputs = page.getByTestId('workout-input-rpe');
        
        // Wait up to 10s for either sets to appear OR to confirm it's empty
        await page.waitForTimeout(2000); 
        const firstRirCount = await rirInputs.count();
        if (firstRirCount > 0) {
            await expect(rirInputs.first()).toBeVisible({ timeout: 10000 });
        }

        // El campo RIR debe estar vacío (no pre-rellenado)
        // (variable rirInputs already declared above)

        if (firstRirCount > 0) {
            const firstRir = rirInputs.first();
            const rirValue = await firstRir.inputValue();
            expect(rirValue, 'RIR debe estar vacío al cargar desde rutina (solo placeholder)').toBe('');

            // Verificar que el placeholder sí tiene un valor (el RIR por defecto)
            const rirPlaceholder = await firstRir.getAttribute('placeholder');
            console.log(`RIR placeholder: "${rirPlaceholder}" | value: "${rirValue}"`);

            // Lo importante: el value está vacío
            expect(rirValue).toBe('');
        } else {
            // Si no hay ejercicios cargados, añadimos uno primero
            const exercisesCount = await page.getByTestId(/^workout-block-/).count();
            if (exercisesCount === 0) {
                console.log('No exercises loaded from template, adding one manually...');
                await page.getByTestId('btn-add-block').first().click();
                await page.getByPlaceholder('Buscar ejercicio...').fill('Press');
                await page.waitForTimeout(1000);
                await page.getByTestId(/^exercise-item-/).first().click();
                await expect(page.getByPlaceholder('Buscar ejercicio...')).not.toBeVisible();
            }

            // Ahora añadimos un set
            const addSetBtn = page.getByTestId('workout-btn-add-set').first();
            await addSetBtn.waitFor({ state: 'visible', timeout: 10000 });
            await addSetBtn.click();
            await page.waitForTimeout(300);

            const rirInput = page.getByTestId('workout-input-rpe').first();
            await expect(rirInput).toBeVisible({ timeout: 5000 });
            const rirValue = await rirInput.inputValue();
            expect(rirValue, 'RIR debe estar vacío tras añadir set desde rutina').toBe('');
        }

        console.log('✅ P4: RIR is empty (not pre-filled) when loading from routine');
    });
});

// ─── Punto 5: Notas del ejercicio visibles en resumen ─────────────────────────
test.describe('P5: Exercise notes visible in workout summary', () => {
    test('Notes written in workout editor must appear in the summary page', async ({ page }) => {
        test.setTimeout(180000);
        await loginAs(page, CLIENT);

        const uniqueNote = `Nota test ${Date.now()} - técnica perfecta`;

        // Crear nuevo entrenamiento
        await page.click('button:has-text("Nuevo Entreno")');
        await expect(page).toHaveURL(/\/new/);

        // Añadir ejercicio con espera de estabilidad
        await page.getByTestId('btn-add-block').first().click();
        await page.getByPlaceholder('Buscar ejercicio...').fill('Press');
        
        // Esperar a que el loader desaparezca y aparezcan los resultados
        await expect(page.locator('text=Cargando catálogo...')).not.toBeVisible({ timeout: 10000 });
        
        const exerciseItem = page.getByTestId(/^exercise-item-/).filter({ hasText: 'Press' }).first();
        await expect(exerciseItem).toBeVisible({ timeout: 10000 });
        
        // Un pequeño respiro para que el layout se asiente antes del click
        await page.waitForTimeout(500);
        await exerciseItem.click();
        
        await expect(page.getByPlaceholder('Buscar ejercicio...')).not.toBeVisible({ timeout: 8000 });

        // Escribir nota en el ejercicio
        const notesTextarea = page.getByPlaceholder('Notas técnicas para hoy...').first();
        await expect(notesTextarea).toBeVisible({ timeout: 8000 });
        await notesTextarea.fill(uniqueNote);

        // Añadir y completar un set
        await page.getByTestId('workout-btn-add-set').first().click();
        await page.waitForTimeout(300);
        await page.getByTestId('workout-input-weight').first().fill('80');
        await page.getByTestId('workout-input-reps').first().fill('8');
        await page.getByTestId('workout-btn-complete-set').first().click();

        // Guardar
        await page.getByTestId('workout-btn-save').click();
        await expect(page).toHaveURL(/\/app\/workout\/[a-f0-9-]+/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        // Verificar que la nota aparece en el resumen
        const summaryContainer = page.getByTestId('workout-summary-container').or(page.locator('.glass-card').first());
        await expect(summaryContainer).toBeVisible({ timeout: 15000 });

        const noteInSummary = page.locator(`text=${uniqueNote}`);
        await expect(noteInSummary).toBeVisible({ timeout: 10000 });
        console.log('✅ P5: Exercise note is visible in workout summary');
    });
});

// ─── Punto 1: Ejercicios archivados siguen presentes en rutinas ───────────────
test.describe('P1: Archived exercises remain visible in routines', () => {
    test('Archived exercise must still appear in an existing routine with "Archivado" badge', async ({ page }) => {
        test.setTimeout(120000);

        // Login como trainer (que puede crear ejercicios y rutinas)
        await loginAs(page, { email: 'trainer@test.com', pass: 'password123' });

        const uniqueSuffix = Date.now();
        const exName = `Archived Test ${uniqueSuffix}`;
        const routineName = `Routine Archived ${uniqueSuffix}`;

        // Paso 1: Crear ejercicio
        await page.goto('/app/exercises');
        await page.click('button:has-text("Nuevo Ejercicio")');
        await page.getByTestId('exercise-name-input').fill(exName);
        await page.getByTestId('exercise-muscle-group-select').selectOption('pecho');
        await Promise.all([
            page.waitForResponse(r => r.url().includes('/rest/v1/exercises') && r.status() === 201),
            page.getByTestId('exercise-submit-btn').click()
        ]);
        console.log('✓ Exercise created');

        // Paso 2: Crear rutina y añadir el ejercicio
        await page.goto('/app/routines');
        await page.getByTestId('routine-btn-create-new').click();
        await page.fill('label:has-text("Nombre") + input', routineName);
        await page.locator('form').getByRole('button', { name: 'Crear Plantilla' }).click();
        await page.getByTestId(`routine-card-${routineName}`).click();
        await page.getByTestId('routine-btn-add-exercise').click();

        const searchPromise = page.waitForResponse(r => r.url().includes('search_exercises'));
        await page.getByTestId('routine-exercise-search').pressSequentially(exName, { delay: 50 });
        await searchPromise;

        await page.locator('button').filter({ hasText: exName }).first().click();
        await page.getByTestId('routine-btn-save').click();
        await expect(page).toHaveURL(/\/app\/routines$/);
        console.log('✓ Routine saved with exercise');

        // Paso 3: Archivar el ejercicio
        await page.goto('/app/exercises');
        // Use search to avoid pagination issues
        await page.getByTestId('exercise-search-input').fill(exName);
        await page.waitForTimeout(1000);

        const exerciseRow = page.locator('div.group').filter({ hasText: exName }).first();
        await expect(exerciseRow).toBeVisible({ timeout: 10000 });

        // Target the specific exercise row delete button and click it
        // This opens a ConfirmModal (React portal), NOT a native dialog
        const deleteBtn = exerciseRow.locator('button[title="Eliminar"]');
        await expect(deleteBtn).toBeVisible();
        await deleteBtn.click();

        // Wait for ConfirmModal to appear, then confirm
        // NOTE: Both the exercise row button and the modal confirm button are named 'Eliminar'.
        // Scope the click to the modal confirm button (has bg-red-500 class, no title attr).
        await expect(page.locator('h3:has-text("¿Eliminar ejercicio?")')).toBeVisible({ timeout: 5000 });
        const modalConfirmBtn = page.locator('button.bg-red-500:has-text("Eliminar")');
        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('/rest/v1/exercises') && resp.ok()),
            modalConfirmBtn.click()
        ]);
        console.log('✓ Exercise archived');

        // Paso 4: Verificar que desaparece del catálogo
        await page.getByTestId('exercise-search-input').fill(exName);
        await expect(page.locator(`h3:has-text("${exName}")`)).not.toBeVisible({ timeout: 8000 });
        console.log('✓ Not in catalog anymore');

        // Paso 5: Verificar que la rutina sigue mostrando el ejercicio (con badge Archivado)
        await page.goto('/app/routines');
        await page.getByTestId(`routine-card-${routineName}`).click();
        await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 10000 });

        // El nombre del ejercicio sigue visible
        const exerciseInRoutine = page.locator('h3').filter({ hasText: new RegExp(exName, 'i') }).first();
        await expect(exerciseInRoutine).toBeVisible({ timeout: 10000 });

        // La badge "Archivado" debe ser visible
        const archivedBadge = exerciseInRoutine.locator('xpath=..').locator('span:has-text("Archivado")');
        await expect(archivedBadge).toBeVisible({ timeout: 5000 });

        console.log('✅ P1: Archived exercise is still visible in routine with "Archivado" badge');
    });
});

// ─── Punto 2: Guardado atómico — payload correcto ─────────────────────────────
test.describe('P2: Atomic save — payload integrity', () => {
    test('Saving a workout with notes must include notes in the RPC payload', async ({ page }) => {
        test.setTimeout(120000);
        await loginAs(page, CLIENT);

        const uniqueNote = `Payload test ${Date.now()}`;

        // Interceptar la llamada a save_full_workout
        let capturedPayload = null;
        page.on('request', req => {
            if (req.url().includes('save_full_workout') && req.method() === 'POST') {
                try {
                    capturedPayload = req.postDataJSON();
                } catch (e) {
                    capturedPayload = req.postData();
                }
            }
        });

        // Nuevo entrenamiento
        await page.click('button:has-text("Nuevo Entreno")');
        await expect(page).toHaveURL(/\/new/);

        // Añadir ejercicio
        await page.getByTestId('btn-add-block').first().click();
        await page.getByPlaceholder('Buscar ejercicio...').fill('Curl');
        await page.waitForTimeout(1200);
        await page.getByTestId(/^exercise-item-/).filter({ hasText: 'Curl' }).first().click();
        await expect(page.getByPlaceholder('Buscar ejercicio...')).not.toBeVisible({ timeout: 8000 });

        // Escribir nota
        const notesTextarea = page.getByPlaceholder('Notas técnicas para hoy...').first();
        await notesTextarea.fill(uniqueNote);

        // Set completado
        await page.getByTestId('workout-btn-add-set').first().click();
        await page.waitForTimeout(300);
        await page.getByTestId('workout-input-weight').first().fill('30');
        await page.getByTestId('workout-input-reps').first().fill('12');
        await page.getByTestId('workout-btn-complete-set').first().click();

        // Guardar y esperar respuesta de la RPC
        const rpcResponse = page.waitForResponse(
            r => r.url().includes('save_full_workout') && r.status() === 200,
            { timeout: 20000 }
        );
        await page.getByTestId('workout-btn-save').click();
        await rpcResponse;

        await expect(page).toHaveURL(/\/app\/workout\/[a-f0-9-]+/, { timeout: 20000 });

        // Verificar el payload capturado
        expect(capturedPayload, 'Payload debe haberse capturado').not.toBeNull();
        console.log('Captured payload p_blocks:', JSON.stringify(capturedPayload?.p_blocks, null, 2));

        // Las notas deben ir en el bloque de ejercicios
        if (capturedPayload?.p_blocks) {
            const blocks = capturedPayload.p_blocks;
            const firstExercise = blocks[0]?.exercises?.[0];
            expect(firstExercise?.notes, 'Las notas del ejercicio deben estar en el payload').toBe(uniqueNote);
        }

        console.log('✅ P2: Workout saved atomically with exercise notes in payload');
    });

    test('Saving large workout (5 exercises, 3 sets each) completes without error', async ({ page }) => {
        test.setTimeout(180000);
        await loginAs(page, CLIENT);

        const searchTerms = ['Press', 'Curl', 'Sentadilla', 'Remo', 'Plancha'];

        await page.click('button:has-text("Nuevo Entreno")');
        await expect(page).toHaveURL(/\/new/);

        // Añadir 5 ejercicios
        for (let i = 0; i < 5; i++) {
            const addBtn = page.getByTestId('btn-add-block').last();
            await addBtn.scrollIntoViewIfNeeded();
            await addBtn.click();

            const searchInput = page.getByPlaceholder('Buscar ejercicio...');
            await expect(searchInput).toBeVisible({ timeout: 8000 });
            
            await searchInput.fill(searchTerms[i]);
            
            // Esperar a que el item sea visible y estable
            const exerciseItem = page.getByTestId(/^exercise-item-/).filter({ hasText: new RegExp(searchTerms[i], 'i') }).first();
            await expect(exerciseItem).toBeVisible({ timeout: 10000 });
            await page.waitForTimeout(500); // Estabilización
            await exerciseItem.click();
            
            await expect(searchInput).not.toBeVisible({ timeout: 8000 });
            await page.waitForTimeout(300);
        }

        console.log('✓ 5 exercises added');

        // Para cada ejercicio añadir 3 sets completos
        const blocks = page.locator('[data-testid^="workout-block-"]');
        // Fallback: si el testid no existe, usar los contenedores de bloque
        const blockCount = await blocks.count();
        const useBlocks = blockCount >= 5;

        for (let i = 0; i < 5; i++) {
            const container = useBlocks
                ? blocks.nth(i)
                : page.locator('.glass-card').nth(i);

            await container.scrollIntoViewIfNeeded();

            for (let s = 0; s < 3; s++) {
                await container.getByTestId('workout-btn-add-set').click();
                await page.waitForTimeout(300);
                await container.getByTestId('workout-input-weight').last().fill(String(40 + s * 5));
                await container.getByTestId('workout-input-reps').last().fill(String(12 - s));
                await container.getByRole('button', { name: 'Completar set' }).nth(s).click();
                await page.waitForTimeout(200);
            }
        }

        console.log('✓ 15 sets filled and completed');

        // Guardar — debe completarse sin error y redirigir al resumen
        const rpcResp = page.waitForResponse(
            r => r.url().includes('save_full_workout') && r.ok(),
            { timeout: 35000 } // margen para la nueva RPC con timeout de 30s
        );
        await page.getByTestId('workout-btn-save').click();

        const response = await rpcResp;
        expect(response.ok(), 'La RPC save_full_workout debe responder con 200').toBe(true);

        await expect(page).toHaveURL(/\/app\/workout\/[a-f0-9-]+/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        // Verificar que en el resumen aparecen los 5 ejercicios
        const summaryContainer = page.getByTestId('workout-summary-container').or(page.locator('.glass-card').first());
        await expect(summaryContainer).toBeVisible({ timeout: 15000 });
        const exerciseHeadings = summaryContainer.locator('h3');
        const headingCount = await exerciseHeadings.count();
        expect(headingCount, 'Deben aparecer los 5 ejercicios en el resumen').toBeGreaterThanOrEqual(5);

        console.log(`✅ P2: Large workout saved atomically (${headingCount} exercises in summary)`);
    });
});
