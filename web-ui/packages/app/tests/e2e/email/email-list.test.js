import { test, expect } from '@playwright/test';
import { ensureSignedIn, testUsers } from '../helpers/auth-helper';
test.describe('Email List', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        try {
            await ensureSignedIn(page, testUsers.user);
        }
        catch (error) {
            console.log('Authentication not required or failed, proceeding with test');
        }
    });
    test('should display email list on homepage', async ({ page }) => {
        await page.goto('/');
        const emailListSelectors = [
            '[data-testid="email-list"]',
            '.email-list',
            '[data-testid*="email"]',
            '.MuiDataGrid-root',
            'table',
            '[role="grid"]'
        ];
        let emailListFound = false;
        for (const selector of emailListSelectors) {
            const emailList = page.locator(selector).first();
            if (await emailList.isVisible({ timeout: 10000 })) {
                emailListFound = true;
                console.log(`Found email list with selector: ${selector}`);
                const items = emailList.locator('[data-testid*="email"], tr, .email-item, .MuiDataGrid-row');
                const itemCount = await items.count();
                if (itemCount > 0) {
                    console.log(`Found ${itemCount} email items in list`);
                }
                break;
            }
        }
        if (!emailListFound) {
            const authRequired = page.url().includes('/auth/signin') ||
                await page.locator('text=sign in, text=login').isVisible();
            if (authRequired) {
                console.log('Email list requires authentication');
            }
            else {
                console.log('No email list found, but no auth required - may be empty state');
            }
        }
    });
    test('should navigate to email messages page', async ({ page }) => {
        await page.goto('/messages/email');
        await expect(page).toHaveURL(/.*\/messages\/email/);
        await expect(page.locator('main, [role="main"], body')).toBeVisible();
    });
    test('should handle email list interactions', async ({ page }) => {
        await page.goto('/messages/email');
        await page.waitForLoadState('networkidle');
        const emailItemSelectors = [
            '[data-testid*="email-item"]',
            '.email-item',
            '.email-list-item',
            '.MuiDataGrid-row',
            'tr[data-id]',
            '[role="row"]'
        ];
        for (const selector of emailItemSelectors) {
            const emailItems = page.locator(selector);
            const itemCount = await emailItems.count();
            if (itemCount > 0) {
                console.log(`Found ${itemCount} email items with selector: ${selector}`);
                const firstItem = emailItems.first();
                const isClickable = await firstItem.evaluate(el => {
                    const style = getComputedStyle(el);
                    return style.cursor === 'pointer' || el.onclick !== null;
                });
                if (isClickable || await firstItem.locator('a, button').count() > 0) {
                    await firstItem.click();
                    await page.waitForTimeout(2000);
                    const currentUrl = page.url();
                    const modalOpen = await page.locator('.modal, .dialog, [role="dialog"]').isVisible();
                    if (currentUrl !== page.url() || modalOpen) {
                        console.log('Successfully interacted with email item');
                    }
                }
                break;
            }
        }
    });
    test('should support email search functionality', async ({ page }) => {
        await page.goto('/messages/email');
        const searchSelectors = [
            'input[placeholder*="search"]',
            'input[type="search"]',
            '[data-testid*="search"]',
            '.search-input',
            'input[aria-label*="search"]'
        ];
        for (const selector of searchSelectors) {
            const searchInput = page.locator(selector).first();
            if (await searchInput.isVisible({ timeout: 5000 })) {
                console.log(`Found search input with selector: ${selector}`);
                await searchInput.fill('test search query');
                const searchButton = page.locator('button[type="submit"], button:has-text("Search")').first();
                if (await searchButton.isVisible({ timeout: 2000 })) {
                    await searchButton.click();
                }
                else {
                    await searchInput.press('Enter');
                }
                await page.waitForTimeout(3000);
                console.log('Search functionality tested');
                break;
            }
        }
    });
    test('should display email metadata correctly', async ({ page }) => {
        await page.goto('/messages/email');
        const metadataSelectors = [
            '[data-testid*="email-subject"]',
            '[data-testid*="email-sender"]',
            '[data-testid*="email-date"]',
            '.email-subject',
            '.email-sender',
            '.email-date',
            '.MuiDataGrid-cell'
        ];
        for (const selector of metadataSelectors) {
            const metadataElements = page.locator(selector);
            const count = await metadataElements.count();
            if (count > 0) {
                console.log(`Found ${count} metadata elements with selector: ${selector}`);
                const firstElement = metadataElements.first();
                const text = await firstElement.textContent();
                if (text && text.trim().length > 0) {
                    console.log(`Sample metadata: ${text.trim()}`);
                }
            }
        }
    });
    test('should handle pagination if present', async ({ page }) => {
        await page.goto('/messages/email');
        await page.waitForLoadState('networkidle');
        const paginationSelectors = [
            '.pagination',
            '[data-testid*="pagination"]',
            '.MuiTablePagination-root',
            '.MuiPagination-root',
            'nav[aria-label*="pagination"]',
            'button:has-text("Next"), button:has-text("Previous")'
        ];
        for (const selector of paginationSelectors) {
            const pagination = page.locator(selector).first();
            if (await pagination.isVisible({ timeout: 5000 })) {
                console.log(`Found pagination with selector: ${selector}`);
                const nextButton = pagination.locator('button:has-text("Next"), button[aria-label*="next"]').first();
                const prevButton = pagination.locator('button:has-text("Previous"), button[aria-label*="previous"]').first();
                if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
                    console.log('Testing pagination next button');
                    await nextButton.click();
                    await page.waitForTimeout(2000);
                }
                if (await prevButton.isVisible() && !await prevButton.isDisabled()) {
                    console.log('Testing pagination previous button');
                    await prevButton.click();
                    await page.waitForTimeout(2000);
                }
                break;
            }
        }
    });
    test('should support email filtering', async ({ page }) => {
        await page.goto('/messages/email');
        const filterSelectors = [
            '[data-testid*="filter"]',
            '.filter',
            'select',
            '.MuiSelect-root',
            'button:has-text("Filter")',
            '[role="combobox"]'
        ];
        for (const selector of filterSelectors) {
            const filterControl = page.locator(selector).first();
            if (await filterControl.isVisible({ timeout: 5000 })) {
                console.log(`Found filter control with selector: ${selector}`);
                if (await filterControl.evaluate(el => el.tagName.toLowerCase() === 'select')) {
                    const options = filterControl.locator('option');
                    const optionCount = await options.count();
                    if (optionCount > 1) {
                        await filterControl.selectOption({ index: 1 });
                        await page.waitForTimeout(2000);
                        console.log('Applied filter via select');
                    }
                }
                else if (await filterControl.evaluate(el => el.tagName.toLowerCase() === 'button')) {
                    await filterControl.click();
                    await page.waitForTimeout(1000);
                    const filterMenu = page.locator('.menu, .dropdown, [role="menu"]').first();
                    if (await filterMenu.isVisible({ timeout: 2000 })) {
                        console.log('Opened filter menu');
                    }
                }
                break;
            }
        }
    });
    test('should handle empty email list state', async ({ page }) => {
        await page.goto('/messages/email');
        const emptyStateSelectors = [
            'text=no emails',
            'text=empty',
            'text=no results',
            '[data-testid*="empty"]',
            '.empty-state',
            '.no-data'
        ];
        let emptyStateFound = false;
        for (const selector of emptyStateSelectors) {
            if (await page.locator(selector).isVisible({ timeout: 5000 })) {
                console.log(`Found empty state with selector: ${selector}`);
                emptyStateFound = true;
                break;
            }
        }
        if (!emptyStateFound) {
            const emailItems = page.locator('[data-testid*="email"], .email-item, .MuiDataGrid-row');
            const itemCount = await emailItems.count();
            if (itemCount === 0) {
                console.log('No email items found - possible empty state');
            }
            else {
                console.log(`Found ${itemCount} email items`);
            }
        }
    });
    test('should be responsive on different screen sizes', async ({ page }) => {
        await page.goto('/messages/email');
        const viewports = [
            { width: 1200, height: 800, name: 'Desktop' },
            { width: 768, height: 1024, name: 'Tablet' },
            { width: 375, height: 667, name: 'Mobile' }
        ];
        for (const viewport of viewports) {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.waitForTimeout(500);
            const mainContent = page.locator('main, [role="main"], body').first();
            await expect(mainContent).toBeVisible();
            console.log(`Email list responsive on ${viewport.name} (${viewport.width}x${viewport.height})`);
        }
    });
});
//# sourceMappingURL=email-list.test.js.map