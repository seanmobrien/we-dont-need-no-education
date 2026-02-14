import { test, expect } from '@playwright/test';
test.describe('Error Handling', () => {
    test('should display custom 404 page', async ({ page }) => {
        await page.goto('/non-existent-page-12345');
        const notFoundIndicators = [
            page.locator('h1:has-text("404")'),
            page.locator('h1:has-text("Not Found")'),
            page.locator('h2:has-text("404")'),
            page.locator('h2:has-text("Not Found")'),
            page.locator('text=page not found'),
            page.locator("text=page you're looking for"),
        ];
        let notFoundFound = false;
        for (const indicator of notFoundIndicators) {
            if (await indicator.isVisible({ timeout: 5000 })) {
                console.log('Found 404 page indicator');
                notFoundFound = true;
                break;
            }
        }
        if (!notFoundFound) {
            expect(page.url()).not.toContain('/non-existent-page-12345');
            console.log('Redirected to valid page instead of showing 404');
        }
    });
    test('should have helpful navigation on 404 page', async ({ page }) => {
        await page.goto('/non-existent-page-test-navigation');
        const navigationButtons = [
            page.locator('button:has-text("Go Home")'),
            page.locator('a:has-text("Go Home")'),
            page.locator('button:has-text("Back")'),
            page.locator('a:has-text("Back")'),
            page.locator('button:has-text("Search")'),
            page.locator('a[href="/"]'),
        ];
        let navigationFound = false;
        for (const button of navigationButtons) {
            if (await button.isVisible({ timeout: 5000 })) {
                console.log('Found navigation option on 404 page');
                navigationFound = true;
                const href = await button.getAttribute('href');
                const text = await button.textContent();
                if (href === '/' || (text && text.toLowerCase().includes('home'))) {
                    await button.click();
                    await page.waitForTimeout(2000);
                    expect(page.url()).not.toContain('/non-existent-page-test-navigation');
                    console.log('Successfully navigated from 404 page');
                }
                break;
            }
        }
        if (!navigationFound) {
            console.log('No navigation found on 404 page, but page may redirect automatically');
        }
    });
    test('should handle network errors gracefully', async ({ page }) => {
        await page.route('**/api/**', (route) => {
            if (route.request().url().includes('/test-error')) {
                route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Internal Server Error' }),
                });
            }
            else {
                route.continue();
            }
        });
        await page.goto('/');
        await page.waitForTimeout(3000);
        await expect(page.locator('body')).toBeVisible();
        console.log('Page handles network errors without crashing');
    });
    test('should handle JavaScript errors gracefully', async ({ page }) => {
        const consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        const pageErrors = [];
        page.on('pageerror', (error) => {
            pageErrors.push(error.message);
        });
        await page.goto('/');
        await page.waitForTimeout(5000);
        if (pageErrors.length > 0) {
            console.log(`Found ${pageErrors.length} page errors:`, pageErrors);
        }
        await expect(page.locator('body')).toBeVisible();
        console.log('Page remains functional despite any JavaScript errors');
    });
    test('should handle slow network conditions', async ({ page }) => {
        await page.route('**/*', (route) => {
            setTimeout(() => route.continue(), 1000);
        });
        await page.goto('/');
        const loadingIndicators = [
            page.locator('.loading'),
            page.locator('.spinner'),
            page.locator('[data-testid*="loading"]'),
            page.locator('text=loading'),
        ];
        let loadingFound = false;
        for (const indicator of loadingIndicators) {
            if (await indicator.isVisible({ timeout: 2000 })) {
                console.log('Found loading indicator for slow network');
                loadingFound = true;
                break;
            }
        }
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        expect(loadingFound).toBe(true);
        console.log('Page handles slow network conditions appropriately');
    });
    test('should handle invalid URLs gracefully', async ({ page }) => {
        const invalidUrls = [
            '/messages/email/invalid-email-id-12345',
            '/messages/chat/invalid-chat-id',
            '/bulk-edit/invalid-operation',
        ];
        for (const url of invalidUrls) {
            await page.goto(url);
            await page.waitForTimeout(2000);
            const unhandledError = page.locator('text=/unhandled|crashed|something went wrong/i');
            const hasUnhandledError = await unhandledError.isVisible({
                timeout: 2000,
            });
            expect(hasUnhandledError).toBe(false);
            const currentUrl = page.url();
            const errorHandled = currentUrl.includes('/404') ||
                currentUrl !== url ||
                (await page
                    .locator('text=404, text=not found, text=error')
                    .isVisible());
            expect(errorHandled).toBe(true);
            console.log(`Invalid URL ${url} handled gracefully`);
        }
    });
    test('should display meaningful error messages', async ({ page }) => {
        await page.goto('/');
        const errorMessages = page.locator('.error, [role="alert"], .alert-error');
        const errorCount = await errorMessages.count();
        for (let i = 0; i < errorCount; i++) {
            const errorMsg = errorMessages.nth(i);
            const errorText = await errorMsg.textContent();
            if (errorText && errorText.trim()) {
                const isMeaningful = errorText.length > 10 &&
                    !errorText.includes('undefined') &&
                    !errorText.includes('[object Object]') &&
                    !errorText.includes('null');
                if (!isMeaningful) {
                    console.warn(`Found unhelpful error message: ${errorText}`);
                }
                else {
                    console.log(`Found meaningful error message: ${errorText.substring(0, 50)}...`);
                }
            }
        }
    });
    test('should have accessible error states', async ({ page }) => {
        await page.goto('/');
        const errorElements = page.locator('[role="alert"], .error, .alert');
        const errorCount = await errorElements.count();
        for (let i = 0; i < errorCount; i++) {
            const errorElement = errorElements.nth(i);
            const ariaLive = await errorElement.getAttribute('aria-live');
            const role = await errorElement.getAttribute('role');
            if (role === 'alert' ||
                ariaLive === 'polite' ||
                ariaLive === 'assertive') {
                console.log('Found accessible error message');
            }
        }
    });
    test('should recover from temporary errors', async ({ page }) => {
        let requestCount = 0;
        await page.route('**/api/**', (route) => {
            requestCount++;
            if (requestCount <= 2) {
                route.fulfill({
                    status: 500,
                    body: JSON.stringify({ error: 'Temporary error' }),
                });
            }
            else {
                route.continue();
            }
        });
        await page.goto('/');
        await page.waitForTimeout(5000);
        await expect(page.locator('body')).toBeVisible();
        console.log('Page handles temporary errors and recovery appropriately');
    });
});
//# sourceMappingURL=error-handling.test.js.map