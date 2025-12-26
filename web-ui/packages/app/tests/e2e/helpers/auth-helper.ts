import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

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
} as const;

/**
 * Sign in using the credentials provider
 */
export async function signInWithCredentials(page: Page, user: TestUser) {
  await page.goto('/auth/signin');
  
  // Wait for the sign-in page to load
  await expect(page.locator('h1, h2')).toContainText(/sign in/i);
  
  // Look for credentials form - this might be a custom form or NextAuth form
  // We'll try to find email/username and password fields
  const emailField = page.locator('input[name="email"], input[name="username"], input[type="email"]').first();
  const passwordField = page.locator('input[name="password"], input[type="password"]').first();
  
  if (await emailField.isVisible({ timeout: 5000 })) {
    await emailField.fill(user.email);
    await passwordField.fill(user.password);
    
    // Find and click sign in button
    const signInButton = page.locator('button:has-text("Sign in"), button[type="submit"], input[type="submit"]').first();
    await signInButton.click();
  } else {
    // If no credentials form, look for credentials provider link
    const credentialsLink = page.locator('a:has-text("Credentials"), button:has-text("Credentials")').first();
    if (await credentialsLink.isVisible({ timeout: 5000 })) {
      await credentialsLink.click();
      
      // Fill in credentials on the provider page
      await emailField.fill(user.email);
      await passwordField.fill(user.password);
      
      const signInButton = page.locator('button:has-text("Sign in"), button[type="submit"]').first();
      await signInButton.click();
    }
  }
  
  // Wait for redirect to homepage or dashboard
  await page.waitForURL(/^(?!.*\/auth\/).*$/, { timeout: 15000 });
}

/**
 * Sign in using Google OAuth (for demo/testing)
 * Note: In real tests, this would require additional setup with OAuth test accounts
 */
export async function signInWithGoogle(page: Page) {
  await page.goto('/auth/signin');
  
  // Wait for the sign-in page to load
  await expect(page.locator('h1, h2')).toContainText(/sign in/i);
  
  // Click Google sign in button
  const googleButton = page.locator('button:has-text("Google"), a:has-text("Google")').first();
  await googleButton.click();
  
  // Note: In a real test, you would handle Google's OAuth flow
  // For this demo, we'll expect to be redirected to Google
  await expect(page.url()).toContain('accounts.google.com');
}

/**
 * Sign out the current user
 */
export async function signOut(page: Page) {
  // Look for sign out button/link - might be in a menu
  const signOutButton = page.locator('button:has-text("Sign out"), a:has-text("Sign out"), button:has-text("Logout"), a:has-text("Logout")').first();
  
  if (await signOutButton.isVisible({ timeout: 5000 })) {
    await signOutButton.click();
  } else {
    // Try looking for a user menu or profile dropdown
    const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="user"], [aria-label*="profile"]').first();
    if (await userMenu.isVisible({ timeout: 5000 })) {
      await userMenu.click();
      const signOutInMenu = page.locator('button:has-text("Sign out"), a:has-text("Sign out")').first();
      await signOutInMenu.click();
    } else {
      // Fallback: navigate to sign out endpoint
      await page.goto('/api/auth/signout');
      const confirmButton = page.locator('button:has-text("Sign out"), form button[type="submit"]').first();
      if (await confirmButton.isVisible({ timeout: 5000 })) {
        await confirmButton.click();
      }
    }
  }
  
  // Wait for redirect to sign-in page or homepage
  await page.waitForURL(/\/(auth\/signin|$)/, { timeout: 10000 });
}

/**
 * Check if user is currently signed in
 */
export async function isSignedIn(page: Page): Promise<boolean> {
  try {
    // Look for indicators that user is signed in
    const signedInIndicators = [
      page.locator('button:has-text("Sign out"), a:has-text("Sign out")'),
      page.locator('[data-testid="user-menu"], [aria-label*="user profile"]'),
      page.locator('text=Welcome'), // Common welcome message
    ];
    
    for (const indicator of signedInIndicators) {
      if (await indicator.isVisible({ timeout: 2000 })) {
        return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Ensure user is signed in, sign in if not
 */
export async function ensureSignedIn(page: Page, user: TestUser = testUsers.user) {
  if (!(await isSignedIn(page))) {
    await signInWithCredentials(page, user);
  }
}

/**
 * Bypass authentication for testing by using authentication bypass headers
 * This requires the application to be configured with bypass headers for testing
 */
export async function bypassAuth(page: Page, user: TestUser = testUsers.user) {
  // Set authentication bypass headers if the app supports them
  await page.setExtraHTTPHeaders({
    'x-test-auth-bypass': 'true',
    'x-test-user-email': user.email,
    'x-test-user-name': user.name,
  });
}