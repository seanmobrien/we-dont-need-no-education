# MCP Transport Refactoring

This document describes the refactoring of the `InstrumentedSseTransport` class from a monolithic 1334-line class into multiple focused, maintainable modules.

## Overview

The original `InstrumentedSseTransport` class handled multiple concerns in a single large file:

- OpenTelemetry metrics setup and recording
- Session lifecycle management
- Active counter tracking
- Message processing and tool call detection
- Trace context injection
- Error handling and safety wrappers
- Transport operations

## Refactored Architecture

The refactored architecture splits these concerns into dedicated modules:

### 📊 Metrics Module (`metrics/`)

#### `otel-metrics.ts`

- **Purpose**: Centralizes OpenTelemetry setup and metric definitions
- **Exports**: All OTEL instruments, tracer, meter, and `MetricsRecorder` utility class
- **Key Features**:
  - Single source of truth for all metrics
  - Utility class for common recording patterns
  - Environment configuration (DEBUG_MODE, OTEL_MODE)

#### `counter-manager.ts`

- **Purpose**: Manages active session and tool call counters
- **Key Features**:
  - Safe increment/decrement operations (never goes negative)
  - Manual reset capabilities for debugging
  - Automatic OTEL gauge synchronization

### 🔄 Session Module (`session/`)

#### `session-manager.ts`

- **Purpose**: Handles session lifecycle, timeouts, and state tracking
- **Key Features**:
  - Session creation and tracking
  - Idle timeout management (15 min default)
  - Tool call detection and lifecycle
  - Session completion and cleanup
  - Debug information APIs

### 🔍 Tracing Module (`tracing/`)

#### `trace-context.ts`

- **Purpose**: Distributed tracing support with trace context injection
- **Key Features**:
  - Static methods for header injection
  - W3C Trace Context support
  - Debug logging for trace operations

### 🛡️ Utils Module (`utils/`)

#### `safety-utils.ts`

- **Purpose**: Error handling, timeout utilities, and safe operations
- **Key Features**:
  - Safe async wrappers that never crash
  - Timeout handling for operations
  - Operation metrics tracking
  - Exception recording and span management

### 📨 Message Module (`message/`)

#### `message-processor.ts`

- **Purpose**: Message parsing and tool call detection
- **Key Features**:
  - Outbound message processing
  - Inbound response handling
  - Tool call lifecycle tracking
  - Message size and type metrics

### 🚀 Core Transport (`instrumented-transport-refactored.ts`)

The main transport class now:

- Delegates to specialized modules
- Maintains the same public API
- Preserves all original functionality
- Significantly reduced complexity (400 lines vs 1334)

## Key Benefits

### 1. **Maintainability**

- Each module has a single responsibility
- Easier to understand and modify individual concerns
- Clear separation of business logic

### 2. **Testability**

- Each module can be unit tested independently
- Easier to mock dependencies
- More focused test scenarios

### 3. **Reusability**

- Modules can be used independently
- Other transport implementations can reuse components
- Clear interfaces between modules

### 4. **Readability**

- Smaller, focused files
- Clear module boundaries
- Self-documenting structure

### 5. **No Functionality Loss**

- 100% API compatibility maintained
- All original features preserved
- Same performance characteristics

## File Structure

```
lib/ai/mcp/
├── metrics/
│   ├── otel-metrics.ts          # OpenTelemetry setup and MetricsRecorder
│   └── counter-manager.ts       # Active counter management
├── session/
│   └── session-manager.ts       # Session lifecycle and timeouts
├── tracing/
│   └── trace-context.ts         # Distributed tracing utilities
├── utils/
│   └── safety-utils.ts          # Error handling and timeout utilities
├── message/
│   └── message-processor.ts     # Message parsing and tool call detection
├── instrumented-transport-refactored.ts  # Main transport class
├── traceable-transport-client.ts         # Original implementation
└── index.ts                     # Public exports
```

## Usage

### Direct Usage (Same API)

```typescript
import { InstrumentedSseTransport } from '/lib/ai/mcp';

// Same constructor and methods as before
const transport = new InstrumentedSseTransport({
  url: 'http://example.com',
  onerror: (error) => console.error(error),
  onmessage: (msg) => console.log(msg),
});

// All original methods work the same
await transport.start();
await transport.send(message);
const counters = transport.getActiveCounters();
transport.resetActiveCounters();
// etc.
```

### Using Individual Modules

```typescript
import {
  MetricsRecorder,
  CounterManager,
  SessionManager,
  TraceContextManager,
} from '/lib/ai/mcp';

// Use modules independently
const counterManager = new CounterManager();
const sessionManager = new SessionManager(url, counterManager);
const headers = TraceContextManager.injectTraceContext(baseHeaders);
```

## Migration Strategy

### Phase 1: No Changes Required ✅

- The refactored version maintains 100% API compatibility
- Existing code continues to work without modifications
- Both implementations export the same interface

### Phase 2: Optional Migration

- Import from the refactored modules if desired
- Use individual modules for new implementations
- Original remains available as `OriginalInstrumentedSseTransport`

### Phase 3: Future Enhancements

- Individual modules can be enhanced independently
- New features can be added to specific concerns
- Testing and maintenance become much easier

## Implementation Notes

### Constructor Behavior

- Enhanced headers with trace context injection (preserved)
- All safety validations maintained
- Same error handling patterns

### Event Handling

- `handleMessage`, `handleError`, `handleClose` preserved
- Same async safety wrappers
- Identical error recovery behavior

### Metrics and Tracing

- All original metrics preserved
- Same span relationships and attributes
- Identical debugging capabilities

### Performance

- No performance degradation
- Same memory usage patterns
- Equivalent operation counts

## Testing Strategy

Each module can now be tested independently:

```typescript
// Example: Testing CounterManager in isolation
describe('CounterManager', () => {
  it('should safely increment counters', () => {
    const manager = new CounterManager();
    manager.incrementCounter('sessions', 5);
    expect(manager.getActiveCounters().sessions).toBe(5);
  });
});
```

## Conclusion

This refactoring transforms a complex, monolithic class into a well-structured, maintainable architecture while preserving 100% functionality. The modular approach enables better testing, easier maintenance, and clearer code organization without any breaking changes to existing consumers.
