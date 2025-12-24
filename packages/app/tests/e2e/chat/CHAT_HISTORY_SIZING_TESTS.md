# Chat History Sizing Tests

## Overview

This test suite validates the fixes for chat history panel sizing issues (#271), specifically:

1. **Content cutoff at bottom**: Ensures chat turn content is fully visible without being cut off at the bottom
2. **Dynamic accordion resizing**: Verifies that chat bubbles resize properly when "Optimized Content" accordions expand or collapse

## Test Coverage

The test suite includes 7 comprehensive tests across multiple browsers (Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari):

### 1. Content Visibility Tests
- `should display full chat turn content without bottom cutoff`
  - Validates that all text content within chat turns is fully visible
  - Checks that the last element in each turn is within the card boundaries
  - Tests up to 5 chat turns to ensure consistent behavior

### 2. Accordion Resize Tests
- `should resize chat bubble when Optimized Content accordion expands`
  - Measures message height before and after accordion expansion
  - Verifies height increases when accordion expands
  - Verifies height returns to initial size when accordion collapses
  - Validates the 300ms transition delay implementation

### 3. Rapid Interaction Tests
- `should handle rapid accordion expand/collapse without layout issues`
  - Tests accordion stability under rapid toggle operations
  - Ensures no visual glitches or layout errors occur
  - Validates proper cleanup of pending timeouts

### 4. Metadata Accordion Tests
- `should properly size turn with metadata accordion expanded`
  - Tests the "Show Message Metadata" toggle functionality
  - Validates metadata accordion resizing behavior
  - Ensures consistent sizing behavior across accordion types

### 5. Scroll Position Tests
- `should maintain proper scroll position during accordion interactions`
  - Verifies scroll position doesn't jump dramatically during accordion expansion
  - Tests scroll stability with threshold of 500px tolerance
  - Ensures smooth user experience

### 6. Turn Properties Tests
- `should display all turn content when Show Turn Properties is enabled`
  - Tests the "Show Turn Properties" toggle functionality
  - Validates that turn height increases to show additional properties
  - Ensures all properties content is visible without cutoff

### 7. Multiple Accordion Tests
- `should handle multiple simultaneous accordion expansions`
  - Tests behavior when multiple accordions are expanded simultaneously
  - Validates proper height measurement for each accordion
  - Ensures no race conditions or measurement conflicts

## Prerequisites

Before running these tests, ensure you have:

1. **Environment Setup**
   - All required environment variables configured (see main `web-ui/tests/e2e/README.md`)
   - PostgreSQL database running with test data
   - At least one chat session with optimized content in the database

2. **Test Data Requirements**
   - At least one chat conversation with multiple turns
   - Chat messages that include "Optimized Content" (different from main content)
   - Various message types (user, assistant, tool) for comprehensive testing

3. **Authentication**
   - Valid user credentials configured in test helpers
   - Auth provider (Google, Keycloak) properly configured

## Running the Tests

### Quick Start

```bash
# Run all chat history sizing tests in Chrome
yarn test:e2e:chromium --grep "Chat History - Sizing"

# Run with UI mode for debugging
yarn test:e2e:ui --grep "Chat History - Sizing"

# Run in all browsers
yarn test:e2e --grep "Chat History - Sizing"
```

### Detailed Commands

```bash
# Run specific test
yarn test:e2e:chromium --grep "should resize chat bubble"

# Run with headed browser (visible)
yarn test:e2e:headed --grep "Chat History - Sizing"

# Run in debug mode
yarn test:e2e:debug --grep "Chat History - Sizing"

# Generate and view HTML report
yarn test:e2e:chromium --grep "Chat History - Sizing"
yarn test:e2e:report
```

### Mobile Testing

```bash
# Test on mobile Chrome
npx playwright test --project=mobile-chrome-safe --grep "Chat History - Sizing"

# Test on mobile Safari
npx playwright test --project=mobile-safari-safe --grep "Chat History - Sizing"
```

## Environment Variables

Create a `.env.local` file (or ensure your `.env` file has these values):

```bash
# Azure Monitor (can be 'test' for local development)
AZURE_MONITOR_CONNECTION_STRING=test

# Auth - Google
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret
AUTH_GOOGLE_APIKEY=your_google_api_key

# Auth - Secret
AUTH_SECRET=your_auth_secret_min_32_characters

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Other required variables...
```

## Test Implementation Details

### Key Technical Aspects

1. **Timeout Handling**
   - Uses 300ms delay after accordion clicks to match Material-UI transition duration
   - Implements proper cleanup in test hooks
   - Handles async operations with appropriate waits

2. **Element Detection**
   - Gracefully skips tests if required elements aren't found
   - Provides detailed console logging for debugging
   - Uses multiple selector strategies for robustness

3. **Measurement Strategy**
   - Uses `boundingBox()` for accurate element dimensions
   - Implements tolerance thresholds for height comparisons
   - Accounts for CSS transitions and animations

4. **Error Handling**
   - Skips tests gracefully when prerequisites aren't met
   - Provides informative console output for debugging
   - Handles authentication failures without breaking test suite

### Related Implementation

The tests validate the implementation in:
- `web-ui/components/chat/chat-message-display.tsx`
- `web-ui/components/chat/chat-turn-display.tsx`
- `web-ui/components/chat/virtualized-chat-display.tsx`

Key implementation features being tested:
- `ACCORDION_TRANSITION_DELAY_MS` constant (300ms)
- Map-based element reference storage
- Memoized `createHeightChangeHandler` callback
- ResizeObserver-based height measurement
- Timeout cleanup on unmount

## Troubleshooting

### Tests Skip or Fail

1. **"No chat ID found"**
   - Ensure you have at least one chat conversation in the database
   - Check that the chat list page (`/messages/chat`) is accessible
   - Verify authentication is working

2. **"Optimized Content accordions found - test may need different data"**
   - Create chat messages with `optimizedContent` that differs from `content`
   - Ensure the AI response includes optimized content generation

3. **Environment Setup Errors**
   - Verify all required environment variables are set
   - Check database connection
   - Ensure authentication providers are configured

4. **Timeout Errors**
   - Increase timeout in `playwright.config.ts` if needed
   - Check that the development server is running (`yarn dev`)
   - Verify network connectivity

### Debugging Tips

1. **Use UI Mode**
   ```bash
   yarn test:e2e:ui --grep "Chat History - Sizing"
   ```
   - Provides visual feedback
   - Allows step-by-step execution
   - Shows element inspection

2. **Enable Debug Logging**
   - Tests include console.log statements for debugging
   - Check terminal output for detailed information
   - Review screenshots on failure (in `test-results/`)

3. **Run Single Test**
   ```bash
   yarn test:e2e:chromium --grep "should resize chat bubble when Optimized"
   ```
   - Isolates specific test case
   - Faster iteration
   - Easier debugging

## Success Criteria

Tests pass when:
1. ✅ Chat turn content is fully visible without cutoff
2. ✅ Accordion expansion increases message height
3. ✅ Accordion collapse returns message to original height
4. ✅ Rapid toggling doesn't cause layout issues
5. ✅ Scroll position remains stable during interactions
6. ✅ Multiple accordions can expand simultaneously
7. ✅ Turn properties toggle works correctly

## Related Documentation

- Main E2E Test Documentation: `/web-ui/tests/e2e/README.md`
- Issue #271: Chat panel sizing issues
- PR: Fix virtualized chat display content cutoff and accordion remeasurement
- Implementation: See commits in this PR branch
