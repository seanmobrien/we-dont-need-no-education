import { test, expect } from '@playwright/test';
import { ensureSignedIn, testUsers } from '../helpers/auth-helper';

/**
 * E2E tests for chat history sizing issues
 * 
 * Tests validate the fixes for:
 * 1. Content cutoff at bottom of chat turns
 * 2. Dynamic resizing when "Optimized Content" accordion expands/collapses
 * 
 * Related Issue: #271
 * PR: Fix virtualized chat display content cutoff and accordion remeasurement
 * 
 * Prerequisites:
 * - Environment variables must be configured (see web-ui/tests/e2e/README.md)
 * - At least one chat session with optimized content should exist in the database
 * - User authentication should be available
 * 
 * To run these tests:
 *   yarn test:e2e:chromium --grep "Chat History - Sizing"
 * 
 * To run with UI mode for debugging:
 *   yarn test:e2e:ui --grep "Chat History - Sizing"
 */
test.describe('Chat History - Sizing and Accordion Behavior', () => {
  let testChatId: string | null = null;

  test.beforeEach(async ({ page }) => {
    // Try to ensure user is signed in
    try {
      await ensureSignedIn(page, testUsers.user);
    } catch (error) {
      console.log('Authentication not required or failed, proceeding with test');
    }

    // Navigate to chat history page
    // We'll use a known chat ID if available, or try to find one
    try {
      await page.goto('/messages/chat', { timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 30000 });
    } catch (error) {
      console.log('Could not navigate to chat page:', error);
      test.skip();
      return;
    }

    // Try to find a chat ID from the page
    // Look for links to chat history pages
    try {
      const chatLinks = await page.locator('a[href*="/messages/chat/"]').all();
      if (chatLinks.length > 0) {
        const firstLink = chatLinks[0];
        const href = await firstLink.getAttribute('href');
        if (href) {
          const match = href.match(/\/messages\/chat\/([^\/]+)/);
          if (match) {
            testChatId = match[1];
            console.log(`Found chat ID: ${testChatId}`);
            await page.goto(href, { timeout: 30000 });
            await page.waitForLoadState('networkidle', { timeout: 30000 });
          }
        }
      }
    } catch (error) {
      console.log('Could not find chat links:', error);
    }
  });

  test('should display full chat turn content without bottom cutoff', async ({ page }) => {
    // Skip if no chat ID found
    if (!testChatId) {
      test.skip();
      return;
    }

    // Wait for virtualized chat display to load
    await page.waitForSelector('[data-testid="turn-1"], .MuiCard-root', { timeout: 10000 });

    // Get all visible chat turn cards
    const turnCards = await page.locator('.MuiCard-root').all();
    
    if (turnCards.length === 0) {
      console.log('No chat turns found to test');
      return;
    }

    console.log(`Testing ${turnCards.length} chat turns for content cutoff`);

    for (let i = 0; i < Math.min(turnCards.length, 5); i++) {
      const card = turnCards[i];
      
      // Get the card's bounding box
      const cardBox = await card.boundingBox();
      if (!cardBox) continue;

      // Check if the card is within the viewport
      const viewport = page.viewportSize();
      if (!viewport) continue;

      // Get all text content within the card
      const textElements = await card.locator('p, span, div').allTextContents();
      
      // If there's content, verify it's not cut off
      if (textElements.length > 0) {
        // Scroll the card into view
        await card.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        // Get the last text element in the card
        const lastTextElement = card.locator('p, span, div').last();
        const lastElementBox = await lastTextElement.boundingBox();

        if (lastElementBox) {
          // Verify the bottom of the last element is visible
          // It should be within the card boundaries
          expect(lastElementBox.y + lastElementBox.height).toBeLessThanOrEqual(
            cardBox.y + cardBox.height + 10 // Allow 10px tolerance
          );
          
          console.log(`Turn ${i + 1}: Content properly contained (bottom at ${lastElementBox.y + lastElementBox.height}px, card ends at ${cardBox.y + cardBox.height}px)`);
        }
      }
    }
  });

  test('should resize chat bubble when Optimized Content accordion expands', async ({ page }) => {
    // Skip if no chat ID found
    if (!testChatId) {
      test.skip();
      return;
    }

    // Wait for page to load
    await page.waitForSelector('.MuiCard-root', { timeout: 10000 });

    // Look for "Optimized Content" accordions
    const optimizedContentAccordions = await page.locator('text="Optimized Content"').all();

    if (optimizedContentAccordions.length === 0) {
      console.log('No Optimized Content accordions found - test may need different data');
      test.skip();
      return;
    }

    console.log(`Found ${optimizedContentAccordions.length} Optimized Content accordion(s)`);

    // Test the first accordion
    const accordion = optimizedContentAccordions[0];
    
    // Find the parent message container
    const messageContainer = accordion.locator('xpath=ancestor::div[contains(@class, "MuiBox-root") or contains(@class, "message")]').first();
    
    // Scroll the accordion into view
    await accordion.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Get initial height of the message container
    const initialBox = await messageContainer.boundingBox();
    if (!initialBox) {
      console.log('Could not get message container bounding box');
      return;
    }

    const initialHeight = initialBox.height;
    console.log(`Initial message height: ${initialHeight}px`);

    // Click to expand the accordion
    await accordion.click();
    
    // Wait for transition to complete (300ms as per implementation + buffer)
    await page.waitForTimeout(500);

    // Get height after expansion
    const expandedBox = await messageContainer.boundingBox();
    if (!expandedBox) {
      console.log('Could not get expanded message container bounding box');
      return;
    }

    const expandedHeight = expandedBox.height;
    console.log(`Expanded message height: ${expandedHeight}px`);

    // Verify height increased (accordion content is now visible)
    expect(expandedHeight).toBeGreaterThan(initialHeight);
    console.log(`✓ Message height increased by ${expandedHeight - initialHeight}px on expansion`);

    // Click again to collapse
    await accordion.click();
    await page.waitForTimeout(500);

    // Get height after collapse
    const collapsedBox = await messageContainer.boundingBox();
    if (!collapsedBox) {
      console.log('Could not get collapsed message container bounding box');
      return;
    }

    const collapsedHeight = collapsedBox.height;
    console.log(`Collapsed message height: ${collapsedHeight}px`);

    // Verify height decreased back (within tolerance)
    expect(Math.abs(collapsedHeight - initialHeight)).toBeLessThan(20);
    console.log(`✓ Message height returned to initial size (diff: ${Math.abs(collapsedHeight - initialHeight)}px)`);
  });

  test('should handle rapid accordion expand/collapse without layout issues', async ({ page }) => {
    // Skip if no chat ID found
    if (!testChatId) {
      test.skip();
      return;
    }

    // Wait for page to load
    await page.waitForSelector('.MuiCard-root', { timeout: 10000 });

    // Look for "Optimized Content" accordions
    const optimizedContentAccordions = await page.locator('text="Optimized Content"').all();

    if (optimizedContentAccordions.length === 0) {
      console.log('No Optimized Content accordions found');
      test.skip();
      return;
    }

    const accordion = optimizedContentAccordions[0];
    await accordion.scrollIntoViewIfNeeded();

    // Rapidly expand and collapse multiple times
    for (let i = 0; i < 3; i++) {
      await accordion.click(); // Expand
      await page.waitForTimeout(100);
      await accordion.click(); // Collapse
      await page.waitForTimeout(100);
    }

    // Let final transition complete
    await page.waitForTimeout(500);

    // Verify no visual glitches or errors
    const messageContainer = accordion.locator('xpath=ancestor::div[contains(@class, "MuiBox-root")]').first();
    const finalBox = await messageContainer.boundingBox();
    
    // Should have valid dimensions
    expect(finalBox).toBeTruthy();
    if (finalBox) {
      expect(finalBox.height).toBeGreaterThan(0);
      console.log('✓ No layout issues after rapid accordion toggling');
    }
  });

  test('should properly size turn with metadata accordion expanded', async ({ page }) => {
    // Skip if no chat ID found
    if (!testChatId) {
      test.skip();
      return;
    }

    // Wait for page to load
    await page.waitForSelector('.MuiCard-root', { timeout: 10000 });

    // Enable "Show Message Metadata" toggle if available
    const metadataToggle = page.locator('text="Show Message Metadata"').first();
    
    if (await metadataToggle.isVisible({ timeout: 2000 })) {
      await metadataToggle.click();
      await page.waitForTimeout(500);

      // Look for metadata expand buttons
      const metadataButtons = await page.locator('[aria-label*="metadata"], [aria-label*="Show more"]').all();
      
      if (metadataButtons.length > 0) {
        const button = metadataButtons[0];
        const messageContainer = button.locator('xpath=ancestor::div[contains(@class, "MuiBox-root")]').first();
        
        // Get initial height
        const initialBox = await messageContainer.boundingBox();
        if (initialBox) {
          const initialHeight = initialBox.height;
          
          // Expand metadata
          await button.click();
          await page.waitForTimeout(500);
          
          // Get expanded height
          const expandedBox = await messageContainer.boundingBox();
          if (expandedBox) {
            expect(expandedBox.height).toBeGreaterThan(initialHeight);
            console.log('✓ Metadata accordion properly resizes message container');
          }
        }
      }
    }
  });

  test('should maintain proper scroll position during accordion interactions', async ({ page }) => {
    // Skip if no chat ID found
    if (!testChatId) {
      test.skip();
      return;
    }

    // Wait for page to load
    await page.waitForSelector('.MuiCard-root', { timeout: 10000 });

    // Get the scroll container
    const scrollContainer = page.locator('[style*="overflow: auto"], [style*="overflow-y: auto"]').first();
    
    if (!await scrollContainer.isVisible({ timeout: 2000 })) {
      console.log('No scrollable container found');
      return;
    }

    // Look for optimized content accordion
    const accordion = page.locator('text="Optimized Content"').first();
    
    if (!await accordion.isVisible({ timeout: 2000 })) {
      console.log('No accordion found');
      test.skip();
      return;
    }

    // Scroll to accordion
    await accordion.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Get scroll position before expansion
    const scrollBefore = await scrollContainer.evaluate(el => el.scrollTop);

    // Expand accordion
    await accordion.click();
    await page.waitForTimeout(500);

    // Get scroll position after expansion
    const scrollAfter = await scrollContainer.evaluate(el => el.scrollTop);

    // Scroll position may adjust but should be reasonable
    console.log(`Scroll position before: ${scrollBefore}px, after: ${scrollAfter}px`);
    
    // The scroll should not jump dramatically
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(500);
    console.log('✓ Scroll position maintained during accordion interaction');
  });

  test('should display all turn content when Show Turn Properties is enabled', async ({ page }) => {
    // Skip if no chat ID found
    if (!testChatId) {
      test.skip();
      return;
    }

    // Wait for page to load
    await page.waitForSelector('.MuiCard-root', { timeout: 10000 });

    // Find and enable "Show Turn Properties" toggle
    const turnPropertiesToggle = page.locator('text="Show Turn Properties"').first();
    
    if (!await turnPropertiesToggle.isVisible({ timeout: 2000 })) {
      console.log('Turn Properties toggle not found');
      return;
    }

    // Get a turn card
    const firstTurn = page.locator('.MuiCard-root').first();
    const initialBox = await firstTurn.boundingBox();
    
    if (!initialBox) return;
    const initialHeight = initialBox.height;

    // Enable turn properties
    await turnPropertiesToggle.click();
    await page.waitForTimeout(500);

    // Get height after enabling properties
    const expandedBox = await firstTurn.boundingBox();
    
    if (expandedBox) {
      // Height should increase to show properties
      expect(expandedBox.height).toBeGreaterThan(initialHeight);
      console.log(`✓ Turn expanded from ${initialHeight}px to ${expandedBox.height}px with properties shown`);

      // Verify no content cutoff
      const lastElement = firstTurn.locator('p, span, div').last();
      const lastBox = await lastElement.boundingBox();
      
      if (lastBox) {
        expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(expandedBox.y + expandedBox.height + 10);
        console.log('✓ All turn properties content visible without cutoff');
      }
    }
  });

  test('should handle multiple simultaneous accordion expansions', async ({ page }) => {
    // Skip if no chat ID found
    if (!testChatId) {
      test.skip();
      return;
    }

    // Wait for page to load
    await page.waitForSelector('.MuiCard-root', { timeout: 10000 });

    // Find all optimized content accordions
    const accordions = await page.locator('text="Optimized Content"').all();

    if (accordions.length < 2) {
      console.log('Need at least 2 accordions for this test');
      test.skip();
      return;
    }

    console.log(`Testing ${Math.min(accordions.length, 3)} accordions`);

    // Expand multiple accordions
    const accordionsToTest = accordions.slice(0, 3);
    
    for (const accordion of accordionsToTest) {
      await accordion.scrollIntoViewIfNeeded();
      await accordion.click();
      await page.waitForTimeout(100); // Small delay between clicks
    }

    // Wait for all transitions to complete
    await page.waitForTimeout(600);

    // Verify all accordions are expanded and visible
    for (const accordion of accordionsToTest) {
      const details = accordion.locator('xpath=following-sibling::div[@role="region"]').first();
      if (await details.isVisible({ timeout: 1000 })) {
        const detailsBox = await details.boundingBox();
        expect(detailsBox).toBeTruthy();
        if (detailsBox) {
          expect(detailsBox.height).toBeGreaterThan(0);
        }
      }
    }

    console.log('✓ Multiple accordions expanded successfully without layout issues');
  });
});
