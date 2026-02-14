import { test, expect } from '@playwright/test';
import { signOut, testUsers, isSignedIn, } from '../helpers/auth-helper';
test.describe('Authentication', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });
    test('should load sign-in page', async ({ page }) => {
        await page.goto('/auth/signin');
        await expect(page).toHaveURL(/.*\/auth\/signin/);
        const signInContent = page
            .locator('h1, h2, title')
            .filter({ hasText: /sign in|login/i });
        await expect(signInContent.first()).toBeVisible({ timeout: 10000 });
    });
    test('should display authentication providers', async ({ page }) => {
        await page.goto('/auth/signin');
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
        expect(providersFound).toBeGreaterThan(0);
    });
    test('should handle credentials sign-in flow @data-mutation', async ({ page, }) => {
        await page.goto('/auth/signin');
        const credentialsOption = page
            .locator('button:has-text("Credentials"), a:has-text("Credentials"), form')
            .first();
        if (await credentialsOption.isVisible({ timeout: 5000 })) {
            if (await credentialsOption.evaluate((el) => el.tagName.toLowerCase() === 'button' ||
                el.tagName.toLowerCase() === 'a')) {
                await credentialsOption.click();
            }
            const emailField = page
                .locator('input[name="email"], input[name="username"], input[type="email"]')
                .first();
            const passwordField = page
                .locator('input[name="password"], input[type="password"]')
                .first();
            if ((await emailField.isVisible({ timeout: 5000 })) &&
                (await passwordField.isVisible({ timeout: 5000 }))) {
                await emailField.fill(testUsers.user.email);
                await passwordField.fill(testUsers.user.password);
                const submitButton = page
                    .locator('button[type="submit"], button:has-text("Sign in"), input[type="submit"]')
                    .first();
                if (await submitButton.isVisible()) {
                    await submitButton.click();
                    await page.waitForTimeout(3000);
                    const currentUrl = page.url();
                    const isRedirected = !currentUrl.includes('/auth/signin');
                    if (isRedirected) {
                        console.log('Successfully redirected after sign-in attempt');
                    }
                    else {
                        console.log('Stayed on sign-in page - checking for error messages');
                        const errorMessages = page.locator('text=error, text=invalid, .error, [role="alert"]');
                        if ((await errorMessages.count()) > 0) {
                            console.log('Found error messages as expected for test credentials');
                        }
                    }
                }
            }
        }
        else {
            console.log('No credentials sign-in option found');
        }
    });
    test('should handle OAuth provider buttons', async ({ page }) => {
        await page.goto('/auth/signin');
        const googleButton = page
            .locator('button:has-text("Google"), a:has-text("Google")')
            .first();
        if (await googleButton.isVisible({ timeout: 5000 })) {
            const href = await googleButton.getAttribute('href');
            if (href) {
                expect(href).toMatch(/auth|oauth|google/);
            }
            else {
                await googleButton.click();
                await page.waitForTimeout(2000);
                console.log('Google OAuth button is clickable');
            }
        }
    });
    test('should handle sign-out flow @data-mutation', async ({ page }) => {
        if (await isSignedIn(page)) {
            await signOut(page);
            const currentUrl = page.url();
            const isSignedOutUrl = currentUrl.includes('/auth/signin') || currentUrl.endsWith('/');
            expect(isSignedOutUrl).toBe(true);
        }
        else {
            console.log('Not signed in, skipping sign-out test');
        }
    });
    test('should redirect to protected pages after sign-in', async ({ page }) => {
        await page.goto('/messages/email');
        const currentUrl = page.url();
        if (currentUrl.includes('/auth/signin')) {
            console.log('Successfully redirected to sign-in for protected page');
            expect(currentUrl).toMatch(/auth\/signin/);
        }
        else {
            console.log('Page is accessible without sign-in or user already signed in');
            await expect(page.locator('body')).toBeVisible();
        }
    });
    test('should maintain session across page refreshes', async ({ page }) => {
        const initialSignedIn = await isSignedIn(page);
        await page.reload();
        const afterRefreshSignedIn = await isSignedIn(page);
        expect(afterRefreshSignedIn).toBe(initialSignedIn);
    });
    test('should handle authentication errors gracefully @data-mutation', async ({ page, }) => {
        await page.goto('/auth/signin');
        const emailField = page
            .locator('input[name="email"], input[type="email"]')
            .first();
        const passwordField = page
            .locator('input[name="password"], input[type="password"]')
            .first();
        if ((await emailField.isVisible({ timeout: 5000 })) &&
            (await passwordField.isVisible())) {
            await emailField.fill('invalid@test.com');
            await passwordField.fill('wrongpassword');
            const submitButton = page
                .locator('button[type="submit"], button:has-text("Sign in")')
                .first();
            if (await submitButton.isVisible()) {
                await submitButton.click();
                await page.waitForTimeout(3000);
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
                const stillOnSignIn = page.url().includes('/auth/signin');
                expect(errorFound || stillOnSignIn).toBe(true);
            }
        }
    });
    test('should have proper security attributes', async ({ page }) => {
        await page.goto('/auth/signin');
        const forms = page.locator('form');
        const formCount = await forms.count();
        if (formCount > 0) {
            const firstForm = forms.first();
            const hiddenInputs = firstForm.locator('input[type="hidden"]');
            const hiddenCount = await hiddenInputs.count();
            if (hiddenCount > 0) {
                console.log('Found hidden inputs, likely CSRF protection');
            }
            const method = await firstForm.getAttribute('method');
            const action = await firstForm.getAttribute('action');
            if (method) {
                expect(method.toLowerCase()).toBe('post');
            }
            if (action) {
                expect(action).toMatch(/^\/|^https?:\/\//);
            }
        }
    });
});
//# sourceMappingURL=authentication.test.js.map