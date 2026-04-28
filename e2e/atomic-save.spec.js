import { test, expect } from '@playwright/test';

test.describe('Atomic Workout Save - Full Flow', () => {
    test('should login, create workout with 10 exercises, save atomically, and verify in summary', async ({ page }) => {
        // Increase timeout for this long stress test
        test.setTimeout(180000);

        // 1. LOGIN
        await page.goto('/');

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
        const newWorkoutBtn = page.getByTestId('new-workout-btn').first();
        await expect(newWorkoutBtn).toBeVisible({ timeout: 10000 });

        
        // Handle draft/template confirmation dialogs
        page.on('dialog', dialog => {
            console.log('Accepting dialog:', dialog.message());
            dialog.accept();
        });

        await newWorkoutBtn.click();

        await page.waitForURL(/\/workout\/new/, { timeout: 10000 });

        // Wait for editor to load
        await page.waitForLoadState('networkidle');
        await expect(page.getByTestId('workout-header-title-trigger')).toBeVisible({ timeout: 15000 });

        // 3. ADD 10 DIFFERENT EXERCISES
        const searchTerms = ['Press', 'Curl', 'Sentadilla', 'Prensa', 'Remo', 'Aperturas', 'Extension', 'Plancha', 'Peso Muerto', 'Zancadas'];

        for (let i = 0; i < 10; i++) {
            console.log(`Adding exercise ${i + 1}/10 (searching: ${searchTerms[i]})...`);

            const addBtn = page.getByTestId('btn-add-block').last();
            await addBtn.scrollIntoViewIfNeeded();
            await addBtn.click();

            await expect(page.getByPlaceholder('Buscar ejercicio...')).toBeVisible({ timeout: 5000 });

            // Use fill instead of pressSequentially for speed and reliability
            await page.getByPlaceholder('Buscar ejercicio...').fill(searchTerms[i]);
            
            // Wait for results
            const firstEx = page.getByTestId(/^exercise-item-/).filter({ hasText: new RegExp(searchTerms[i].replace(/[aeiou]/gi, '[$&áéíóú]'), 'i') }).first();
            await expect(firstEx).toBeVisible({ timeout: 10000 });
            await firstEx.click();

            // Verify exercise heading appeared in editor using new test-id
            await expect(page.getByTestId('exercise-name').filter({ hasText: new RegExp(searchTerms[i].replace(/[aeiou]/gi, '[$&áéíóú]'), 'i') }).last()).toBeVisible({ timeout: 10000 });

            
            await expect(page.getByPlaceholder('Buscar ejercicio...')).not.toBeVisible({ timeout: 5000 });
            await page.waitForTimeout(200);
        }

        console.log('✅ All 10 exercises added');

        // 4. ADD 3 SETS AND COMPLETE THEM FOR ALL EXERCISES
        const blocks = page.getByTestId(/^workout-block-/);
        const blockCount = await blocks.count();
        console.log(`Found ${blockCount} blocks in editor`);

        for (let i = 0; i < 10; i++) {
            console.log(`Adding and completing sets for exercise ${i + 1}/10...`);
            const block = blocks.nth(i);
            await block.scrollIntoViewIfNeeded();

            for (let setNum = 0; setNum < 3; setNum++) {
                const addSetBtn = block.getByTestId('workout-btn-add-set');
                await addSetBtn.click();

                const weightInput = block.getByTestId('workout-input-weight').last();
                const repsInput = block.getByTestId('workout-input-reps').last();

                await expect(weightInput).toBeVisible({ timeout: 5000 });
                await weightInput.fill(String(50 + setNum * 5));
                await repsInput.fill(String(10 - setNum));

                const completeBtn = block.getByTestId('workout-btn-complete-set').nth(setNum);
                await completeBtn.click();
            }
        }

        console.log('✅ All exercises have 3 completed sets');

        // 5. SAVE WORKOUT
        const saveBtn = page.getByTestId('workout-btn-save');
        await saveBtn.scrollIntoViewIfNeeded();
        await saveBtn.click();

        await page.waitForURL(/\/app\/workout\/[a-f0-9-]+/, { timeout: 35000 });
        console.log('✅ Redirected to summary');

        // 6. VERIFY SUMMARY
        await page.waitForLoadState('networkidle');
        const summaryContainer = page.getByTestId('workout-summary-container').or(page.locator('.glass-card').first());
        await expect(summaryContainer).toBeVisible({ timeout: 15000 });
        
        const exerciseHeadings = summaryContainer.locator('h3');
        const count = await exerciseHeadings.count();
        console.log(`Found ${count} exercise entries in summary`);
        expect(count).toBeGreaterThanOrEqual(10);
    });
});
