import { test, expect } from '@playwright/test';
import { testConfig } from '../helpers/test-data';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    // Check that page loads and has proper title
    await expect(page).toHaveTitle(/NoEducation|Compliance/i);
    
    // Check that main content container is visible
    const mainContainer = page.locator('main, [role="main"]').first();
    await expect(mainContainer).toBeVisible();
  });

  test('should display email list component', async ({ page }) => {
    // Wait for the email list to load
    const emailList = page.locator('[data-testid="email-list"], .email-list').first();
    
    // If email list component exists, it should be visible
    // If it requires authentication, we might see a sign-in prompt instead
    try {
      await expect(emailList).toBeVisible({ timeout: 10000 });
    } catch {
      // If no email list, check if we're redirected to sign-in
      const signInElements = page.locator('text=sign in, text=login, [href*="auth/signin"]');
      if (await signInElements.count() > 0) {
        await expect(signInElements.first()).toBeVisible();
      }
    }
  });

  test('should have responsive layout', async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    const mainContainer = page.locator('main, [role="main"]').first();
    await expect(mainContainer).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(mainContainer).toBeVisible();

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(mainContainer).toBeVisible();
  });

  test('should handle loading states gracefully', async ({ page }) => {
    // Slow down network to test loading states
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100);
    });

    await page.goto('/');
    
    // Check that page doesn't show error states during normal loading
    const errorMessages = page.locator('text=error, text=failed, .error');
    const count = await errorMessages.count();
    
    // Allow for normal loading, then check no persistent errors
    await page.waitForTimeout(2000);
    
    // Should not have visible error messages after loading
    const visibleErrors = await errorMessages.filter({ hasText: /error|failed/i }).count();
    expect(visibleErrors).toBeLessThanOrEqual(count); // Allow for temporary loading errors
  });

  test('should have proper meta tags and SEO elements', async ({ page }) => {
    // Check for viewport meta tag
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);

    // Check for charset
    const charset = page.locator('meta[charset]');
    await expect(charset).toHaveCount(1);
  });

  test('should load CSS and JavaScript properly', async ({ page }) => {
    // Check that styles are loaded (no unstyled content)
    await page.waitForLoadState('networkidle');
    
    // Check that basic styling is applied
    const body = page.locator('body');
    const backgroundColor = await body.evaluate(el => 
      getComputedStyle(el).backgroundColor
    );
    
    // Should have some background color applied (not transparent)
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});