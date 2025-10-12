# MCP Tool Caching System

This document describes the comprehensive caching system for Model Context Protocol (MCP) tool definitions, designed to significantly improve performance by eliminating redundant tool discovery requests.

## Overview

The MCP Tool Cache implements a hybrid two-level caching strategy:

1. **In-Memory Cache (L1)**: Ultra-fast LRU cache for immediate access
2. **Redis Cache (L2)**: Persistent, shared cache across server instances

## Key Benefits

- **Performance**: Reduces tool discovery latency from hundreds of milliseconds to microseconds
- **Reliability**: Graceful degradation when cache systems are unavailable
- **Efficiency**: Automatic cache invalidation and intelligent key generation
- **Monitoring**: Built-in metrics and health checks for cache performance

## Cache Key Strategy

The cache uses a composite key that includes:

```typescript
interface CacheKeyComponents {
  url: string; // MCP server endpoint
  headersHash: string; // SHA-256 of sorted headers (for auth)
  allowWrite: boolean; // Read-only vs read-write permissions
}
```

### Why URL Alone Isn't Sufficient

- **Authentication**: Different API keys/tokens provide different tool sets
- **Permissions**: Write permissions affect tool availability
- **Headers**: Custom headers can change server behavior

## Usage

### Basic Usage

```typescript
import { toolProviderFactory } from '@/lib/ai/mcp';

// Cache is automatically used - no code changes needed!
const provider = await toolProviderFactory({
  url: 'https://api.example.com/mcp',
  headers: { Authorization: 'Bearer token' },
  allowWrite: false,
});
```

### Advanced Cache Management

```typescript
import {
  getToolCache,
  MCPToolCacheAdmin,
  initializeMCPCache,
} from '@/lib/ai/mcp';

// Initialize cache on startup
await initializeMCPCache();

// Get cache statistics
await MCPToolCacheAdmin.showStats();

// Clear cache if needed
await MCPToolCacheAdmin.clearCache();

// Health check
const health = await MCPToolCacheAdmin.healthCheck();
console.log('Cache healthy:', health.healthy);
```

### Environment Configuration

```env
# Cache TTL in seconds (default: 86400 = 24 hours)
MCP_CACHE_TTL=86400

# Maximum memory cache entries (default: 100)
MCP_CACHE_MAX_MEMORY=100

# Enable/disable caching (default: true)
MCP_CACHE_ENABLED=true

# Cache key prefix (default: mcp:tools)
MCP_CACHE_PREFIX=mcp:tools
```

## Architecture

### Cache Flow

```
Request → Memory Cache → Redis Cache → MCP Server
   ↑         ↓              ↓            ↓
   └─────────┴──────────────┴────────────┘
           Cache Miss - Fetch & Store
```

### Memory Cache (LRU)

- **Type**: Least Recently Used eviction
- **Size**: Configurable (default: 100 entries)
- **Access**: O(1) lookup and update
- **Persistence**: Process lifetime only

### Redis Cache

- **Type**: Distributed persistent cache
- **TTL**: Configurable expiration (default: 24 hours)
- **Access**: Network latency (~1-5ms)
- **Persistence**: Survives server restarts

## Performance Characteristics

| Operation   | Memory Cache | Redis Cache   | MCP Server |
| ----------- | ------------ | ------------- | ---------- |
| Latency     | ~1μs         | ~1-5ms        | ~100-500ms |
| Capacity    | ~100 entries | ~10K+ entries | Unlimited  |
| Persistence | Process only | Durable       | N/A        |

## Cache Invalidation

### Automatic Invalidation

- **TTL Expiration**: Entries automatically expire after configured TTL
- **Permission Changes**: Cache cleared when `allowWrite` permission changes
- **LRU Eviction**: Oldest entries evicted when memory cache is full

### Manual Invalidation

```typescript
// Invalidate specific server configuration
await cache.invalidateCache(options);

// Clear all caches
await cache.clearAll();
```

## Monitoring & Diagnostics

### Cache Metrics

```typescript
const stats = await cache.getStats();
console.log({
  memorySize: stats.memorySize, // Entries in memory
  redisKeys: stats.redisKeys, // Keys in Redis
  hitRate: stats.hitRate, // Success ratio
});
```

### Health Checks

```typescript
const health = await MCPToolCacheAdmin.healthCheck();
// Returns: { healthy: boolean, details: {...} }
```

### Cache Warming

```typescript
// Pre-populate cache with common configurations
await MCPToolCacheAdmin.warmCache([
  { url: 'https://common-server.com/mcp', allowWrite: false },
  { url: 'https://admin-server.com/mcp', allowWrite: true },
]);
```

## Error Handling

The cache system implements comprehensive error handling:

- **Redis Unavailable**: Falls back to memory cache only
- **Parsing Errors**: Treats as cache miss, refetches from server
- **Network Issues**: Graceful degradation with logging
- **Serialization Errors**: Detailed error logging with context

## Testing

```bash
# Run cache tests
yarn test __tests__/lib/ai/mcp/tool-cache.test.ts

# Test specific scenarios
yarn test --testNamePattern="cache key generation"
```

## Best Practices

### Do's ✅

- Initialize cache on application startup
- Monitor cache hit rates in production
- Use environment variables for configuration
- Implement cache warming for critical tools

### Don'ts ❌

- Don't manually clear cache frequently (impacts performance)
- Don't use very short TTL values (defeats caching purpose)
- Don't ignore cache health check failures
- Don't store sensitive data in cache keys (headers are hashed)

## Security Considerations

- **Header Hashing**: Authentication tokens are hashed, not stored plaintext
- **Key Isolation**: Different users/permissions get separate cache entries
- **TTL Protection**: Expired entries are automatically cleaned up
- **Error Logging**: Sensitive data is redacted from error logs

## Future Enhancements

- **Distributed Cache Warming**: Coordinate cache warming across instances
- **Cache Analytics**: Detailed performance metrics and trending
- **Smart TTL**: Dynamic TTL based on tool change frequency
- **Cache Compression**: Reduce memory usage for large tool sets

## Troubleshooting

### Cache Not Working

1. Check Redis connectivity: `await MCPToolCacheAdmin.healthCheck()`
2. Verify environment variables are set correctly
3. Check logs for cache-related errors
4. Ensure `MCP_CACHE_ENABLED=true`

### Poor Cache Performance

1. Monitor hit rate: `await MCPToolCacheAdmin.showStats()`
2. Check TTL configuration (too short = frequent misses)
3. Verify memory cache size is adequate
4. Review key generation for uniqueness

### Memory Issues

1. Reduce `MCP_CACHE_MAX_MEMORY` setting
2. Monitor memory cache eviction patterns
3. Consider shorter TTL for Redis entries
4. Check for cache key leaks
