import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium-safe',
            use: { ...devices['Desktop Chrome'] },
            grep: /^(?!.*@data-mutation)/,
            testIgnore: ['**/navigation/error-handling.test.ts'],
        },
        {
            name: 'firefox-safe',
            use: { ...devices['Desktop Firefox'] },
            grep: /^(?!.*@data-mutation)/,
            testIgnore: ['**/navigation/error-handling.test.ts'],
        },
        {
            name: 'webkit-safe',
            use: { ...devices['Desktop Safari'] },
            grep: /^(?!.*@data-mutation)/,
            testIgnore: ['**/navigation/error-handling.test.ts'],
        },
        {
            name: 'mobile-chrome-safe',
            use: { ...devices['Pixel 5'] },
            grep: /^(?!.*@data-mutation)/,
            testIgnore: ['**/navigation/error-handling.test.ts'],
        },
        {
            name: 'mobile-safari-safe',
            use: { ...devices['iPhone 12'] },
            grep: /^(?!.*@data-mutation)/,
            testIgnore: ['**/navigation/error-handling.test.ts'],
        },
        ...(process.env.ENABLE_DATA_MUTATION_TESTS === 'true' ? [
            {
                name: 'chromium-mutation',
                use: { ...devices['Desktop Chrome'] },
                grep: /@data-mutation/,
            },
            {
                name: 'firefox-mutation',
                use: { ...devices['Desktop Firefox'] },
                grep: /@data-mutation/,
            },
        ] : []),
        ...(process.env.RUN_ALL_TESTS === 'true' ? [
            {
                name: 'chromium-all',
                use: { ...devices['Desktop Chrome'] },
            },
            {
                name: 'firefox-all',
                use: { ...devices['Desktop Firefox'] },
            },
            {
                name: 'webkit-all',
                use: { ...devices['Desktop Safari'] },
            },
        ] : []),
    ],
    webServer: {
        command: 'yarn dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
//# sourceMappingURL=playwright.config.js.map