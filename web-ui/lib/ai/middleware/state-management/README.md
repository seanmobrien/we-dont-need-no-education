# State Management Protocol Documentation

## Overview

The State Management Protocol enables middleware in the language model processing chain to capture, serialize, and restore their internal state. This allows for seamless middleware state preservation across requests, which is essential for features like chat message queuing, conversation persistence, and distributed processing.

## Core Components

### 1. StateManagementMiddleware

The `StateManagementMiddleware` must be placed **first** in the middleware chain. It intercepts special protocol prompts and orchestrates state collection and restoration across all downstream middleware.

```typescript
import { createStateManagementMiddleware } from '@/lib/ai/middleware/state-management';

const stateManager = createStateManagementMiddleware();
```

### 2. Protocol Constants

```typescript
export const STATE_PROTOCOL = {
  COLLECT: '__COLLECT_MIDDLEWARE_STATE__',
  RESTORE: '__RESTORE_MIDDLEWARE_STATE__',
  RESULT_KEY: '__MIDDLEWARE_STATE_RESULT__'
} as const;
```

### 3. StatefulMiddleware Interface

All middleware that participate in the protocol must implement:

```typescript
interface StatefulMiddleware {
  getMiddlewareId(): string;
  serializeState?(): SerializableState;
  deserializeState?(state: SerializableState): void;
}
```

## Usage Patterns

### Creating Stateful Middleware

#### Option 1: Use createStatefulMiddleware for custom state handling

```typescript
import { createStatefulMiddleware } from '@/lib/ai/middleware/state-management';

// Middleware with state
let middlewareState = { requestCount: 0, lastPrompt: '' };

const statefulMiddleware = createStatefulMiddleware({
  middlewareId: 'my-counter',
  originalMiddleware: {
    wrapGenerate: async ({ model, params }, next) => {
      middlewareState.requestCount++;
      middlewareState.lastPrompt = params.prompt as string;
      return await next({ model, params });
    }
  },
  stateHandlers: {
    serialize: () => middlewareState,
    deserialize: (state) => {
      middlewareState = { ...state };
    }
  }
});
```

#### Option 2: Use createSimpleStatefulMiddleware for middleware without state

```typescript
import { createSimpleStatefulMiddleware } from '@/lib/ai/middleware/state-management';

const simpleStatefulMiddleware = createSimpleStatefulMiddleware(
  'my-middleware-id',
  originalMiddleware
);
```

### Setting Up the Middleware Chain

```typescript
import { 
  createStateManagementMiddleware,
  setNormalizedDefaultsMiddleware,
  tokenStatsMiddleware
} from '@/lib/ai/middleware';

const stateManager = createStateManagementMiddleware();

const wrappedModel = wrapLanguageModel({
  model: baseModel,
  middleware: [
    stateManager.middleware, // MUST be first
    setNormalizedDefaultsMiddleware,
    tokenStatsMiddleware({ provider: 'azure', modelName: 'hifi' }),
    // ... other middleware
  ]
});
```

### Collecting Middleware State

```typescript
import { STATE_PROTOCOL } from '@/lib/ai/middleware/state-management';

async function collectChainState(model: LanguageModelV1) {
  const result = await generateText({
    model,
    prompt: STATE_PROTOCOL.COLLECT // Magic string triggers collection
  });
  
  return new Map(JSON.parse(result.text));
}

// Usage
const chainState = await collectChainState(wrappedModel);
console.log('Collected states:', chainState);
```

### Restoring Middleware State

```typescript
async function restoreChainState(model: LanguageModelV1, stateData: Map<string, any>) {
  await generateText({
    model,
    prompt: STATE_PROTOCOL.RESTORE,
    stateData // Pass state data as parameter
  });
}

// Usage
await restoreChainState(wrappedModel, previouslyCollectedState);
```

## Database Schema

The protocol includes database support for middleware metadata:

