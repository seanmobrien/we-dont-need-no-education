# Language Model Queue

A FIFO rate-aware queue system for managing language model requests with intelligent rate limiting and comprehensive error handling.

## Overview

The `LanguageModelQueue` class provides a sophisticated queuing mechanism for language model requests that:

- Manages concurrent requests with configurable limits
- Implements FIFO processing with intelligent capacity-aware skipping
- Handles rate limits automatically with retry logic
- Supports request cancellation via abort signals
- Provides comprehensive error handling and metrics

## Quick Start

```typescript
import { LanguageModelQueue } from '@/lib/ai/services/chat';
import { getAiModelProvider } from '@/lib/ai/aiModelFactory';

// Create a language model
const model = getAiModelProvider('gpt-4o');

// Create a queue with max 3 concurrent requests
const queue = new LanguageModelQueue({
  model,
  maxConcurrentRequests: 3
});

// Use the queue
try {
  const result = await queue.generateText({
    messages: [{ role: 'user', content: 'Hello!' }],
    temperature: 0.7,
    maxTokens: 150
  });
  console.log(result);
} finally {
  queue.dispose(); // Always clean up
}
```

## Features

### Core Functionality

- **FIFO Processing**: Requests are processed in first-in-first-out order
- **Rate Awareness**: Automatically manages rate limits based on model capacity
- **Concurrent Control**: Configurable maximum concurrent requests
- **Redis Backing**: Uses Redis for persistent queue storage
- **Request Methods**: Supports `generateText`, `generateObject`, `streamText`, `streamObject`

### Advanced Features

- **Smart Skipping**: Can skip requests when capacity is low, but respects the 5-minute rule
- **Abort Support**: Cancel requests using `AbortSignal`
- **Rate Limit Recovery**: Automatically handles rate limit errors and retries
- **Token Validation**: Validates message size against model limits before queuing
- **Metrics Reporting**: Integrates with Application Insights for monitoring

### Error Handling

Custom error types provide specific handling for different scenarios:

```typescript
import { MessageTooLargeForQueueError, AbortChatMessageRequestError } from '@/lib/ai/services/chat';

try {
  await queue.generateText(largeRequest);
} catch (error) {
  if (error instanceof MessageTooLargeForQueueError) {
    console.log(`Message too large: ${error.tokenCount} > ${error.maxTokens}`);
  } else if (error instanceof AbortChatMessageRequestError) {
    console.log(`Request ${error.requestId} was aborted`);
  }
}
```

## Configuration

### Constructor Options

```typescript
interface LanguageModelQueueOptions {
  /** The language model the queue is attached to */
  model: LanguageModelV1;
  /** Maximum number of concurrent requests the queue will run */
  maxConcurrentRequests: number;
}
```

### Redis Key Structure

The queue uses deterministic Redis keys based on model type:

- Queue: `language-model-queue:queue:{modelType}`
- Capacity: `language-model-queue:capacity:{modelType}`
- Processing: `language-model-queue:processing:{modelType}`

## Queue Processing Logic

### FIFO with Capacity-Aware Skipping

1. Requests are processed in FIFO order
2. If a request cannot be processed due to insufficient capacity, it may be skipped
3. However, requests older than 5 minutes are never skipped
4. This ensures both efficiency and fairness

### Rate Limit Handling

1. **Proactive**: Checks model capacity before processing requests
2. **Reactive**: Handles rate limit errors from model responses
3. **Recovery**: Automatically retries requests when capacity is restored
4. **Headers**: Processes `x-ratelimit-*` and `x-retry-after` headers

### Request Lifecycle

```
[Enqueue] → [Validate Size] → [Queue in Redis] → [Wait for Processing]
    ↓
[Capacity Check] → [Execute Request] → [Handle Response] → [Complete/Retry]
```

## Monitoring and Metrics

The queue reports metrics to Application Insights including:

- Number of active requests
- Queue size
- Available model capacity
- Processing times and success rates

## Best Practices

### Resource Management

Always dispose of queues when done:

```typescript
const queue = new LanguageModelQueue(options);
try {
  // Use the queue
} finally {
  queue.dispose(); // Critical for cleanup
}
```

### Error Handling

Handle specific error types appropriately:

```typescript
try {
  const result = await queue.generateText(params);
} catch (error) {
  if (error instanceof MessageTooLargeForQueueError) {
    // Reduce message size or split into chunks
  } else if (error instanceof AbortChatMessageRequestError) {
    // Handle cancellation gracefully
  } else {
    // Handle other errors (network, model errors, etc.)
  }
}
```

### Abort Signals

Use abort signals for long-running requests:

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

try {
  const result = await queue.generateText(params, controller.signal);
  clearTimeout(timeoutId);
} catch (error) {
  if (error.name === 'AbortChatMessageRequestError') {
    // Handle timeout
  }
}
```

## Integration

The queue integrates with existing infrastructure:

- **Redis**: Uses the existing Redis client from `@/lib/ai/middleware/cacheWithRedis/redis-client`
- **Auth**: Gets user IDs from the NextAuth `auth()` function
- **Tokens**: Uses the existing token counting logic from `@/lib/ai/core/count-tokens`
- **Logging**: Integrates with the application logger
- **Models**: Works with any `LanguageModelV1` implementation

## Implementation Status

✅ **Complete**: Core queue functionality, error handling, Redis integration, tests
⚠️ **Partial**: Model calling implementation (placeholder currently)
📋 **Planned**: Full integration testing with live models

See `usage-examples.ts` for comprehensive usage examples.