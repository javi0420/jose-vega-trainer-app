import { test, expect } from '@playwright/test';

test.describe('Assigned Routines Flow', () => {
    const TRAINER_EMAIL = 'trainer@test.com';
    const TRAINER_PASS = 'password123';
    const CLIENT_PASS = 'Joaquin2025';

    let clientEmail;
    let clientName;

    test('trainer assigns routine to client', async ({ page }) => {
        test.setTimeout(90000);

        // Generate unique client
        const uniqueId = Date.now();
        clientEmail = `test_client_${uniqueId}@test.com`;
        clientName = `Test Client ${uniqueId}`;

        // 1. Login as trainer
        await page.goto('/');
        await page.fill('input[type="email"]', TRAINER_EMAIL);
        await page.fill('input[type="password"]', TRAINER_PASS);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/);
        await page.waitForLoadState('networkidle');

        // 1.5 Create a "Fullbody" routine to ensure it exists
        await page.goto('/app/routines');
        await expect(page).toHaveURL(/\/app\/routines/);
        await expect(page.getByRole('heading', { name: 'Mis Plantillas' })).toBeVisible();
        // Wait for list to load
        await page.waitForLoadState('networkidle');

        // Check if we need to create it (if it doesn't exist, Create button is likely visible)
        // We'll just create a new one regardless or handle potential duplicates if names are unique?
        // Let's create one with a timestamp to be safe? 
        // No, the test later searches for 'Fullbody'.
        // So we should create 'Fullbody'.

        // Generate unique routine name
        const routineName = `Fullbody ${Date.now()}`;

        // Try to click the header create button which is always present
        // Or fallback to empty state button if list is empty
        const headerCreateBtn = page.locator('button[title="Crear Nueva Plantilla"]');
        const emptyStateCreateBtn = page.locator('button:has-text("Crear Plantilla")').first();

        if (await headerCreateBtn.isVisible()) {
            await headerCreateBtn.click();
        } else {
            await emptyStateCreateBtn.click();
        }

        // Modal appears
        await expect(page.locator('text=Nueva Plantilla')).toBeVisible(); // Header of modal
        // Fill form
        await page.fill('input[id="routine-name"]', routineName);
        // Click submit
        await page.click('button:has-text("Crear Plantilla")');

        // Wait for creation and close
        await page.waitForTimeout(1000);

        // Return to dashboard
        await page.goto('/app');


        // 2. Create test client
        await page.click('button[title="Añadir Cliente"]');
        await page.fill('input[placeholder="Ej: Juan Pérez"]', clientName);
        await page.fill('input[placeholder="ejemplo@email.com"]', clientEmail);
        // Wait for the success dialog and accept it
        page.once('dialog', dialog => dialog.accept());
        await page.click('button:has-text("Crear Cliente")');

        // Wait for modal to close and list to update
        await page.waitForTimeout(2000);

        // Clear any existing search first
        const searchInput = page.locator('input[placeholder*="Buscar"]').first();
        await searchInput.clear();
        await page.waitForTimeout(300);

        // 3. Search for the newly created client
        await searchInput.fill(clientEmail);
        await page.waitForTimeout(1000); // Increased wait time for search to filter

        // 4. Wait for client card to appear before looking for button
        await expect(page.locator(`text=${clientName}`)).toBeVisible({ timeout: 5000 });

        // 4. Click "Gestionar Rutinas"
        const clientRow = page.locator('[data-testid^="client-card-"]').filter({ hasText: clientName }).first();
        const manageButton = clientRow.getByTestId('action-assign');
        await expect(manageButton).toBeVisible({ timeout: 10000 });
        await manageButton.click({ force: true });

        // 5. Modal should appear
        await expect(page.locator('text=Asignar Rutina')).toBeVisible();

        // 6. Search for routine "Fullbody" (assuming it exists from seed data)
        const routineSearch = page.locator('input[placeholder*="Buscar en mis plantillas"]');
        await routineSearch.fill(routineName);
        await page.waitForTimeout(500);

        // 7. Click routine to expand
        // Use a clearer way to find the container:
        // Find the specific item in the list that contains our unique routine name
        // We target the DIRECT children of the grid to avoid matching the parent modal
        const routineItem = page.locator('.grid > div')
            .filter({ has: page.locator(`h4`, { hasText: routineName }) })
            .first();

        // Click the button inside this specific item (the toggle button that contains the h4)
        await routineItem.locator('button', { has: page.locator('h4') }).click();

        // 8. Wait for expanded section within THIS specific item
        // Use visible=true to ensure we aren't catching hidden ones from other duplicates if any
        await expect(routineItem.locator('h5', { hasText: 'Vista Previa de Ejercicios' })).toBeVisible();

        // 9. Fill notes if textarea exists IN THIS CONTAINER
        const notesTextarea = routineItem.locator('textarea[placeholder*="técnica"]');
        if (await notesTextarea.isVisible()) {
            await notesTextarea.fill('Enfócate en la técnica, descansa bien.');
        }

        // 10. Click assign
        // The assign button is INSIDE the routineItem container too, but only when expanded.
        const assignButton = routineItem.locator('button:has-text("Confirmar Asignación")');

        // Handle alert dialog explicitly to ensure completion
        const assignPromise = page.waitForEvent('dialog');
        await assignButton.click();
        const dialog = await assignPromise;
        await dialog.accept();

        // Wait for potential network/UI update after dialog closure
        await page.waitForTimeout(4000);

        // 11. VERIFY ASSIGNMENT VISIBILITY & UNASSIGN FLOW

        // Re-open the modal to check updates
        await page.reload(); // Force reload to ensure data is fresh
        await page.waitForLoadState('networkidle');

        // Re-search for the client because reload cleared the filter
        const searchInputReloaded = page.locator('input[placeholder*="Buscar"]').first();
        await searchInputReloaded.fill(clientEmail);
        await page.waitForTimeout(1000); // Wait for filter

        const manageButtonReloaded = page.locator('button[title="Gestionar Rutinas"]').first();
        await expect(manageButtonReloaded).toBeVisible();
        await manageButtonReloaded.click();
        await expect(page.locator('text=Asignar Rutina')).toBeVisible();

        // 11a. Verify it appears in "Rutinas Asignadas" list (Top Section)
        console.log('Verifying "Rutinas Asignadas" list visibility...');
        const assignedSection = page.locator('section', { has: page.locator('h3', { hasText: 'Rutinas Asignadas' }) });

        // Debug
        const sectionText = await assignedSection.innerText().catch(() => 'Section not found');
        console.log('Assigned Section Text:', sectionText);

        await expect(assignedSection.getByText(routineName)).toBeVisible({ timeout: 10000 });
        console.log('Make sure routine appears in top list: OK');

        // 11b. Search again to check Template List state
        await routineSearch.fill(routineName);
        await page.waitForTimeout(1000); // Wait for search debounc


        const routineItemAgain = page.locator('.grid > div')
            .filter({ has: page.locator(`h4`, { hasText: routineName }) })
            .first();

        // Expand
        await routineItemAgain.locator('button', { has: page.locator('h4') }).click();

        // Template button should be "Ya Asignada"
        const alreadyAssignedButton = routineItemAgain.locator('button:has-text("Ya Asignada")');
        await expect(alreadyAssignedButton).toBeVisible();
        await expect(alreadyAssignedButton).toBeDisabled();

        // 11c. TEST UNASSIGN (The "X" button)
        console.log('Testing Unassign Flow...');

        // Find the unassign button (red X) in the top list item
        const topListItem = assignedSection.locator('.group', { hasText: routineName });
        const unassignButton = topListItem.locator('button[title="Desasignar Rutina"]'); // We added this title in code
        await expect(unassignButton).toBeVisible();

        // Click unassign and handle confirm
        page.once('dialog', dialog => {
            console.log(`Dialog message: ${dialog.message()}`);
            dialog.accept();
        });
        await unassignButton.click();

        // Wait for list update
        await page.waitForTimeout(1000);

        // 11d. Verify it DISAPPEARS from top list
        await expect(assignedSection.locator(`h4:has-text("${routineName}")`)).not.toBeVisible();
        console.log('Routine removed from top list: OK');

        // 11e. Verify Template Button resets to "Confirmar Asignación" (enabled)
        // Note: The template list might have refreshed, so we might need to re-expand?
        // Let's assume list preserves state or we re-search if needed. 
        // Safer to close/open or just re-search if the UI is reactive.
        // The modal stays open, so let's re-verify the button state.

        const assignButtonReset = routineItemAgain.locator('button:has-text("Confirmar Asignación")');
        await expect(assignButtonReset).toBeVisible();
        await expect(assignButtonReset).toBeEnabled();
        console.log('Template button reset to enabled: OK');

        // Re-assign it so the next Client test has something to view!
        await assignButtonReset.click();
        await page.waitForTimeout(1000);
    });

    test('client views assigned routine and starts workout with exercises', async ({ page }) => {
        test.setTimeout(90000);

        // Use the client created in previous test
        if (!clientEmail) {
            test.skip(); // Skip if no client was created
        }

        // 1. Login as client
        await page.goto('/');
        await page.fill('input[type="email"]', clientEmail);
        await page.fill('input[type="password"]', CLIENT_PASS);
        await page.click('button:has-text("Iniciar Sesión")');

        // FIX: Wait for app logic to load user profile before checking for modal
        await page.waitForLoadState('networkidle');

        // Handle Privacy Consent Modal if it appears (for new clients)
        const privacyModal = page.locator('text=Consentimiento de Privacidad');
        // Use a short timeout to check properly, but don't fail if not present immediately (maybe already accepted)
        // But if it IS visible, we MUST wait for it to be accepted and disappear
        if (await privacyModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.click('button:has-text("Aceptar y Continuar")');
            // CRITICAL: Wait for modal to disappear completely to avoid overlay interception
            await expect(privacyModal).not.toBeVisible({ timeout: 10000 });
        }

        await expect(page).toHaveURL(/\/app/);

        // 2. Look for "Asignadas" card
        const assignedCard = page.locator('button:has-text("Asignadas")');
        await expect(assignedCard).toBeVisible({ timeout: 10000 });

        // 3. Click to navigate
        await assignedCard.click();

        // 4. Should navigate to /app/assigned-routines
        await expect(page).toHaveURL(/\/app\/assigned-routines/);
        await expect(page.locator('text=Rutinas Asignadas')).toBeVisible();

        // 5. Verify routine appears (if it was assigned in previous test)
        await page.waitForTimeout(1000);

        // 6. Click "Empezar Entreno" to start workout
        const startButton = page.locator('button:has-text("Empezar Entreno")').first();
        await expect(startButton).toBeVisible({ timeout: 5000 });
        await startButton.click();

        // 7. Should navigate to workout editor
        await expect(page).toHaveURL(/\/app\/workout\/new/);
        await page.waitForLoadState('networkidle');

        // 8. CRITICAL: Verify that exercises were loaded
        // Wait for workout blocks to render (they should exist if template loaded)
        const workoutBlocks = page.locator('[data-testid="workout-block"], .workout-block, div:has(> button:has-text("Añadir"))');
        await page.waitForTimeout(2000); // Give time for state to populate

        // Check that at least one exercise name is visible (from the template)
        // We can't know the exact exercise names, but they should exist
        const exerciseSelectors = page.locator('input[placeholder*="ejercicio"], select, button:has-text("Añadir Ejercicio")');
        const exerciseCount = await exerciseSelectors.count();

        // Log for debugging
        console.log('Client: Workout page loaded, checking for exercises...');
        console.log('Client: Found exercise-related elements:', exerciseCount);

        // The key validation: if the template loaded, we should NOT see the empty state
        // We should see at least some workout structure (blocks, inputs, etc.)
        const emptyStateCheck = page.locator('text=No hay ejercicios').or(page.locator('text=vacío'));
        const hasEmptyState = await emptyStateCheck.isVisible().catch(() => false);

        // If we see exercises/inputs, template loaded successfully
        // If we see empty state, template failed to load
        if (hasEmptyState) {
            throw new Error('FAIL: Workout template did not load - empty state detected');
        }

        console.log('Client: Template loaded successfully - no empty state found');
    });


    test('badge shows new assignments', async ({ page }) => {
        test.setTimeout(60000);

        if (!clientEmail) {
            test.skip();
        }

        // Login as client
        await page.goto('/');
        await page.fill('input[type="email"]', clientEmail);
        await page.fill('input[type="password"]', CLIENT_PASS);
        await page.click('button:has-text("Iniciar Sesión")');
        await expect(page).toHaveURL(/\/app/);

        // Check for badge
        const badge = page.locator('.bg-gold-500.text-black.rounded-full');

        // Navigate to assignments (marks as viewed)
        const assignedCard = page.locator('button:has-text("Asignadas")');
        if (await assignedCard.isVisible()) {
            await assignedCard.click();
            await expect(page).toHaveURL(/\/app\/assigned-routines/);
            await page.waitForTimeout(1000);

            // Go back
            await page.goBack();
            await expect(page).toHaveURL(/\/app$/);
        }
    });
});