```typescript
// Drizzle schema
export const middlewareMetadata = pgTable(
  'middleware_metadata',
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    implementationPath: text('implementation_path').notNull(),
    description: text(),
    supportsStateSerialization: boolean('supports_state_serialization').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    isActive: boolean('is_active').default(true).notNull(),
  }
);
```

## Middleware Integration Status

### ✅ Integrated Middleware

- **set-normalized-defaults**: Uses `createSimpleStatefulMiddleware` wrapper
- **StateManagementMiddleware**: Core protocol implementation

### 🔄 Existing Middleware (Compatible but not yet wrapped)

- **tokenStatsTracking**: Uses custom pattern, requires manual integration
- **chat-history**: Large middleware, requires careful integration
- **cacheWithRedis**: Caching middleware, may benefit from state serialization
- **key-rate-limiter**: Rate limiting, could preserve rate limit state

## Error Handling

The protocol is designed to be resilient:

1. **Graceful Degradation**: If state collection fails, middleware continues to operate normally
2. **Fail-Safe Collection**: Middleware that can't serialize still report their presence
3. **Error Recovery**: State restoration failures are logged but don't interrupt processing
4. **Missing State Data**: Restoration without state data returns appropriate error messages

## Testing

### Unit Tests

```typescript
// Test state collection
const stateCollection = new Map();
const mockParams = {
  prompt: 'normal request',
  [STATE_PROTOCOL.RESULT_KEY]: stateCollection
};

await middleware.wrapGenerate({ model, params: mockParams }, next);
expect(stateCollection.has('middleware-id')).toBe(true);
```

### Integration Tests

Full end-to-end tests verify:
- State collection across multiple middleware
- State restoration functionality
- Error handling scenarios
- Compatibility with existing middleware

## Performance Considerations

1. **Minimal Overhead**: Protocol adds minimal processing time for normal requests
2. **On-Demand Collection**: State is only collected when explicitly requested
3. **Efficient Serialization**: Uses JSON serialization for simplicity and performance
4. **Memory Efficient**: State is collected and restored on-demand, not cached

## Best Practices

1. **Keep State Minimal**: Only serialize essential state information
2. **Use Unique IDs**: Ensure middleware IDs are unique across the application
3. **Handle Missing State**: Always provide defaults when deserializing state
4. **Test State Persistence**: Verify that your middleware can survive state collection/restoration cycles
5. **Document State Format**: Document the structure of your middleware's serialized state

## Example: Complete Stateful Middleware

```typescript
class RateLimitMiddleware implements StatefulMiddleware {
  private requestCount = 0;
  private resetTime = Date.now() + 60000;
  
  getMiddlewareId() {
    return 'rate-limiter';
  }
  
  serializeState() {
    return {
      requestCount: this.requestCount,
      resetTime: this.resetTime
    };
  }
  
  deserializeState(state: any) {
    this.requestCount = state.requestCount || 0;
    this.resetTime = state.resetTime || Date.now() + 60000;
  }
  
  // Standard middleware implementation
  get middleware(): LanguageModelV1Middleware {
    return createStatefulMiddleware({
      middlewareId: this.getMiddlewareId(),
      originalMiddleware: {
        wrapGenerate: async ({ model, params }, next) => {
          if (this.requestCount >= 10 && Date.now() < this.resetTime) {
            throw new Error('Rate limit exceeded');
          }
          
          this.requestCount++;
          return await next({ model, params });
        }
      },
      stateHandlers: {
        serialize: () => this.serializeState(),
        deserialize: (state) => this.deserializeState(state)
      }
    });
  }
}

// Usage
const rateLimiter = new RateLimitMiddleware();
const model = wrapLanguageModel({
  model: baseModel,
  middleware: [
    stateManager.middleware,
    rateLimiter.middleware,
    // ... other middleware
  ]
});
```

This protocol enables powerful features like:
- **Chat Message Queuing**: Preserve chat history across queue operations
- **Distributed Processing**: Move conversations between different compute instances
- **State Snapshots**: Create checkpoints for complex AI workflows
- **Middleware Debugging**: Inspect middleware state for troubleshooting