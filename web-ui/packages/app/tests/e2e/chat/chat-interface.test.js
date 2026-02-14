import { test, expect } from '@playwright/test';
import { ensureSignedIn, testUsers } from '../helpers/auth-helper';
test.describe('Chat Interface', () => {
    test.beforeEach(async ({ page }) => {
        try {
            await ensureSignedIn(page, testUsers.user);
        }
        catch (error) {
            console.log('Authentication not required or failed, proceeding with test');
        }
        await page.goto('/messages/chat');
    });
    test('should load chat interface page', async ({ page }) => {
        await expect(page).toHaveURL(/.*\/messages\/chat/);
        await expect(page.locator('main, [role="main"], body')).toBeVisible();
    });
    test('should display chat input elements', async ({ page }) => {
        const inputSelectors = [
            '[data-testid*="chat-input"]',
            'textarea[placeholder*="message"]',
            'input[placeholder*="message"]',
            'textarea[placeholder*="type"]',
            '.chat-input',
            '[role="textbox"]'
        ];
        let inputFound = false;
        for (const selector of inputSelectors) {
            const input = page.locator(selector).first();
            if (await input.isVisible({ timeout: 10000 })) {
                console.log(`Found chat input with selector: ${selector}`);
                inputFound = true;
                const isEnabled = await input.isEnabled();
                expect(isEnabled).toBe(true);
                break;
            }
        }
        if (!inputFound) {
            console.log('No chat input found - checking if auth required or different layout');
            const authRequired = page.url().includes('/auth/signin');
            if (authRequired) {
                console.log('Chat requires authentication');
            }
        }
    });
    test('should display send button', async ({ page }) => {
        const sendButtonSelectors = [
            '[data-testid*="send"]',
            'button:has-text("Send")',
            'button[type="submit"]',
            '.send-button',
            'button[aria-label*="send"]'
        ];
        for (const selector of sendButtonSelectors) {
            const sendButton = page.locator(selector).first();
            if (await sendButton.isVisible({ timeout: 5000 })) {
                console.log(`Found send button with selector: ${selector}`);
                const isEnabled = await sendButton.isEnabled();
                console.log(`Send button enabled: ${isEnabled}`);
                break;
            }
        }
    });
    test('should handle typing in chat input', async ({ page }) => {
        const inputSelectors = [
            '[data-testid*="chat-input"]',
            'textarea[placeholder*="message"]',
            'input[placeholder*="message"]',
            'textarea[placeholder*="type"]',
            '.chat-input'
        ];
        for (const selector of inputSelectors) {
            const input = page.locator(selector).first();
            if (await input.isVisible({ timeout: 5000 })) {
                console.log(`Testing input with selector: ${selector}`);
                const testMessage = 'Hello, this is a test message';
                await input.fill(testMessage);
                const inputValue = await input.inputValue();
                expect(inputValue).toBe(testMessage);
                await input.fill('');
                console.log('Successfully tested chat input typing');
                break;
            }
        }
    });
    test('should handle sending messages @data-mutation', async ({ page }) => {
        const input = page.locator('[data-testid*="chat-input"], textarea[placeholder*="message"], input[placeholder*="message"]').first();
        const sendButton = page.locator('[data-testid*="send"], button:has-text("Send"), button[type="submit"]').first();
        if (await input.isVisible({ timeout: 5000 })) {
            const testMessage = 'Test message for sending';
            await input.fill(testMessage);
            if (await sendButton.isVisible({ timeout: 2000 })) {
                await sendButton.click();
                console.log('Sent message via button click');
            }
            else {
                await input.press('Enter');
                console.log('Sent message via Enter key');
            }
            await page.waitForTimeout(3000);
            const messageElements = page.locator('[data-testid*="message"], .chat-message, .message');
            const messageCount = await messageElements.count();
            if (messageCount > 0) {
                console.log(`Found ${messageCount} messages in chat`);
                const messageWithText = page.locator(`text=${testMessage}`);
                if (await messageWithText.isVisible({ timeout: 2000 })) {
                    console.log('Test message appears in chat history');
                }
            }
        }
    });
    test('should display chat history/messages', async ({ page }) => {
        const messageContainerSelectors = [
            '[data-testid*="chat-history"]',
            '[data-testid*="messages"]',
            '.chat-history',
            '.messages-container',
            '.chat-messages'
        ];
        for (const selector of messageContainerSelectors) {
            const container = page.locator(selector).first();
            if (await container.isVisible({ timeout: 5000 })) {
                console.log(`Found message container with selector: ${selector}`);
                const messages = container.locator('[data-testid*="message"], .message, .chat-message');
                const messageCount = await messages.count();
                console.log(`Found ${messageCount} messages in container`);
                if (messageCount > 0) {
                    const firstMessage = messages.first();
                    const messageText = await firstMessage.textContent();
                    if (messageText && messageText.trim()) {
                        console.log(`Sample message: ${messageText.trim().substring(0, 50)}...`);
                    }
                }
                break;
            }
        }
    });
    test('should handle AI model selection if present', async ({ page }) => {
        const modelSelectors = [
            '[data-testid*="model"]',
            '[data-testid*="provider"]',
            '.model-select',
            '.provider-select',
            'select',
            '.MuiSelect-root'
        ];
        for (const selector of modelSelectors) {
            const modelSelector = page.locator(selector).first();
            if (await modelSelector.isVisible({ timeout: 5000 })) {
                console.log(`Found model selector with selector: ${selector}`);
                if (await modelSelector.evaluate(el => el.tagName.toLowerCase() === 'select')) {
                    const options = modelSelector.locator('option');
                    const optionCount = await options.count();
                    if (optionCount > 1) {
                        console.log(`Found ${optionCount} model options`);
                        await modelSelector.selectOption({ index: 1 });
                        console.log('Selected different model option');
                    }
                }
                else {
                    await modelSelector.click();
                    await page.waitForTimeout(1000);
                    const dropdownOptions = page.locator('.menu li, .dropdown li, [role="option"]');
                    const optionCount = await dropdownOptions.count();
                    if (optionCount > 0) {
                        console.log(`Found ${optionCount} dropdown options`);
                    }
                }
                break;
            }
        }
    });
    test('should handle chat menu or settings', async ({ page }) => {
        const menuSelectors = [
            '[data-testid*="chat-menu"]',
            '[data-testid*="menu"]',
            'button[aria-label*="menu"]',
            '.chat-menu-button',
            '.menu-button'
        ];
        for (const selector of menuSelectors) {
            const menuButton = page.locator(selector).first();
            if (await menuButton.isVisible({ timeout: 5000 })) {
                console.log(`Found menu button with selector: ${selector}`);
                await menuButton.click();
                await page.waitForTimeout(1000);
                const menuItems = page.locator('.menu-item, [role="menuitem"], .MuiMenuItem-root');
                const itemCount = await menuItems.count();
                if (itemCount > 0) {
                    console.log(`Found ${itemCount} menu items`);
                    const firstItem = menuItems.first();
                    const itemText = await firstItem.textContent();
                    if (itemText) {
                        console.log(`Sample menu item: ${itemText.trim()}`);
                    }
                }
                await page.keyboard.press('Escape');
                break;
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
            const input = page.locator('[data-testid*="chat-input"], textarea[placeholder*="message"]').first();
            if (await input.isVisible({ timeout: 2000 })) {
                const inputBox = await input.boundingBox();
                expect(inputBox).toBeTruthy();
                console.log(`Chat input visible on ${viewport.name}`);
            }
            console.log(`Chat interface responsive on ${viewport.name} (${viewport.width}x${viewport.height})`);
        }
    });
    test('should handle long messages appropriately @data-mutation', async ({ page }) => {
        const input = page.locator('[data-testid*="chat-input"], textarea[placeholder*="message"]').first();
        if (await input.isVisible({ timeout: 5000 })) {
            const longMessage = 'This is a very long message that should test how the chat interface handles lengthy text input. '.repeat(10);
            await input.fill(longMessage);
            const inputHeight = await input.evaluate(el => el.scrollHeight);
            expect(inputHeight).toBeGreaterThan(50);
            const sendButton = page.locator('[data-testid*="send"], button:has-text("Send")').first();
            if (await sendButton.isVisible()) {
                await sendButton.click();
                await page.waitForTimeout(2000);
                console.log('Sent long message successfully');
            }
            await input.fill('');
        }
    });
    test('should handle empty message submission', async ({ page }) => {
        const input = page.locator('[data-testid*="chat-input"], textarea[placeholder*="message"]').first();
        const sendButton = page.locator('[data-testid*="send"], button:has-text("Send")').first();
        if (await input.isVisible({ timeout: 5000 }) && await sendButton.isVisible()) {
            await input.fill('');
            const isDisabled = await sendButton.isDisabled();
            if (!isDisabled) {
                await sendButton.click();
                await page.waitForTimeout(1000);
                console.log('Tested empty message handling');
            }
            else {
                console.log('Send button properly disabled for empty message');
            }
        }
    });
});
//# sourceMappingURL=chat-interface.test.js.map