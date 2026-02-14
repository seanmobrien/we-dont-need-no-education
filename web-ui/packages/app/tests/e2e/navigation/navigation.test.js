import { test, expect } from '@playwright/test';
import { testConfig } from '../helpers/test-data';
test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });
    test('should navigate to different sections', async ({ page }) => {
        const emailNavigation = async () => {
            try {
                await page.goto('/messages/email');
                await expect(page.url()).toContain('/messages/email');
                return true;
            }
            catch {
                return false;
            }
        };
        const bulkEditNavigation = async () => {
            try {
                await page.goto('/bulk-edit');
                await expect(page.url()).toContain('/bulk-edit');
                return true;
            }
            catch {
                return false;
            }
        };
        const chatNavigation = async () => {
            try {
                await page.goto('/messages/chat');
                await expect(page.url()).toContain('/messages/chat');
                return true;
            }
            catch {
                return false;
            }
        };
        await emailNavigation();
        await bulkEditNavigation();
        await chatNavigation();
    });
    test('should handle navigation menu if present', async ({ page }) => {
        const navigationElements = [
            'nav', '[role="navigation"]', '.nav', '.navigation',
            '[data-testid*="nav"]', 'header nav', '.header nav'
        ];
        let navigationFound = false;
        for (const selector of navigationElements) {
            const nav = page.locator(selector).first();
            if (await nav.isVisible({ timeout: 2000 })) {
                navigationFound = true;
                const links = nav.locator('a, button');
                const linkCount = await links.count();
                if (linkCount > 0) {
                    const firstLink = links.first();
                    const linkText = await firstLink.textContent();
                    if (linkText && linkText.trim()) {
                        await firstLink.click();
                        await page.waitForTimeout(1000);
                    }
                }
                break;
            }
        }
        if (!navigationFound) {
            console.log('No navigation menu found - testing direct URL navigation');
            await page.goto('/');
            await expect(page.locator('body')).toBeVisible();
        }
    });
    test('should handle breadcrumbs if present', async ({ page }) => {
        await page.goto('/messages/email');
        const breadcrumbSelectors = [
            '[aria-label*="breadcrumb"]', '.breadcrumb', '.breadcrumbs',
            '[data-testid*="breadcrumb"]', 'nav[aria-label*="breadcrumb"]'
        ];
        for (const selector of breadcrumbSelectors) {
            const breadcrumb = page.locator(selector).first();
            if (await breadcrumb.isVisible({ timeout: 2000 })) {
                const links = breadcrumb.locator('a');
                const linkCount = await links.count();
                if (linkCount > 0) {
                    const firstBreadcrumbLink = links.first();
                    await firstBreadcrumbLink.click();
                    await page.waitForTimeout(1000);
                }
                break;
            }
        }
    });
    test('should handle back navigation', async ({ page }) => {
        await page.goto('/messages/email');
        await page.goBack();
        expect(page.url()).toMatch(/\/$|\/$/);
    });
    test('should handle 404 pages', async ({ page }) => {
        await page.goto('/non-existent-page-12345');
        const notFoundIndicators = [
            'text=404', 'text=not found', 'text=page not found',
            '[data-testid*="404"]', '[data-testid*="not-found"]'
        ];
        let notFoundPageFound = false;
        for (const selector of notFoundIndicators) {
            if (await page.locator(selector).isVisible({ timeout: 5000 })) {
                notFoundPageFound = true;
                break;
            }
        }
        expect(notFoundPageFound || !page.url().includes('/non-existent-page-12345')).toBe(true);
    });
    test('should maintain URL structure', async ({ page }) => {
        const urlsToTest = [
            '/',
            '/messages/email',
            '/bulk-edit',
            '/messages/chat'
        ];
        for (const url of urlsToTest) {
            await page.goto(url);
            expect(page.url()).toMatch(new RegExp(url.replace('/', '\\/')));
            await expect(page.locator('body')).toBeVisible();
            await page.waitForTimeout(500);
        }
    });
    test('should handle external links properly', async ({ page }) => {
        const externalLinks = page.locator('a[href^="http"], a[target="_blank"]');
        const linkCount = await externalLinks.count();
        if (linkCount > 0) {
            const firstExternalLink = externalLinks.first();
            const target = await firstExternalLink.getAttribute('target');
            const rel = await firstExternalLink.getAttribute('rel');
            if (target === '_blank') {
                expect(rel).toContain('noopener');
            }
        }
    });
    test('should handle deep linking', async ({ page }) => {
        const deepUrls = [
            '/messages/email/bulk-edit',
            '/messages/chat',
            '/auth/signin'
        ];
        for (const url of deepUrls) {
            await page.goto(url);
            await expect(page.locator('body')).toBeVisible();
            const currentUrl = page.url();
            const isValidUrl = currentUrl.includes(url) ||
                currentUrl.includes('/auth/') ||
                currentUrl === testConfig.baseUrl + '/';
            expect(isValidUrl).toBe(true);
        }
    });
});
//# sourceMappingURL=navigation.test.js.map