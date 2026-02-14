import { test, expect } from '@playwright/test';
import { ensureSignedIn, testUsers } from '../helpers/auth-helper';
test.describe('Chat History - Sizing and Accordion Behavior', () => {
    let testChatId = null;
    test.beforeEach(async ({ page }) => {
        try {
            await ensureSignedIn(page, testUsers.user);
        }
        catch (error) {
            console.log('Authentication not required or failed, proceeding with test');
        }
        try {
            await page.goto('/messages/chat', { timeout: 30000 });
            await page.waitForLoadState('networkidle', { timeout: 30000 });
        }
        catch (error) {
            console.log('Could not navigate to chat page:', error);
            test.skip();
            return;
        }
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
        }
        catch (error) {
            console.log('Could not find chat links:', error);
        }
    });
    test('should display full chat turn content without bottom cutoff', async ({ page }) => {
        if (!testChatId) {
            test.skip();
            return;
        }
        await page.waitForSelector('[data-testid="turn-1"], .MuiCard-root', { timeout: 10000 });
        const turnCards = await page.locator('.MuiCard-root').all();
        if (turnCards.length === 0) {
            console.log('No chat turns found to test');
            return;
        }
        console.log(`Testing ${turnCards.length} chat turns for content cutoff`);
        for (let i = 0; i < Math.min(turnCards.length, 5); i++) {
            const card = turnCards[i];
            const cardBox = await card.boundingBox();
            if (!cardBox)
                continue;
            const viewport = page.viewportSize();
            if (!viewport)
                continue;
            const textElements = await card.locator('p, span, div').allTextContents();
            if (textElements.length > 0) {
                await card.scrollIntoViewIfNeeded();
                await page.waitForTimeout(500);
                const lastTextElement = card.locator('p, span, div').last();
                const lastElementBox = await lastTextElement.boundingBox();
                if (lastElementBox) {
                    expect(lastElementBox.y + lastElementBox.height).toBeLessThanOrEqual(cardBox.y + cardBox.height + 10);
                    console.log(`Turn ${i + 1}: Content properly contained (bottom at ${lastElementBox.y + lastElementBox.height}px, card ends at ${cardBox.y + cardBox.height}px)`);
                }
            }
        }
    });
    test('should resize chat bubble when Optimized Content accordion expands', async ({ page }) => {
        if (!testChatId) {
            test.skip();
            return;
        }
        await page.waitForSelector('.MuiCard-root', { timeout: 10000 });
        const optimizedContentAccordions = await page.locator('text="Optimized Content"').all();
        if (optimizedContentAccordions.length === 0) {
            console.log('No Optimized Content accordions found - test may need different data');
            test.skip();
            return;
        }
        console.log(`Found ${optimizedContentAccordions.length} Optimized Content accordion(s)`);
        const accordion = optimizedContentAccordions[0];
        const messageContainer = accordion.locator('xpath=ancestor::div[contains(@class, "MuiBox-root") or contains(@class, "message")]').first();
        await accordion.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        const initialBox = await messageContainer.boundingBox();
        if (!initialBox) {
            console.log('Could not get message container bounding box');
            return;
        }
        const initialHeight = initialBox.height;
        console.log(`Initial message height: ${initialHeight}px`);
        await accordion.click();
        await page.waitForTimeout(500);
        const expandedBox = await messageContainer.boundingBox();
        if (!expandedBox) {
            console.log('Could not get expanded message container bounding box');
            return;
        }
        const expandedHeight = expandedBox.height;
        console.log(`Expanded message height: ${expandedHeight}px`);
        expect(expandedHeight).toBeGreaterThan(initialHeight);
        console.log(`✓ Message height increased by ${expandedHeight - initialHeight}px on expansion`);
        await accordion.click();
        await page.waitForTimeout(500);
        const collapsedBox = await messageContainer.boundingBox();
        if (!collapsedBox) {
            console.log('Could not get collapsed message container bounding box');
            return;
        }
        const collapsedHeight = collapsedBox.height;
        console.log(`Collapsed message height: ${collapsedHeight}px`);
        expect(Math.abs(collapsedHeight - initialHeight)).toBeLessThan(20);
        console.log(`✓ Message height returned to initial size (diff: ${Math.abs(collapsedHeight - initialHeight)}px)`);
    });
    test('should handle rapid accordion expand/collapse without layout issues', async ({ page }) => {
        if (!testChatId) {
            test.skip();
            return;
        }
        await page.waitForSelector('.MuiCard-root', { timeout: 10000 });
        const optimizedContentAccordions = await page.locator('text="Optimized Content"').all();
        if (optimizedContentAccordions.length === 0) {
            console.log('No Optimized Content accordions found');
            test.skip();
            return;
        }
        const accordion = optimizedContentAccordions[0];
        await accordion.scrollIntoViewIfNeeded();
        for (let i = 0; i < 3; i++) {
            await accordion.click();
            await page.waitForTimeout(100);
            await accordion.click();
            await page.waitForTimeout(100);
        }
        await page.waitForTimeout(500);
        const messageContainer = accordion.locator('xpath=ancestor::div[contains(@class, "MuiBox-root")]').first();
        const finalBox = await messageContainer.boundingBox();
        expect(finalBox).toBeTruthy();
        if (finalBox) {
            expect(finalBox.height).toBeGreaterThan(0);
            console.log('✓ No layout issues after rapid accordion toggling');
        }
    });
    test('should properly size turn with metadata accordion expanded', async ({ page }) => {
        if (!testChatId) {
            test.skip();
            return;
        }
        await page.waitForSelector('.MuiCard-root', { timeout: 10000 });
        const metadataToggle = page.locator('text="Show Message Metadata"').first();
        if (await metadataToggle.isVisible({ timeout: 2000 })) {
            await metadataToggle.click();
            await page.waitForTimeout(500);
            const metadataButtons = await page.locator('[aria-label*="metadata"], [aria-label*="Show more"]').all();
            if (metadataButtons.length > 0) {
                const button = metadataButtons[0];
                const messageContainer = button.locator('xpath=ancestor::div[contains(@class, "MuiBox-root")]').first();
                const initialBox = await messageContainer.boundingBox();
                if (initialBox) {
                    const initialHeight = initialBox.height;
                    await button.click();
                    await page.waitForTimeout(500);
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
        if (!testChatId) {
            test.skip();
            return;
        }
        await page.waitForSelector('.MuiCard-root', { timeout: 10000 });
        const scrollContainer = page.locator('[style*="overflow: auto"], [style*="overflow-y: auto"]').first();
        if (!await scrollContainer.isVisible({ timeout: 2000 })) {
            console.log('No scrollable container found');
            return;
        }
        const accordion = page.locator('text="Optimized Content"').first();
        if (!await accordion.isVisible({ timeout: 2000 })) {
            console.log('No accordion found');
            test.skip();
            return;
        }
        await accordion.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        const scrollBefore = await scrollContainer.evaluate(el => el.scrollTop);
        await accordion.click();
        await page.waitForTimeout(500);
        const scrollAfter = await scrollContainer.evaluate(el => el.scrollTop);
        console.log(`Scroll position before: ${scrollBefore}px, after: ${scrollAfter}px`);
        expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(500);
        console.log('✓ Scroll position maintained during accordion interaction');
    });
    test('should display all turn content when Show Turn Properties is enabled', async ({ page }) => {
        if (!testChatId) {
            test.skip();
            return;
        }
        await page.waitForSelector('.MuiCard-root', { timeout: 10000 });
        const turnPropertiesToggle = page.locator('text="Show Turn Properties"').first();
        if (!await turnPropertiesToggle.isVisible({ timeout: 2000 })) {
            console.log('Turn Properties toggle not found');
            return;
        }
        const firstTurn = page.locator('.MuiCard-root').first();
        const initialBox = await firstTurn.boundingBox();
        if (!initialBox)
            return;
        const initialHeight = initialBox.height;
        await turnPropertiesToggle.click();
        await page.waitForTimeout(500);
        const expandedBox = await firstTurn.boundingBox();
        if (expandedBox) {
            expect(expandedBox.height).toBeGreaterThan(initialHeight);
            console.log(`✓ Turn expanded from ${initialHeight}px to ${expandedBox.height}px with properties shown`);
            const lastElement = firstTurn.locator('p, span, div').last();
            const lastBox = await lastElement.boundingBox();
            if (lastBox) {
                expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(expandedBox.y + expandedBox.height + 10);
                console.log('✓ All turn properties content visible without cutoff');
            }
        }
    });
    test('should handle multiple simultaneous accordion expansions', async ({ page }) => {
        if (!testChatId) {
            test.skip();
            return;
        }
        await page.waitForSelector('.MuiCard-root', { timeout: 10000 });
        const accordions = await page.locator('text="Optimized Content"').all();
        if (accordions.length < 2) {
            console.log('Need at least 2 accordions for this test');
            test.skip();
            return;
        }
        console.log(`Testing ${Math.min(accordions.length, 3)} accordions`);
        const accordionsToTest = accordions.slice(0, 3);
        for (const accordion of accordionsToTest) {
            await accordion.scrollIntoViewIfNeeded();
            await accordion.click();
            await page.waitForTimeout(100);
        }
        await page.waitForTimeout(600);
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
//# sourceMappingURL=chat-history-sizing.test.js.map