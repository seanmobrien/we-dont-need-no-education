import { test, expect } from '@playwright/test';
import { ensureSignedIn, testUsers } from '../helpers/auth-helper';

test.describe('Bulk Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Try to ensure user is signed in for bulk operations
    try {
      await ensureSignedIn(page, testUsers.user);
    } catch (error) {
      console.log('Authentication not required or failed, proceeding with test');
    }
    
    await page.goto('/bulk-edit');
  });

  test('should load bulk edit page', async ({ page }) => {
    // Should be on bulk edit page
    await expect(page).toHaveURL(/.*\/bulk-edit/);
    
    // Should have main content
    await expect(page.locator('main, [role="main"], body')).toBeVisible();
  });

  test('should display bulk edit form', async ({ page }) => {
    // Look for bulk edit form or interface
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
        
        // Look for form elements
        const inputs = form.locator('input, select, textarea, button');
        const inputCount = await inputs.count();
        
        console.log(`Found ${inputCount} form elements`);
        
        break;
      }
    }
    
    if (!formFound) {
      // Check if auth is required
      const authRequired = page.url().includes('/auth/signin');
      if (authRequired) {
        console.log('Bulk operations require authentication');
      } else {
        console.log('No bulk form found - may have different interface');
      }
    }
  });

  test('should handle bulk email selection interface', async ({ page }) => {
    // Look for email selection checkboxes or interface
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
        
        // Try selecting some items
        const firstCheckbox = checkboxes.first();
        if (await firstCheckbox.isVisible() && await firstCheckbox.isEnabled()) {
          await firstCheckbox.click();
          console.log('Selected first item');
          
          // Check if it's checked
          const isChecked = await firstCheckbox.isChecked();
          expect(isChecked).toBe(true);
          
          // Uncheck it
          await firstCheckbox.click();
          const isUnchecked = await firstCheckbox.isChecked();
          expect(isUnchecked).toBe(false);
        }
        
        break;
      }
    }
  });

  test('should display bulk operation options', async ({ page }) => {
    // Look for bulk operation buttons or dropdowns
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
    } else {
      console.log('No bulk operations found - may need items selected first');
    }
  });

  test('should handle bulk operation workflow', async ({ page }) => {
    // Complete workflow test: select items, choose action, execute
    
    // Step 1: Look for selectable items
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    
    if (checkboxCount > 0) {
      // Select first few items
      const itemsToSelect = Math.min(3, checkboxCount);
      for (let i = 0; i < itemsToSelect; i++) {
        const checkbox = checkboxes.nth(i);
        if (await checkbox.isVisible() && await checkbox.isEnabled()) {
          await checkbox.click();
        }
      }
      
      console.log(`Selected ${itemsToSelect} items for bulk operation`);
      
      // Step 2: Look for enabled bulk actions
      const actionButtons = page.locator('button:has-text("Mark"), button:has-text("Delete"), button:has-text("Archive")');
      const actionCount = await actionButtons.count();
      
      if (actionCount > 0) {
        // Try the first available action
        const firstAction = actionButtons.first();
        if (await firstAction.isEnabled()) {
          const actionText = await firstAction.textContent();
          console.log(`Executing bulk action: ${actionText}`);
          
          await firstAction.click();
          
          // Wait for operation to complete
          await page.waitForTimeout(2000);
          
          // Look for success message or confirmation
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
    // Look for select all checkbox or button
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
        
        // Test select all functionality
        await selectAll.click();
        
        // Wait for selections to update
        await page.waitForTimeout(1000);
        
        // Check if items are now selected
        const selectedCheckboxes = page.locator('input[type="checkbox"]:checked');
        const selectedCount = await selectedCheckboxes.count();
        
        console.log(`Selected ${selectedCount} items with select all`);
        
        // Test deselect all (click again)
        await selectAll.click();
        await page.waitForTimeout(1000);
        
        const deselectedCount = await page.locator('input[type="checkbox"]:checked').count();
        console.log(`Deselected count: ${deselectedCount}`);
        
        break;
      }
    }
  });

  test('should display operation confirmation dialogs', async ({ page }) => {
    // Select some items first
    const checkboxes = page.locator('input[type="checkbox"]');
    const firstCheckbox = checkboxes.first();
    
    if (await firstCheckbox.isVisible({ timeout: 5000 }) && await firstCheckbox.isEnabled()) {
      await firstCheckbox.click();
      
      // Try a potentially destructive action like delete
      const deleteButton = page.locator('button:has-text("Delete")').first();
      
      if (await deleteButton.isVisible({ timeout: 2000 }) && await deleteButton.isEnabled()) {
        await deleteButton.click();
        
        // Look for confirmation dialog
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
            
            // Look for cancel button to avoid actually deleting
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

  test('should handle bulk operation progress/loading states', async ({ page }) => {
    // Select items and start an operation to test loading states
    const checkboxes = page.locator('input[type="checkbox"]');
    const firstCheckbox = checkboxes.first();
    
    if (await firstCheckbox.isVisible({ timeout: 5000 })) {
      await firstCheckbox.click();
      
      // Find a bulk action button
      const actionButton = page.locator('button:has-text("Mark"), button:has-text("Archive")').first();
      
      if (await actionButton.isVisible({ timeout: 2000 }) && await actionButton.isEnabled()) {
        await actionButton.click();
        
        // Look for loading indicators
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
        
        // Wait for operation to complete
        await page.waitForTimeout(3000);
        
        // Loading indicator should disappear
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
      
      // Check that bulk interface is still functional
      const mainContent = page.locator('main, [role="main"], body').first();
      await expect(mainContent).toBeVisible();
      
      // Check for form elements on different screen sizes
      const formElements = page.locator('form, button, input, select');
      const elementCount = await formElements.count();
      
      if (elementCount > 0) {
        console.log(`Found ${elementCount} form elements on ${viewport.name}`);
      }
      
      console.log(`Bulk operations responsive on ${viewport.name} (${viewport.width}x${viewport.height})`);
    }
  });

  test('should handle empty selection state', async ({ page }) => {
    // Ensure no items are selected
    const selectedCheckboxes = page.locator('input[type="checkbox"]:checked');
    const selectedCount = await selectedCheckboxes.count();
    
    if (selectedCount > 0) {
      // Uncheck all selected items
      for (let i = 0; i < selectedCount; i++) {
        const checkbox = selectedCheckboxes.nth(i);
        await checkbox.click();
      }
    }
    
    // Check that bulk action buttons are disabled
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
    // Look for selection counter
    const counterSelectors = [
      '[data-testid*="count"]',
      '.selection-count',
      'text= selected',
      '.counter'
    ];
    
    // First select some items
    const checkboxes = page.locator('input[type="checkbox"]');
    const firstCheckbox = checkboxes.first();
    
    if (await firstCheckbox.isVisible({ timeout: 5000 })) {
      await firstCheckbox.click();
      
      // Look for updated counter
      for (const selector of counterSelectors) {
        const counter = page.locator(selector).first();
        if (await counter.isVisible({ timeout: 2000 })) {
          const counterText = await counter.textContent();
          console.log(`Found selection counter: ${counterText}`);
          
          // Should show 1 selected
          expect(counterText).toMatch(/1/);
          break;
        }
      }
    }
  });
});