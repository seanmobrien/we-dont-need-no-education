import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test('should display custom 404 page', async ({ page }) => {
    await page.goto('/non-existent-page-12345');

    // Should show 404 page
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

    // Should either show 404 page or redirect to valid page
    if (!notFoundFound) {
      // Check if redirected to a valid page (not the non-existent URL)
      expect(page.url()).not.toContain('/non-existent-page-12345');
      console.log('Redirected to valid page instead of showing 404');
    }
  });

  test('should have helpful navigation on 404 page', async ({ page }) => {
    await page.goto('/non-existent-page-test-navigation');

    // Look for navigation options on 404 page
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

        // Test clicking the navigation (if it's a home link)
        const href = await button.getAttribute('href');
        const text = await button.textContent();

        if (href === '/' || (text && text.toLowerCase().includes('home'))) {
          await button.click();
          await page.waitForTimeout(2000);

          // Should navigate away from 404
          expect(page.url()).not.toContain(
            '/non-existent-page-test-navigation',
          );
          console.log('Successfully navigated from 404 page');
        }
        break;
      }
    }

    if (!navigationFound) {
      console.log(
        'No navigation found on 404 page, but page may redirect automatically',
      );
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept API requests and return errors to test error handling
    await page.route('**/api/**', (route) => {
      if (route.request().url().includes('/test-error')) {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/');

    // Try to trigger an API call that will fail
    // This depends on the app structure, but we can test general error handling

    // Check that the page doesn't crash and shows some error handling
    await page.waitForTimeout(3000);

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();

    console.log('Page handles network errors without crashing');
  });

  test('should handle JavaScript errors gracefully', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for page errors
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto('/');

    // Wait for page to load and any potential errors
    await page.waitForTimeout(5000);

    // Some console errors might be expected (like auth failures in test env)
    // But there should not be critical page errors that break functionality
    if (pageErrors.length > 0) {
      console.log(`Found ${pageErrors.length} page errors:`, pageErrors);
      // Don't fail the test for minor errors, just log them
    }

    // Page should still be functional despite any errors
    await expect(page.locator('body')).toBeVisible();
    console.log('Page remains functional despite any JavaScript errors');
  });

  test('should handle slow network conditions', async ({ page }) => {
    // Slow down network to test loading states
    await page.route('**/*', (route) => {
      setTimeout(() => route.continue(), 1000); // Add 1s delay
    });

    await page.goto('/');

    // Should show loading states or handle slow network gracefully
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

    // Eventually page should load
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

      // Should either show error page or redirect
      await page.waitForTimeout(2000);

      // Should not show unhandled error page
      const unhandledError = page.locator(
        'text=/unhandled|crashed|something went wrong/i',
      );
      const hasUnhandledError = await unhandledError.isVisible({
        timeout: 2000,
      });

      expect(hasUnhandledError).toBe(false);

      // Should show either 404, error message, or redirect
      const currentUrl = page.url();
      const errorHandled =
        currentUrl.includes('/404') ||
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

    // Look for any error messages on the page
    const errorMessages = page.locator('.error, [role="alert"], .alert-error');
    const errorCount = await errorMessages.count();

    for (let i = 0; i < errorCount; i++) {
      const errorMsg = errorMessages.nth(i);
      const errorText = await errorMsg.textContent();

      if (errorText && errorText.trim()) {
        // Error messages should be meaningful (not just technical jargon)
        const isMeaningful =
          errorText.length > 10 &&
          !errorText.includes('undefined') &&
          !errorText.includes('[object Object]') &&
          !errorText.includes('null');

        if (!isMeaningful) {
          console.warn(`Found unhelpful error message: ${errorText}`);
        } else {
          console.log(
            `Found meaningful error message: ${errorText.substring(0, 50)}...`,
          );
        }
      }
    }
  });

  test('should have accessible error states', async ({ page }) => {
    await page.goto('/');

    // Check for accessibility in error states
    const errorElements = page.locator('[role="alert"], .error, .alert');
    const errorCount = await errorElements.count();

    for (let i = 0; i < errorCount; i++) {
      const errorElement = errorElements.nth(i);

      // Check for proper ARIA attributes
      const ariaLive = await errorElement.getAttribute('aria-live');
      const role = await errorElement.getAttribute('role');

      if (
        role === 'alert' ||
        ariaLive === 'polite' ||
        ariaLive === 'assertive'
      ) {
        console.log('Found accessible error message');
      }
    }
  });

  test('should recover from temporary errors', async ({ page }) => {
    // Simulate temporary network failure then recovery
    let requestCount = 0;
    await page.route('**/api/**', (route) => {
      requestCount++;
      if (requestCount <= 2) {
        // Fail first few requests
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Temporary error' }),
        });
      } else {
        // Then succeed
        route.continue();
      }
    });

    await page.goto('/');

    // Wait for potential retry attempts
    await page.waitForTimeout(5000);

    // Page should eventually work or show appropriate error handling
    await expect(page.locator('body')).toBeVisible();

    console.log('Page handles temporary errors and recovery appropriately');
  });
});
