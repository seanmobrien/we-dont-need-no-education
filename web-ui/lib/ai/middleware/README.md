# AI Middleware

This directory contains middleware for AI language models, providing additional functionality like caching and retry log## Monitoring

The middleware logs:

- 🎯 Cache hits with truncated key preview
- 🔍 Cache misses with truncated key preview
- 💾 Successful cache stores
- 🏪 Cache jail updates with occurrence counts
- 🔓 Cache jail promotions when threshold is reached
- ❌ Responses that are not cached (with reasons)
- ❌ Redis errors (non-blocking)

## What Responses Are NOT Cached

The following responses are never cached to maintain system reliability:

- **Error responses**: Any response with `finishReason: 'error'`
- **Empty responses**: Responses with no text content or null/undefined text
- **Network failures**: Connection timeouts and other network issues
- **Invalid responses**: Malformed or incomplete API responses

## Cache Jail System

These responses use the cache jail system (cached after 3 occurrences):

- **Content filter responses**: `finishReason: 'content-filter'`
- **Other finish reasons**: `finishReason: 'other'`
- **Responses with warnings**: Valid text but system warnings present

### Cache Jail Benefits

- **Reduces false positives**: Temporary content filters aren't permanently cached
- **Handles persistent restrictions**: Consistent content policies are cached after threshold
- **Improves reliability**: Avoids caching transient issues while recognizing patterns
- **Maintains performance**: Frequently problematic prompts are eventually cached# Available Middleware

### `cacheWithRedis`

A Redis-based caching middleware that:

1. **Creates unique cache keys** from the entire parameters object and model type
2. **Checks Redis** for existing responses before making API calls
3. **Returns cached responses** immediately if available
4. **Caches successful responses** immediately with a 24-hour expiration
5. **Uses "cache jail"** for problematic responses (content-filter, other, warnings)
6. **Promotes jailed responses** to cache after 3 occurrences within 24 hours
7. **Never caches error responses** to avoid propagating failures
8. **Supports both streaming and non-streaming** AI operations

#### Caching Strategy

- **✅ Immediate caching**: Successful responses (`stop`, `length`, `tool-calls` with no warnings)
- **🏪 Cache jail**: Problematic responses (`other`, `content-filter`, or responses with warnings)
- **❌ Never cached**: Error responses (`error` finish reason or empty/null text)

#### Cache Jail System

The cache jail prevents temporary issues from being cached while still caching persistent problematic responses:

1. **First occurrence**: Problematic response goes to jail (not cached)
2. **Second occurrence**: Jail count incremented (still not cached)
3. **Third occurrence**: Response promoted from jail to cache (now cached for 24 hours)

This ensures that:

- Temporary content filters don't get cached
- Persistent content restrictions are cached to avoid repeated API calls
- System warnings that occur consistently are cached
- Rate limits and temporary errors are never cached

#### Success Criteria for Caching

Responses are cached immediately if they meet ALL of the following criteria:

- `finishReason` is `'stop'`, `'length'`, or `'tool-calls'`
- Response has valid text content (not empty or null)
- No warnings are present in the response
- The generation completed successfully without exceptions

Responses go to cache jail if they have:

- `finishReason` of `'other'` or `'content-filter'`
- Valid text content but with warnings
- Consistent problematic behavior (cached after 3 occurrences)

#### Features

- **Intelligent key generation**: Uses SHA-256 hashing of sorted parameters for consistent caching
- **Success-only caching**: Only caches successful responses, avoiding error states and rate limits
- **Streaming support**: Converts cached responses back to streams for consistent API behavior
- **Error resilience**: Falls back to normal operation if Redis is unavailable
- **Performance logging**: Logs cache hits/misses and skip reasons for monitoring

#### What Gets Cached vs. Skipped

**✅ Cached Responses:**

- Successful completions (`finishReason: 'stop'`, `'length'`, `'tool-calls'`)
- Valid text content present
- No warnings or errors
- Complete, successful generation

**❌ Skipped Responses:**

- Error responses (`finishReason: 'error'`)
- Content filter violations (`finishReason: 'content-filter'`)
- Other failures (`finishReason: 'other'`)
- Empty or null text content
- Responses with warnings (rate limits, etc.)
- Generation exceptions or timeouts

#### Usage

```typescript
import { wrapLanguageModel } from 'ai';
import { openai } from '@ai-sdk/openai';
import { cacheWithRedis } from '/lib/ai/middleware';

// Create a cached model
const model = wrapLanguageModel({
  model: openai('gpt-4o-mini'),
  middleware: [cacheWithRedis],
});

// Use with generateText
const result = await generateText({
  model,
  messages: [{ role: 'user', content: 'Hello!' }],
});

// Use with streamText
const { textStream } = streamText({
  model,
  messages: [{ role: 'user', content: 'Tell me a story.' }],
});
```

### `retryRateLimitMiddleware`

A middleware for handling rate limits and retries with logging capabilities.

## Configuration

### Redis Setup

The Redis client requires these environment variables:

```env
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_password_here
```

### Cache Key Strategy

Cache keys are generated using:

- Model ID
- All parameters (messages, temperature, max_tokens, etc.)
- SHA-256 hash for uniqueness and consistency

Example cache key format: `ai-cache:a1b2c3d4e5f6...`

## Error Handling

- **Redis connection failures**: Middleware gracefully falls back to normal AI API calls
- **Cache corruption**: Invalid cached data is skipped, fresh requests are made
- **Network issues**: Redis timeouts don't block AI operations

## Performance Considerations

- **Cache expiration**: 24 hours (86,400 seconds)
- **Memory usage**: Consider Redis memory limits for high-volume applications
- **Network latency**: Redis should be deployed close to your application

## Monitoring

The middleware logs:

- 🎯 Cache hits with truncated key preview
- 🔍 Cache misses with truncated key preview
- 💾 Successful cache stores
- ❌ Redis errors (non-blocking)

## Combining Middleware

Multiple middleware can be chained together:

```typescript
const model = wrapLanguageModel({
  model: openai('gpt-4o-mini'),
  middleware: [
    cacheWithRedis, // Apply caching first
    retryRateLimitMiddleware, // Then retry logic
  ],
});
```

## Best Practices

1. **Use caching for expensive operations**: Long-form content generation, complex reasoning
2. **Monitor cache hit rates**: Low hit rates may indicate too-specific parameters
3. **Consider cache invalidation**: For time-sensitive content, you may need shorter expiration
4. **Resource monitoring**: Watch Redis memory usage and connection pools
