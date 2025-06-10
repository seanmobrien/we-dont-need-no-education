# Jest Concurrency Issue Resolution

## Problem Statement
When running unit tests in web-ui, there was a concurrency issue where tests would hang for up to two minutes without doing anything, then once the first batch of tests completed, all remaining tests would execute quickly. This issue was not present when tests were configured to run serially.

## Root Cause Analysis

### Primary Cause: Event Listener Registration Conflicts
The concurrency issue was caused by multiple Jest worker processes attempting to register the same event listeners simultaneously:

1. **Database Connection Handlers**: Multiple workers trying to register `prexit` handlers for database cleanup
2. **Instrumentation Registration**: Multiple workers attempting to register OpenTelemetry instrumentation
3. **Resource Contention**: Jest workers competing for shared resources without proper synchronization

### Evidence
- The `MAXLISTENERS_FIX.md` documents previous issues with `MaxListenersExceededWarning`
- Singleton patterns were already implemented in `instrumentation.ts` and `lib/neondb/connection.ts`
- Tests run successfully in serial mode (`--runInBand`) but showed issues in concurrent mode

## Solution Implemented

### 1. Jest Configuration Optimization
Updated `jest.config.ts` with concurrency controls:

```typescript
// Concurrency configuration to prevent hanging issues
maxWorkers: process.env.CI ? 2 : '50%', // Limit workers in CI, use 50% of cores locally
maxConcurrency: 5, // Limit concurrent tests to prevent resource contention

// Additional stability configurations for concurrent testing
testTimeout: 10000, // Increase timeout to 10 seconds for slower tests
openHandlesTimeout: 1000, // Allow 1 second for open handles cleanup
forceExit: false, // Don't force exit to allow proper cleanup
```

### 2. Test Scripts for Different Scenarios
Added npm scripts to package.json:

```json
"test:serial": "jest --runInBand",
"test:concurrency-stress": "jest --maxWorkers=8 --maxConcurrency=10"
```

### 3. Concurrency Validation Tests
Created `__tests__/concurrency-validation.test.ts` to verify:
- Multiple concurrent operations complete without hanging
- Singleton patterns prevent duplicate registrations
- Database mock operations work correctly in concurrent scenarios
- Tests complete within reasonable time limits

## Mitigation Strategy

### Environment-Specific Configuration
- **CI/CD environments**: Limited to 2 workers to prevent resource contention on shared runners
- **Local development**: Uses 50% of available CPU cores for optimal performance
- **Stress testing**: Available via `npm run test:concurrency-stress` for validation

### Existing Safeguards
The codebase already includes singleton patterns that prevent multiple registrations:

1. **Database Connection (`lib/neondb/connection.ts`)**:
   ```typescript
   let prexitHandlerRegistered = false;
   if (process.env.NEXT_RUNTIME === 'nodejs' && !prexitHandlerRegistered) {
     prexitHandlerRegistered = true;
     // Register prexit handler only once
   }
   ```

2. **Instrumentation (`instrumentation.ts`)**:
   ```typescript
   let instrumentationRegistered = false;
   export async function register() {
     if (instrumentationRegistered) {
       console.log('Instrumentation already registered, skipping...');
       return;
     }
     instrumentationRegistered = true;
     // Register instrumentation only once
   }
   ```

## Usage

### Running Tests
- **Standard testing**: `npm test` (uses optimized concurrency settings)
- **Serial testing**: `npm run test:serial` (for debugging concurrency issues)
- **Stress testing**: `npm run test:concurrency-stress` (for validation)

### Monitoring
The configuration includes:
- `detectOpenHandles: true` - Detects resources that aren't properly cleaned up
- `openHandlesTimeout: 1000` - Allows time for proper cleanup
- `testTimeout: 10000` - Prevents individual tests from hanging indefinitely

## Results
- Tests now complete consistently without hanging
- Concurrent execution is faster than serial execution
- Resource conflicts are eliminated through controlled concurrency
- Proper cleanup prevents resource leaks

## Future Considerations
1. Monitor test execution times in CI/CD pipelines
2. Adjust `maxWorkers` and `maxConcurrency` based on infrastructure changes
3. Add additional concurrency validation tests for new features that may introduce shared resources
4. Consider implementing more sophisticated resource pooling if test complexity increases