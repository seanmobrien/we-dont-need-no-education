# MaxListenersExceededWarning Fix

## Problem

The application was frequently showing the following warning at runtime:

```
MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 exit listeners added to [process]. MaxListeners is 10. Use emitter.setMaxListeners() to increase limit
```

## Root Cause Analysis

The issue was caused by multiple registrations of exit handlers during development hot reloads:

1. **Database Connection**: The `lib/neondb/connection.ts` file uses the `prexit` library to register exit handlers for graceful database connection cleanup. Each time the module was reloaded during development, a new exit handler was registered without cleaning up the previous one.

2. **Instrumentation**: The `instrumentation.ts` file registers OpenTelemetry instrumentations. Similar to the database connection, multiple registrations could occur during hot reloads.

## Solution

Implemented singleton patterns in both files to prevent multiple registrations:

### Database Connection (`lib/neondb/connection.ts`)

- Added a `prexitHandlerRegistered` flag to track if the exit handler has already been registered
- Only register the prexit handler if it hasn't been registered before

### Instrumentation (`instrumentation.ts`)

- Added an `instrumentationRegistered` flag to track if instrumentation has already been registered
- Early return from the `register()` function if instrumentation is already registered

## Changes Made

1. Modified `lib/neondb/connection.ts` to use singleton pattern for prexit handler registration
2. Modified `instrumentation.ts` to use singleton pattern for instrumentation registration
3. Added tests to verify the singleton behavior works correctly

## Testing

- All existing tests continue to pass (303 tests)
- Added new tests to verify singleton pattern implementation
- Linting passes without issues

## Impact

- Prevents memory leaks from accumulating event listeners
- Eliminates the MaxListenersExceededWarning during development
- No impact on production functionality
- Maintains all existing behavior while preventing duplicate registrations
