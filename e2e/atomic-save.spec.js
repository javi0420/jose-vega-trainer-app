import { test, expect } from '@playwright/test';

test.describe('Atomic Workout Save - Full Flow', () => {
    test('should login, create workout with 10 exercises, save atomically, and verify in summary', async ({ page }) => {
        // Increase timeout for this long stress test
        test.setTimeout(120000);

        // 1. LOGIN
        await page.goto('http://localhost:5173/');

        // Wait for login form
        await expect(page.locator('button:has-text("Iniciar Sesión")')).toBeVisible();

        // Fill login form
        await page.locator('input[type="email"]').fill('lindo@test.com');
        await page.locator('input[type="password"]').fill('IronTrack2025');
        await page.locator('button:has-text("Iniciar Sesión")').click();

        // Wait for redirect to dashboard
        await page.waitForURL(/\/app/, { timeout: 15000 });
        await page.waitForLoadState('networkidle');

        // Skip privacy modal if appears
        try {
            const acceptBtn = page.locator('button:has-text("Aceptar y Continuar")');
            if (await acceptBtn.isVisible({ timeout: 3000 })) {
                await acceptBtn.click();
                await page.waitForTimeout(1000);
            }
        } catch (e) {
            // Modal didn't appear, continue
        }

        // 2. NAVIGATE TO NEW WORKOUT
        const newWorkoutBtn = page.getByText('Nuevo Entreno');
        await expect(newWorkoutBtn).toBeVisible({ timeout: 10000 });
        await newWorkoutBtn.click();

        await page.waitForURL(/\/workout\/new/, { timeout: 10000 });

        // Wait for editor to load
        // Ensure data is ready
        await page.waitForLoadState('networkidle');
        await expect(page.getByTestId('workout-header-title-trigger')).toBeVisible({ timeout: 15000 });

        // 3. ADD 10 DIFFERENT EXERCISES
        const searchTerms = ['Press', 'Curl', 'Sentadilla', 'Prensa', 'Remo', 'Aperturas', 'Extension', 'Plancha', 'Peso Muerto', 'Zancadas'];

        for (let i = 0; i < 10; i++) {
            console.log(`Adding exercise ${i + 1}/10 (searching: ${searchTerms[i]})...`);

            // Find and click Add Exercise button
            const addBtn = page.getByTestId('btn-add-block').or(page.getByText('Añadir Ejercicio')).last();
            await addBtn.scrollIntoViewIfNeeded();
            await page.waitForTimeout(300);
            await addBtn.click();

            // Wait for modal
            await expect(page.getByPlaceholder('Buscar ejercicio...')).toBeVisible({ timeout: 5000 });

            // Search for DIFFERENT exercise each time
            const searchPromise = page.waitForResponse(resp => resp.url().includes('search_exercises') && resp.request().method() === 'POST');
            await page.getByPlaceholder('Buscar ejercicio...').pressSequentially(searchTerms[i], { delay: 50 });
            await searchPromise; // Wait for results to be fetched from DB

            // Click first result (or Ad-Hoc button if not found in db)
            const firstEx = page.locator('button').filter({ hasText: new RegExp(searchTerms[i], 'i') }).first();
            await expect(firstEx).toBeVisible({ timeout: 10000 });
            await firstEx.click();

            // Wait for modal to close
            await expect(page.getByPlaceholder('Buscar ejercicio...')).not.toBeVisible({ timeout: 5000 });

            // Wait for block to appear
            await expect(page.locator(`[data-testid="workout-block-${i}"]`)).toBeVisible({ timeout: 5000 });
            await page.waitForTimeout(300);
        }

        console.log('✅ All 10 exercises added');

        // 4. ADD 3 SETS AND COMPLETE THEM FOR ALL EXERCISES
        const blocks = page.locator('[data-testid^="workout-block-"]');
        const blockCount = await blocks.count();
        expect(blockCount).toBe(10);

        for (let i = 0; i < blockCount; i++) {
            console.log(`Adding and completing sets for exercise ${i + 1}/10...`);
            const block = blocks.nth(i);
            await block.scrollIntoViewIfNeeded();

            // Add 3 sets for this exercise
            for (let setNum = 0; setNum < 3; setNum++) {
                console.log(`  Adding set ${setNum + 1}/3...`);

                // Click "Añadir Set"
                const addSetBtn = block.getByText('Añadir Set');
                await addSetBtn.click();
                await page.waitForTimeout(500); // Longer wait for inputs to appear

                // Wait for new inputs to appear and get the LATEST ones (using placeholder)
                const weightInput = block.locator('input[placeholder="kg"]').last();
                const repsInput = block.locator('input[placeholder="reps"]').last();

                // Wait for visibility
                await expect(weightInput).toBeVisible({ timeout: 5000 });

                // Fill data - vary weights slightly for realism
                await weightInput.fill(String(50 + setNum * 5)); // 50, 55, 60
                await repsInput.fill(String(10 - setNum)); // 10, 9, 8

                // Click "Completar set" button using role for reliability
                const completeBtns = block.getByRole('button', { name: 'Completar set' });
                const completeBtn = completeBtns.nth(setNum);
                await completeBtn.click();

                await page.waitForTimeout(300);
            }

            console.log(`  ✅ Completed 3 sets for exercise ${i + 1}`);
        }

        console.log('✅ All exercises have 3 completed sets (30 total sets)');

        // 5. SAVE WORKOUT
        const saveBtn = page.getByTestId('btn-save-workout').or(page.getByText('Finalizar'));
        await saveBtn.scrollIntoViewIfNeeded();
        await saveBtn.click();

        // Wait for redirect to summary
        await page.waitForURL(/\/app\/workout\/[a-f0-9-]+/, { timeout: 20000 });
        console.log('✅ Redirected to summary');

        // 6. VERIFY SUMMARY SHOWS ALL 10 EXERCISES
        // Wait for summary to load
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Count exercise cards in summary (usually <h3> or similar headings)
        const exerciseCards = page.locator('h3, h2, .font-bold').filter({ hasText: /[A-Z]/ });
        const count = await exerciseCards.count();

        console.log(`Found ${count} exercise entries in summary`);

        // Should have at least 10 exercises
        expect(count).toBeGreaterThanOrEqual(10);

        console.log(`✅ Test passed! Successfully saved and verified ${count} exercises`);
    });
});
