import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on first retry */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    // Safe tests only (default) - excludes data mutation tests
    {
      name: 'chromium-safe',
      use: { ...devices['Desktop Chrome'] },
      grep: /^(?!.*@data-mutation)/,
      testIgnore: ['**/navigation/error-handling.test.ts'], // Contains route mocking
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

    // Data mutation tests (opt-in only) - require explicit environment variable
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

    // All tests (including mutations) - require explicit flag
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

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});