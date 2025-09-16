# Playwright E2E Test Suite

This directory contains comprehensive end-to-end tests for the NoEducation Web UI application using Playwright.

## Overview

The test suite validates core user flows and functionality including:

- **Homepage and Navigation**: Loading, routing, responsive design
- **Authentication**: Sign-in/out flows, provider selection, session management  
- **Email Management**: List view, search, filtering, pagination, interactions
- **Chat Interface**: Message input/output, AI model selection, conversation flow
- **Bulk Operations**: Selection, actions, confirmation dialogs, progress tracking
- **Error Handling**: 404 pages, network errors, graceful degradation

## Test Structure

```
tests/e2e/
├── README.md                 # This documentation
├── auth/                     # Authentication tests
│   └── authentication.test.ts
├── bulk-edit/                # Bulk operations tests
│   └── bulk-operations.test.ts
├── chat/                     # Chat interface tests
│   └── chat-interface.test.ts
├── email/                    # Email management tests
│   └── email-list.test.ts
├── navigation/               # Navigation and error handling
│   ├── homepage.test.ts
│   ├── navigation.test.ts
│   └── error-handling.test.ts
├── helpers/                  # Test utilities and helpers
│   ├── auth-helper.ts       # Authentication helpers
│   └── test-data.ts         # Mock data and configuration
└── fixtures/                 # Test fixtures (future use)
```

## Prerequisites

### 1. Install Dependencies

```bash
# Install Playwright
yarn add --dev @playwright/test

# Install browsers (may require system dependencies)
npx playwright install
```

### 2. Environment Setup

The tests are designed to run against a local development server. Ensure you have:

- Node.js >= 20.x
- Yarn package manager  
- PostgreSQL database (for full functionality)
- Environment variables configured (see main README.md)

### 3. Database Setup (Optional)

For full test coverage, set up the database:

```bash
# Generate and run migrations
yarn drizzle-generate
npx drizzle-kit migrate

# Optional: Seed with test data
# (The tests are designed to work with or without existing data)
```

## Running Tests

### Basic Commands

```bash
# Run all E2E tests
yarn test:e2e

# Run tests with browser UI (visual debugging)
yarn test:e2e:ui

# Run tests in headed mode (see browser)
yarn test:e2e:headed

# Run specific browser
yarn test:e2e:chromium
yarn test:e2e:firefox  
yarn test:e2e:webkit

# Debug mode (step through tests)
yarn test:e2e:debug

# View test report
yarn test:e2e:report
```

### Running Specific Tests

```bash
# Run specific test file
npx playwright test tests/e2e/auth/authentication.test.ts

# Run specific test by name
npx playwright test --grep "should load homepage"

# Run tests for specific feature
npx playwright test tests/e2e/email/

# Run tests with specific tag
npx playwright test --grep "@smoke"
```

### Development Server

The tests expect the application to be running locally:

```bash
# Start development server (in separate terminal)
yarn dev

# Or use Playwright's webServer option (configured in playwright.config.ts)
# This will automatically start/stop the dev server
```

## Test Configuration

Configuration is in `playwright.config.ts`:

- **Base URL**: `http://localhost:3000` (configurable)
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome/Safari
- **Timeouts**: 30s default, 120s for server startup  
- **Retries**: 2 retries on CI, 0 locally
- **Artifacts**: Screenshots on failure, video on retry
- **Parallel**: Full parallel execution (configurable)

## Authentication in Tests

The test suite includes flexible authentication handling:

### Test Users

```typescript
// Defined in helpers/auth-helper.ts
const testUsers = {
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
```

### Authentication Methods

1. **Credentials Provider**: Tests form-based login
2. **OAuth Providers**: Tests provider buttons (without full OAuth flow)
3. **Session Management**: Tests sign-in/out and persistence
4. **Auth Bypass**: Optional headers for testing environments

### Usage in Tests

```typescript
import { ensureSignedIn, testUsers } from '../helpers/auth-helper';

test('should access protected feature', async ({ page }) => {
  // Automatically sign in if needed
  await ensureSignedIn(page, testUsers.user);
  
  // Test protected functionality
  await page.goto('/protected-page');
  // ...
});
```

## Mock Data and Fixtures

Test data is defined in `helpers/test-data.ts`:

