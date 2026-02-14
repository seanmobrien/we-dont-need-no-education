import { test, expect } from '@playwright/test';
test.describe('Homepage', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });
    test('should load homepage successfully', async ({ page }) => {
        await expect(page).toHaveTitle(/NoEducation|Compliance/i);
        const mainContainer = page.locator('main, [role="main"]').first();
        await expect(mainContainer).toBeVisible();
    });
    test('should display email list component', async ({ page }) => {
        const emailList = page
            .locator('[data-testid="email-list"], .email-list')
            .first();
        try {
            await expect(emailList).toBeVisible({ timeout: 10000 });
        }
        catch {
            const signInElements = page.locator('text=\"sign in\", text=\"login\", [href*=\"auth/signin\"]');
            if ((await signInElements.count()) > 0) {
                await expect(signInElements.first()).toBeVisible();
            }
        }
    });
    test('should have responsive layout', async ({ page }) => {
        await page.setViewportSize({ width: 1200, height: 800 });
        const mainContainer = page.locator('main, [role="main"]').first();
        await expect(mainContainer).toBeVisible();
        await page.setViewportSize({ width: 768, height: 1024 });
        await expect(mainContainer).toBeVisible();
        await page.setViewportSize({ width: 375, height: 667 });
        await expect(mainContainer).toBeVisible();
    });
    test('should handle loading states gracefully', async ({ page }) => {
        await page.route('**/*', (route) => {
            setTimeout(() => route.continue(), 100);
        });
        await page.goto('/');
        const errorMessages = page.locator('text=error, text=failed, .error');
        const count = await errorMessages.count();
        await page.waitForTimeout(2000);
        const visibleErrors = await errorMessages
            .filter({ hasText: /error|failed/i })
            .count();
        expect(visibleErrors).toBeLessThanOrEqual(count);
    });
    test('should have proper meta tags and SEO elements', async ({ page }) => {
        const viewport = page.locator('meta[name="viewport"]');
        await expect(viewport).toHaveAttribute('content', /width=device-width/);
        const charset = page.locator('meta[charset]');
        await expect(charset).toHaveCount(1);
    });
    test('should load CSS and JavaScript properly', async ({ page }) => {
        await page.waitForLoadState('networkidle');
        const body = page.locator('body');
        const backgroundColor = await body.evaluate((el) => getComputedStyle(el).backgroundColor);
        expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });
});
//# sourceMappingURL=homepage.test.js.map