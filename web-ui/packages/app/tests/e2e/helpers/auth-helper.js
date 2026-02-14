import { expect } from '@playwright/test';
export const testUsers = {
    admin: {
        email: 'admin@test.local',
        password: 'admin123',
        name: 'Test Admin'
    },
    user: {
        email: 'user@test.local',
        password: 'user123',
        name: 'Test User'
    }
};
export async function signInWithCredentials(page, user) {
    await page.goto('/auth/signin');
    await expect(page.locator('h1, h2')).toContainText(/sign in/i);
    const emailField = page.locator('input[name="email"], input[name="username"], input[type="email"]').first();
    const passwordField = page.locator('input[name="password"], input[type="password"]').first();
    if (await emailField.isVisible({ timeout: 5000 })) {
        await emailField.fill(user.email);
        await passwordField.fill(user.password);
        const signInButton = page.locator('button:has-text("Sign in"), button[type="submit"], input[type="submit"]').first();
        await signInButton.click();
    }
    else {
        const credentialsLink = page.locator('a:has-text("Credentials"), button:has-text("Credentials")').first();
        if (await credentialsLink.isVisible({ timeout: 5000 })) {
            await credentialsLink.click();
            await emailField.fill(user.email);
            await passwordField.fill(user.password);
            const signInButton = page.locator('button:has-text("Sign in"), button[type="submit"]').first();
            await signInButton.click();
        }
    }
    await page.waitForURL(/^(?!.*\/auth\/).*$/, { timeout: 15000 });
}
export async function signInWithGoogle(page) {
    await page.goto('/auth/signin');
    await expect(page.locator('h1, h2')).toContainText(/sign in/i);
    const googleButton = page.locator('button:has-text("Google"), a:has-text("Google")').first();
    await googleButton.click();
    await expect(page.url()).toContain('accounts.google.com');
}
export async function signOut(page) {
    const signOutButton = page.locator('button:has-text("Sign out"), a:has-text("Sign out"), button:has-text("Logout"), a:has-text("Logout")').first();
    if (await signOutButton.isVisible({ timeout: 5000 })) {
        await signOutButton.click();
    }
    else {
        const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="user"], [aria-label*="profile"]').first();
        if (await userMenu.isVisible({ timeout: 5000 })) {
            await userMenu.click();
            const signOutInMenu = page.locator('button:has-text("Sign out"), a:has-text("Sign out")').first();
            await signOutInMenu.click();
        }
        else {
            await page.goto('/api/auth/signout');
            const confirmButton = page.locator('button:has-text("Sign out"), form button[type="submit"]').first();
            if (await confirmButton.isVisible({ timeout: 5000 })) {
                await confirmButton.click();
            }
        }
    }
    await page.waitForURL(/\/(auth\/signin|$)/, { timeout: 10000 });
}
export async function isSignedIn(page) {
    try {
        const signedInIndicators = [
            page.locator('button:has-text("Sign out"), a:has-text("Sign out")'),
            page.locator('[data-testid="user-menu"], [aria-label*="user profile"]'),
            page.locator('text=Welcome'),
        ];
        for (const indicator of signedInIndicators) {
            if (await indicator.isVisible({ timeout: 2000 })) {
                return true;
            }
        }
        return false;
    }
    catch {
        return false;
    }
}
export async function ensureSignedIn(page, user = testUsers.user) {
    if (!(await isSignedIn(page))) {
        await signInWithCredentials(page, user);
    }
}
export async function bypassAuth(page, user = testUsers.user) {
    await page.setExtraHTTPHeaders({
        'x-test-auth-bypass': 'true',
        'x-test-user-email': user.email,
        'x-test-user-name': user.name,
    });
}
//# sourceMappingURL=auth-helper.js.map