- **Mock Emails**: Sample email data for testing lists and details
- **Chat Messages**: Sample conversation data
- **Bulk Operations**: Sample bulk edit operations
- **API Responses**: Mock API responses for testing
- **Selectors**: Common selectors used across tests

## Test Design Principles

### 1. Resilient Selectors

Tests use multiple fallback selectors to be resilient to UI changes:

```typescript
const emailListSelectors = [
  '[data-testid="email-list"]',    // Preferred: test IDs
  '.email-list',                   // Class names  
  '.MuiDataGrid-root',            // Component-specific
  'table',                         // Generic fallback
  '[role="grid"]'                 // Semantic fallback
];
```

### 2. Graceful Degradation

Tests handle various application states:
- Authentication required vs. public access
- Empty data states vs. populated data
- Loading states and network delays
- Error conditions and recovery

### 3. Cross-Browser Compatibility

Tests run on multiple browsers and devices:
- Desktop: Chromium, Firefox, WebKit
- Mobile: Chrome Mobile, Safari Mobile
- Responsive design validation

### 4. Independent Tests

Each test is designed to be:
- **Isolated**: No dependencies between tests
- **Repeatable**: Can run multiple times with same results  
- **Parallel-safe**: Can run concurrently with other tests

## Writing New Tests

### Test File Structure

```typescript
import { test, expect } from '@playwright/test';
import { ensureSignedIn, testUsers } from '../helpers/auth-helper';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup common to all tests
    await ensureSignedIn(page);
    await page.goto('/feature-page');
  });

  test('should do something specific', async ({ page }) => {
    // Test implementation
    await expect(page.locator('[data-testid="element"]')).toBeVisible();
  });
});
```

### Best Practices

1. **Use descriptive test names**: Clearly state what is being tested
2. **Start with happy path**: Test core functionality first
3. **Add edge cases**: Empty states, errors, boundary conditions
4. **Use data-testid**: Add test IDs to components when needed
5. **Handle async operations**: Use proper waits and timeouts
6. **Test responsive design**: Validate mobile and desktop layouts
7. **Verify accessibility**: Check for proper ARIA attributes

### Adding Test IDs to Components

When existing selectors aren't reliable, add test IDs:

```tsx
// In your React component
<button data-testid="send-message-button">
  Send Message
</button>

// In your test
await page.locator('[data-testid="send-message-button"]').click();
```

## Troubleshooting

### Common Issues

1. **Tests timing out**:
   - Check if dev server is running
   - Increase timeouts in playwright.config.ts
   - Check network conditions

2. **Flaky tests**:
   - Add proper waits instead of fixed delays
   - Use `waitFor()` for dynamic content
   - Check for race conditions

3. **Browser not found**:
   - Run `npx playwright install`
   - Check system dependencies

4. **Authentication failures**:
   - Verify test user credentials
   - Check if auth is required for test environment
   - Use auth bypass headers if available

### Debugging

```bash
# Run with debug mode
yarn test:e2e:debug

# Run specific test with debug
npx playwright test --debug tests/e2e/auth/authentication.test.ts

# Generate trace for failed test
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### Test Environment

For CI/CD environments:

```bash
# Run headless with retries
npx playwright test --project=chromium --retries=2

# Generate report
npx playwright test --reporter=html

# Run with specific config
npx playwright test --config=playwright.ci.config.ts
```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: yarn install
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: yarn test:e2e
      
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Coverage and Reporting

Tests generate comprehensive reports:

- **HTML Report**: Visual test results with screenshots/videos
- **JUnit Report**: For CI/CD integration
- **Trace Files**: Step-by-step execution traces for debugging

Access reports:

```bash
# View HTML report
yarn test:e2e:report

# Generate specific report format  
npx playwright test --reporter=junit,html
```

## Contributing

When adding new features to the application:

1. **Add corresponding E2E tests** for new user flows
2. **Update existing tests** if UI changes affect selectors
3. **Add test IDs** to new components for reliable testing
4. **Test responsive behavior** on mobile and desktop
5. **Handle error states** and edge cases
6. **Document test scenarios** in test descriptions

For questions or issues with the test suite, refer to the [Playwright documentation](https://playwright.dev/docs/intro) or the main project README.