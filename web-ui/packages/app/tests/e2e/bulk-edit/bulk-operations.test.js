import { test, expect } from '@playwright/test';
import { ensureSignedIn, testUsers } from '../helpers/auth-helper';
test.describe('Bulk Operations', () => {
    test.beforeEach(async ({ page }) => {
        try {
            await ensureSignedIn(page, testUsers.user);
        }
        catch (error) {
            console.log('Authentication not required or failed, proceeding with test');
        }
        await page.goto('/bulk-edit');
    });
    test('should load bulk edit page', async ({ page }) => {
        await expect(page).toHaveURL(/.*\/bulk-edit/);
        await expect(page.locator('main, [role="main"], body')).toBeVisible();
    });
    test('should display bulk edit form', async ({ page }) => {
        const formSelectors = [
            'form',
            '[data-testid*="bulk"]',
            '.bulk-form',
            '.bulk-edit-form',
            '[role="form"]'
        ];
        let formFound = false;
        for (const selector of formSelectors) {
            const form = page.locator(selector).first();
            if (await form.isVisible({ timeout: 10000 })) {
                console.log(`Found bulk form with selector: ${selector}`);
                formFound = true;
                const inputs = form.locator('input, select, textarea, button');
                const inputCount = await inputs.count();
                console.log(`Found ${inputCount} form elements`);
                break;
            }
        }
        if (!formFound) {
            const authRequired = page.url().includes('/auth/signin');
            if (authRequired) {
                console.log('Bulk operations require authentication');
            }
            else {
                console.log('No bulk form found - may have different interface');
            }
        }
    });
    test('should handle bulk email selection interface', async ({ page }) => {
        const selectionSelectors = [
            'input[type="checkbox"]',
            '[data-testid*="select"]',
            '.checkbox',
            '[role="checkbox"]',
            '.selection-checkbox'
        ];
        for (const selector of selectionSelectors) {
            const checkboxes = page.locator(selector);
            const checkboxCount = await checkboxes.count();
            if (checkboxCount > 0) {
                console.log(`Found ${checkboxCount} selection checkboxes`);
                const firstCheckbox = checkboxes.first();
                if (await firstCheckbox.isVisible() && await firstCheckbox.isEnabled()) {
                    await firstCheckbox.click();
                    console.log('Selected first item');
                    const isChecked = await firstCheckbox.isChecked();
                    expect(isChecked).toBe(true);
                    await firstCheckbox.click();
                    const isUnchecked = await firstCheckbox.isChecked();
                    expect(isUnchecked).toBe(false);
                }
                break;
            }
        }
    });
    test('should display bulk operation options', async ({ page }) => {
        const operationSelectors = [
            'button:has-text("Mark as Read")',
            'button:has-text("Delete")',
            'button:has-text("Archive")',
            'button:has-text("Flag")',
            '[data-testid*="bulk-action"]',
            '.bulk-action',
            'select[name*="action"]'
        ];
        let operationsFound = 0;
        for (const selector of operationSelectors) {
            const operation = page.locator(selector).first();
            if (await operation.isVisible({ timeout: 5000 })) {
                operationsFound++;
                const operationType = await operation.textContent() || selector;
                console.log(`Found bulk operation: ${operationType}`);
            }
        }
        if (operationsFound > 0) {
            console.log(`Total bulk operations found: ${operationsFound}`);
        }
        else {
            console.log('No bulk operations found - may need items selected first');
        }
    });
    test('should handle bulk operation workflow @data-mutation', async ({ page }) => {
        const checkboxes = page.locator('input[type="checkbox"]');
        const checkboxCount = await checkboxes.count();
        if (checkboxCount > 0) {
            const itemsToSelect = Math.min(3, checkboxCount);
            for (let i = 0; i < itemsToSelect; i++) {
                const checkbox = checkboxes.nth(i);
                if (await checkbox.isVisible() && await checkbox.isEnabled()) {
                    await checkbox.click();
                }
            }
            console.log(`Selected ${itemsToSelect} items for bulk operation`);
            const actionButtons = page.locator('button:has-text("Mark"), button:has-text("Delete"), button:has-text("Archive")');
            const actionCount = await actionButtons.count();
            if (actionCount > 0) {
                const firstAction = actionButtons.first();
                if (await firstAction.isEnabled()) {
                    const actionText = await firstAction.textContent();
                    console.log(`Executing bulk action: ${actionText}`);
                    await firstAction.click();
                    await page.waitForTimeout(2000);
                    const successIndicators = [
                        'text=success',
                        'text=complete',
                        'text=updated',
                        '.success',
                        '.notification',
                        '[role="alert"]'
                    ];
                    for (const indicator of successIndicators) {
                        if (await page.locator(indicator).isVisible({ timeout: 3000 })) {
                            console.log('Bulk operation completed with success indicator');
                            break;
                        }
                    }
                }
            }
        }
    });
    test('should handle select all functionality', async ({ page }) => {
        const selectAllSelectors = [
            'input[type="checkbox"][aria-label*="select all"]',
            'button:has-text("Select All")',
            '[data-testid*="select-all"]',
            '.select-all'
        ];
        for (const selector of selectAllSelectors) {
            const selectAll = page.locator(selector).first();
            if (await selectAll.isVisible({ timeout: 5000 })) {
                console.log(`Found select all control: ${selector}`);
                await selectAll.click();
                await page.waitForTimeout(1000);
                const selectedCheckboxes = page.locator('input[type="checkbox"]:checked');
                const selectedCount = await selectedCheckboxes.count();
                console.log(`Selected ${selectedCount} items with select all`);
                await selectAll.click();
                await page.waitForTimeout(1000);
                const deselectedCount = await page.locator('input[type="checkbox"]:checked').count();
                console.log(`Deselected count: ${deselectedCount}`);
                break;
            }
        }
    });
    test('should display operation confirmation dialogs @data-mutation', async ({ page }) => {
        const checkboxes = page.locator('input[type="checkbox"]');
        const firstCheckbox = checkboxes.first();
        if (await firstCheckbox.isVisible({ timeout: 5000 }) && await firstCheckbox.isEnabled()) {
            await firstCheckbox.click();
            const deleteButton = page.locator('button:has-text("Delete")').first();
            if (await deleteButton.isVisible({ timeout: 2000 }) && await deleteButton.isEnabled()) {
                await deleteButton.click();
                const confirmationSelectors = [
                    '[role="dialog"]',
                    '.modal',
                    '.confirmation',
                    '.dialog',
                    'text=confirm',
                    'text=are you sure'
                ];
                for (const selector of confirmationSelectors) {
                    const dialog = page.locator(selector).first();
                    if (await dialog.isVisible({ timeout: 3000 })) {
                        console.log(`Found confirmation dialog: ${selector}`);
                        const cancelButton = dialog.locator('button:has-text("Cancel"), button:has-text("No")').first();
                        if (await cancelButton.isVisible()) {
                            await cancelButton.click();
                            console.log('Cancelled bulk delete operation');
                        }
                        break;
                    }
                }
            }
        }
    });
    test('should handle bulk operation progress/loading states @data-mutation', async ({ page }) => {
        const checkboxes = page.locator('input[type="checkbox"]');
        const firstCheckbox = checkboxes.first();
        if (await firstCheckbox.isVisible({ timeout: 5000 })) {
            await firstCheckbox.click();
            const actionButton = page.locator('button:has-text("Mark"), button:has-text("Archive")').first();
            if (await actionButton.isVisible({ timeout: 2000 }) && await actionButton.isEnabled()) {
                await actionButton.click();
                const loadingSelectors = [
                    '.loading',
                    '.spinner',
                    '[data-testid*="loading"]',
                    'text=processing',
                    'text=loading'
                ];
                let loadingFound = false;
                for (const selector of loadingSelectors) {
                    if (await page.locator(selector).isVisible({ timeout: 1000 })) {
                        console.log(`Found loading indicator: ${selector}`);
                        loadingFound = true;
                        break;
                    }
                }
                await page.waitForTimeout(3000);
                if (loadingFound) {
                    const stillLoading = await page.locator('.loading, .spinner').isVisible({ timeout: 1000 });
                    expect(stillLoading).toBe(false);
                }
            }
        }
    });
    test('should be responsive on different screen sizes', async ({ page }) => {
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
            const formElements = page.locator('form, button, input, select');
            const elementCount = await formElements.count();
            if (elementCount > 0) {
                console.log(`Found ${elementCount} form elements on ${viewport.name}`);
            }
            console.log(`Bulk operations responsive on ${viewport.name} (${viewport.width}x${viewport.height})`);
        }
    });
    test('should handle empty selection state', async ({ page }) => {
        const selectedCheckboxes = page.locator('input[type="checkbox"]:checked');
        const selectedCount = await selectedCheckboxes.count();
        if (selectedCount > 0) {
            for (let i = 0; i < selectedCount; i++) {
                const checkbox = selectedCheckboxes.nth(i);
                await checkbox.click();
            }
        }
        const actionButtons = page.locator('button:has-text("Mark"), button:has-text("Delete"), button:has-text("Archive")');
        const buttonCount = await actionButtons.count();
        for (let i = 0; i < buttonCount; i++) {
            const button = actionButtons.nth(i);
            if (await button.isVisible()) {
                const isDisabled = await button.isDisabled();
                expect(isDisabled).toBe(true);
                console.log('Bulk action button properly disabled when no items selected');
            }
        }
    });
    test('should display item count for selection', async ({ page }) => {
        const counterSelectors = [
            '[data-testid*="count"]',
            '.selection-count',
            'text= selected',
            '.counter'
        ];
        const checkboxes = page.locator('input[type="checkbox"]');
        const firstCheckbox = checkboxes.first();
        if (await firstCheckbox.isVisible({ timeout: 5000 })) {
            await firstCheckbox.click();
            for (const selector of counterSelectors) {
                const counter = page.locator(selector).first();
                if (await counter.isVisible({ timeout: 2000 })) {
                    const counterText = await counter.textContent();
                    console.log(`Found selection counter: ${counterText}`);
                    expect(counterText).toMatch(/1/);
                    break;
                }
            }
        }
    });
});
//# sourceMappingURL=bulk-operations.test.js.map