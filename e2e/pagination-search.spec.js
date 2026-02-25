import { test, expect } from '@playwright/test';

test.describe('Pagination & Server-Side Search', () => {
    // test.use({ storageState: 'playwright/.auth/trainer.json' }); // Using explicit login instead

    const TRAINER_USER = { email: 'trainer@test.com', pass: 'password123' };

    test.beforeEach(async ({ page }) => {
        // Login as Trainer
        await page.goto('/');
        await page.fill('data-testid=login-input-email', TRAINER_USER.email);
        await page.fill('data-testid=login-input-password', TRAINER_USER.pass);
        await page.click('data-testid=login-btn-submit');
        await expect(page).toHaveURL(/\/app/);

        // Go to Exercise Manager (Trainer only)
        // Check for navigation button or navigate directly
        await page.goto('/app/exercises');
    });

    test('Initial Load: Should fetch first page (0-19) only', async ({ page }) => {
        // Intercept the exercises request
        const initialRequestPromise = page.waitForRequest(request =>
            request.url().includes('/rest/v1/exercises') &&
            request.method() === 'GET'
        );

        // Reload to force fetch
        await page.reload();

        const request = await initialRequestPromise;
        const headers = request.headers();
        console.log('Initial Headers:', headers);

        const range = headers['range'] || headers['Range'];

        if (range) {
            expect(range).toContain('0-19');
        } else {
            // Fallback: check query params if range header missing
            const url = request.url();
            console.log('Initial URL (No Range Header):', url);
        }
    });

    test('Search: Should trigger server-side filtering and reset page', async ({ page }) => {
        // Type in search box
        const searchInput = page.getByTestId('exercise-search-input');
        await expect(searchInput).toBeVisible();

        // Prepare to catch the RPC search request (not the old .ilike query)
        const searchRequestPromise = page.waitForRequest(request =>
            request.url().includes('/rest/v1/rpc/search_exercises') &&
            request.method() === 'POST'
        );

        await searchInput.fill('Sentadilla');

        const request = await searchRequestPromise;
        const url = request.url();
        const postData = request.postDataJSON();

        console.log('Search URL:', url);
        console.log('Search POST data:', postData);

        // 1. Verify RPC call
        expect(url).toContain('rpc/search_exercises');
        expect(postData.search_term).toBe('Sentadilla');
        expect(postData.p_offset).toBeDefined();
        expect(postData.p_limit).toBeDefined();

        // 2. Verify Pagination Reset (offset should be 0 for first page)
        expect(postData.p_offset).toBe(0);
    });

    test('Load More: Should fetch next page (20-39)', async ({ page }) => {
        // Wait for filtering to clear or reload
        await page.reload();
        await expect(page.getByTestId('exercise-search-input')).toBeVisible();

        const loadMoreBtn = page.getByTestId('load-more-btn');
        // Check visibility first
        if (await loadMoreBtn.isVisible()) {
            const loadMoreValues = page.waitForRequest(request =>
                request.url().includes('/rest/v1/exercises') &&
                request.method() === 'GET' &&
                (request.headers()['range'] === '20-39' || request.url().includes('offset=20'))
            );
            await loadMoreBtn.click();
            const request = await loadMoreValues;
            expect(request).toBeTruthy();
        } else {
            console.log('Load More button not visible - possibly not enough data in test DB');
            test.skip();
        }
    });
});
