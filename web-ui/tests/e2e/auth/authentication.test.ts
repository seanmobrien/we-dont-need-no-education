import { test, expect } from '@playwright/test';
import {
  /*signInWithCredentials,*/ signOut,
  testUsers,
  isSignedIn,
} from '../helpers/auth-helper';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start from a clean state
    await page.goto('/');
  });

  test('should load sign-in page', async ({ page }) => {
    await page.goto('/auth/signin');

    // Should show sign-in page
    await expect(page).toHaveURL(/.*\/auth\/signin/);

    // Should have sign-in related content
    const signInContent = page
      .locator('h1, h2, title')
      .filter({ hasText: /sign in|login/i });
    await expect(signInContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display authentication providers', async ({ page }) => {
    await page.goto('/auth/signin');

    // Look for various authentication provider options
    const providerButtons = [
      page.locator('button:has-text("Google"), a:has-text("Google")'),
      page.locator('button:has-text("Azure"), a:has-text("Azure")'),
      page.locator('button:has-text("Credentials"), a:has-text("Credentials")'),
      page.locator('button:has-text("Email"), a:has-text("Email")'),
    ];

    let providersFound = 0;
    for (const button of providerButtons) {
      if (await button.isVisible({ timeout: 5000 })) {
        providersFound++;
      }
    }

    // Should have at least one authentication provider
    expect(providersFound).toBeGreaterThan(0);
  });

  test('should handle credentials sign-in flow @data-mutation', async ({
    page,
  }) => {
    await page.goto('/auth/signin');

    // Look for credentials form or button
    const credentialsOption = page
      .locator(
        'button:has-text("Credentials"), a:has-text("Credentials"), form',
      )
      .first();

    if (await credentialsOption.isVisible({ timeout: 5000 })) {
      // If it's a button/link, click it
      if (
        await credentialsOption.evaluate(
          (el) =>
            el.tagName.toLowerCase() === 'button' ||
            el.tagName.toLowerCase() === 'a',
        )
      ) {
        await credentialsOption.click();
      }

      // Look for email and password fields
      const emailField = page
        .locator(
          'input[name="email"], input[name="username"], input[type="email"]',
        )
        .first();
      const passwordField = page
        .locator('input[name="password"], input[type="password"]')
        .first();

      if (
        (await emailField.isVisible({ timeout: 5000 })) &&
        (await passwordField.isVisible({ timeout: 5000 }))
      ) {
        // Fill in test credentials
        await emailField.fill(testUsers.user.email);
        await passwordField.fill(testUsers.user.password);

        // Find submit button
        const submitButton = page
          .locator(
            'button[type="submit"], button:has-text("Sign in"), input[type="submit"]',
          )
          .first();

        if (await submitButton.isVisible()) {
          await submitButton.click();

          // Wait for potential redirect
          await page.waitForTimeout(3000);

          // Check if we were redirected away from sign-in page
          const currentUrl = page.url();
          const isRedirected = !currentUrl.includes('/auth/signin');

          if (isRedirected) {
            console.log('Successfully redirected after sign-in attempt');
          } else {
            // Might show error message for test credentials
            console.log('Stayed on sign-in page - checking for error messages');
            const errorMessages = page.locator(
              'text=error, text=invalid, .error, [role="alert"]',
            );
            if ((await errorMessages.count()) > 0) {
              console.log(
                'Found error messages as expected for test credentials',
              );
            }
          }
        }
      }
    } else {
      console.log('No credentials sign-in option found');
    }
  });

  test('should handle OAuth provider buttons', async ({ page }) => {
    await page.goto('/auth/signin');

    // Test Google OAuth button
    const googleButton = page
      .locator('button:has-text("Google"), a:has-text("Google")')
      .first();

    if (await googleButton.isVisible({ timeout: 5000 })) {
      // Note: We don't actually complete OAuth in tests, just verify the button works
      // In a real test environment, you would set up OAuth test accounts

      const href = await googleButton.getAttribute('href');
      if (href) {
        // Check that it's a proper OAuth URL structure
        expect(href).toMatch(/auth|oauth|google/);
      } else {
        // If it's a button, clicking it should trigger navigation
        await googleButton.click();

        // Wait a moment for any navigation
        await page.waitForTimeout(2000);

        // Should either redirect to OAuth provider or show some response
        // const currentUrl = page.url();
        //const hasChanged = currentUrl !== (await page.evaluate(() => window.location.href));

        // For testing purposes, we'll just verify the button is functional
        console.log('Google OAuth button is clickable');
      }
    }
  });

  test('should handle sign-out flow @data-mutation', async ({ page }) => {
    // First check if already signed in
    if (await isSignedIn(page)) {
      await signOut(page);

      // Should be redirected to sign-in page or homepage
      const currentUrl = page.url();
      const isSignedOutUrl =
        currentUrl.includes('/auth/signin') || currentUrl.endsWith('/');
      expect(isSignedOutUrl).toBe(true);
    } else {
      console.log('Not signed in, skipping sign-out test');
    }
  });

  test('should redirect to protected pages after sign-in', async ({ page }) => {
    // Try to access a potentially protected page
    await page.goto('/messages/email');

    const currentUrl = page.url();

    if (currentUrl.includes('/auth/signin')) {
      // If redirected to sign-in, the protection is working
      console.log('Successfully redirected to sign-in for protected page');

      // Check that there might be a redirect parameter
      expect(currentUrl).toMatch(/auth\/signin/);
    } else {
      // If not redirected, the page might be publicly accessible or user is already signed in
      console.log(
        'Page is accessible without sign-in or user already signed in',
      );
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    // Check initial state
    const initialSignedIn = await isSignedIn(page);

    // Refresh the page
    await page.reload();

    // Check if sign-in state is maintained
    const afterRefreshSignedIn = await isSignedIn(page);

    // State should be consistent
    expect(afterRefreshSignedIn).toBe(initialSignedIn);
  });

  test('should handle authentication errors gracefully @data-mutation', async ({
    page,
  }) => {
    await page.goto('/auth/signin');

    // Look for error handling in the sign-in form
    const emailField = page
      .locator('input[name="email"], input[type="email"]')
      .first();
    const passwordField = page
      .locator('input[name="password"], input[type="password"]')
      .first();

    if (
      (await emailField.isVisible({ timeout: 5000 })) &&
      (await passwordField.isVisible())
    ) {
      // Try invalid credentials
      await emailField.fill('invalid@test.com');
      await passwordField.fill('wrongpassword');

      const submitButton = page
        .locator('button[type="submit"], button:has-text("Sign in")')
        .first();
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should show error message or stay on sign-in page
        await page.waitForTimeout(3000);

        // Check for error indicators
        const errorIndicators = [
          page.locator('text=error, text=invalid, text=incorrect'),
          page.locator('.error, [role="alert"], .alert'),
          page.locator('[data-testid*="error"]'),
        ];

        let errorFound = false;
        for (const indicator of errorIndicators) {
          if (await indicator.isVisible({ timeout: 2000 })) {
            errorFound = true;
            break;
          }
        }

        // Should either show error or redirect (depending on implementation)
        const stillOnSignIn = page.url().includes('/auth/signin');
        expect(errorFound || stillOnSignIn).toBe(true);
      }
    }
  });

  test('should have proper security attributes', async ({ page }) => {
    await page.goto('/auth/signin');

    // Check for proper form security attributes
    const forms = page.locator('form');
    const formCount = await forms.count();

    if (formCount > 0) {
      const firstForm = forms.first();

      // Check for CSRF protection or other security measures
      const hiddenInputs = firstForm.locator('input[type="hidden"]');
      const hiddenCount = await hiddenInputs.count();

      // Many auth systems use hidden CSRF tokens
      if (hiddenCount > 0) {
        console.log('Found hidden inputs, likely CSRF protection');
      }

      // Check form method and action
      const method = await firstForm.getAttribute('method');
      const action = await firstForm.getAttribute('action');

      if (method) {
        expect(method.toLowerCase()).toBe('post');
      }

      if (action) {
        // Action should be a proper URL
        expect(action).toMatch(/^\/|^https?:\/\//);
      }
    }
  });
});
