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
import { LanguageModelQueue } from '/lib/ai/services/chat';
import { getAiModelProvider } from '/lib/ai/aiModelFactory';

// Create a language model
const model = getAiModelProvider('gpt-4o');

// Create a queue with max 3 concurrent requests
const queue = new LanguageModelQueue({
  model,
  maxConcurrentRequests: 3,
});

// Use the queue
try {
  const result = await queue.generateText({
    messages: [{ role: 'user', content: 'Hello!' }],
    temperature: 0.7,
    maxTokens: 150,
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
import {
  MessageTooLargeForQueueError,
  AbortChatMessageRequestError,
} from '/lib/ai/services/chat';

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
  model: LanguageModel;
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
- **Models**: Works with any `LanguageModel` implementation

## Usage Examples

### Basic Usage

```typescript
import { LanguageModelQueue } from '/lib/ai/services/chat';
import { getAiModelProvider } from '/lib/ai/aiModelFactory';

async function basicUsage() {
  // Get a language model (e.g., GPT-4)
  const model = getAiModelProvider('gpt-4o');

  // Create a queue with a maximum of 3 concurrent requests
  const queue = new LanguageModelQueue({
    model,
    maxConcurrentRequests: 3,
  });

  try {
    // Example request parameters
    const requestParams = {
      messages: [{ role: 'user', content: 'Hello, how are you?' }],
      temperature: 0.7,
      maxTokens: 150,
    };

    // Generate text using the queue
    const result = await queue.generateText(requestParams);
    console.log('Received response:', result);
  } catch (error) {
    console.error('Request failed:', error);
  } finally {
    // Always dispose of the queue when done
    queue.dispose();
  }
}
```

### Using Abort Signals for Request Cancellation

```typescript
async function abortSignalExample() {
  const model = getAiModelProvider('gpt-4o');
  const queue = new LanguageModelQueue({
    model,
    maxConcurrentRequests: 2,
  });

  try {
    // Create an abort controller
    const controller = new AbortController();

    // Set up automatic abort after 10 seconds
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000);

    const requestParams = {
      messages: [
        {
          role: 'user',
          content: 'Write a very long story about space exploration...',
        },
      ],
    };

    try {
      // Send request with abort signal
      const result = await queue.generateText(requestParams, controller.signal);
      clearTimeout(timeoutId);
      console.log('Request completed successfully');
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortChatMessageRequestError') {
        console.log('Request was successfully aborted');
      } else {
        throw error;
      }
    }
  } finally {
    queue.dispose();
  }
}
```

### Handling Multiple Concurrent Requests

```typescript
async function concurrentRequestsExample() {
  const model = getAiModelProvider('gpt-4o-mini');
  const queue = new LanguageModelQueue({
    model,
    maxConcurrentRequests: 2,
  });

  try {
    // Create multiple requests
    const prompts = [
      'What is the capital of France?',
      'Explain quantum computing in simple terms.',
      'Write a haiku about coding.',
      'What are the benefits of renewable energy?',
      'Describe the water cycle.',
    ];

    // Send all requests concurrently
    const promises = prompts.map((prompt, index) =>
      queue
        .generateText({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          maxTokens: 100,
        })
        .then((result) => ({
          id: `request-${index}`,
          success: true,
          result,
        }))
        .catch((error) => ({
          id: `request-${index}`,
          success: false,
          error: error.message,
        })),
    );

    // Wait for all requests to complete
    const results = await Promise.all(promises);

    // Process results
    results.forEach((result) => {
      if (result.success) {
        console.log(`${result.id}: Success`);
      } else {
        console.log(`${result.id}: Failed - ${result.error}`);
      }
    });
  } finally {
    queue.dispose();
  }
}
```

### Using Different Model Methods

```typescript
async function differentMethodsExample() {
  const model = getAiModelProvider('gpt-4o');
  const queue = new LanguageModelQueue({
    model,
    maxConcurrentRequests: 1,
  });

  try {
    // Generate structured object
    const objectResult = await queue.generateObject({
      messages: [
        {
          role: 'user',
          content: 'Create a person profile with name, age, and occupation',
        },
      ],
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          occupation: { type: 'string' },
        },
        required: ['name', 'age', 'occupation'],
      },
    });

    // Stream text response
    const streamResult = await queue.streamText({
      messages: [{ role: 'user', content: 'Count from 1 to 10 slowly' }],
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    queue.dispose();
  }
}
```

### Error Handling for Large Messages

```typescript
async function errorHandlingExample() {
  const model = getAiModelProvider('gpt-4o');
  const queue = new LanguageModelQueue({
    model,
    maxConcurrentRequests: 1,
  });

  try {
    // Create a very large message that exceeds token limits
    const largeContent =
      'Tell me about '.repeat(10000) + 'artificial intelligence.';

    const requestParams = {
      messages: [{ role: 'user', content: largeContent }],
    };

    await queue.generateText(requestParams);
  } catch (error) {
    if (error.name === 'MessageTooLargeForQueueError') {
      console.log('Message was too large for the queue:');
      console.log(`- Token count: ${error.tokenCount}`);
      console.log(`- Max allowed: ${error.maxTokens}`);
      console.log(`- Model type: ${error.modelType}`);
    } else {
      console.error('Unexpected error:', error);
    }
  } finally {
    queue.dispose();
  }
}
```

## Implementation Status

✅ **Complete**: Core queue functionality, error handling, Redis integration, tests
⚠️ **Partial**: Model calling implementation (placeholder currently)
📋 **Planned**: Full integration testing with live models
