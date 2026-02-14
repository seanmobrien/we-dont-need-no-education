# @compliance-theater/redis

Redis client utilities for the Title IX Victim Advocacy Platform.

## Overview

This package provides a singleton-managed Redis client with automatic cleanup and support for multiple database connections and subscribe modes.

## Features

- **Singleton Management**: Single Redis connection per configuration (database + mode)
- **Automatic Cleanup**: Integrates with `@compliance-theater/after` for proper resource cleanup on process exit
- **Multiple Databases**: Support for connecting to different Redis databases
- **Subscribe Mode**: Separate client instances for pub/sub operations
- **Error Handling**: Comprehensive error handling and logging
- **Type Safety**: Full TypeScript support with exported types

## Installation

This package is part of the monorepo workspace and is installed automatically when you run `yarn install` in the root directory.

## Usage

### Basic Usage

```typescript
import { getRedisClient } from '@compliance-theater/redis';

// Get default Redis client (database 0, non-subscribe mode)
const redis = await getRedisClient();

// Use Redis operations
await redis.set('key', 'value');
const value = await redis.get('key');
```

### Multiple Databases

```typescript
import { getRedisClient } from '@compliance-theater/redis';

// Connect to different databases
const db0 = await getRedisClient({ database: 0 });
const db1 = await getRedisClient({ database: 1 });
```

### Subscribe Mode

```typescript
import { getRedisClient } from '@compliance-theater/redis';

// Get client for pub/sub operations
const subscriber = await getRedisClient({ subscribeMode: true });

await subscriber.subscribe('channel', (message) => {
  console.log('Received:', message);
});
```

### Manual Cleanup

```typescript
import { closeRedisClient } from '@compliance-theater/redis';

// Close all Redis connections
await closeRedisClient();
```

## API

### `getRedisClient(options?: RedisClientOptions): Promise<RedisClientType>`

Gets or creates a Redis client with the specified options.

**Options:**
- `database?: number` - Redis database number (default: 0)
- `subscribeMode?: boolean` - Enable subscribe features (default: false)

**Returns:** Promise resolving to a Redis client instance

### `closeRedisClient(): Promise<void>`

Closes all Redis client instances.

**Returns:** Promise that resolves when all clients are closed

### Types

- `RedisClientType` - Re-exported from the `redis` package
- `RedisClientOptions` - Options for creating a Redis client

## Configuration

The package uses environment variables from `@compliance-theater/env`:

- `REDIS_URL` - Redis connection URL
- `REDIS_PASSWORD` - Redis password

## Dependencies

- `@compliance-theater/after` - For automatic cleanup
- `@compliance-theater/env` - For environment configuration
- `@compliance-theater/logger` - For logging
- `@compliance-theater/typescript` - For singleton provider
- `redis` (^4.7.0) - Redis client library

## Testing

Run tests for this package:

```bash
cd web-ui/packages/lib-redis
yarn test
```

Or from the workspace root:

```bash
cd web-ui
yarn workspace @compliance-theater/redis test
```

## Implementation Details

### Singleton Pattern

The package uses a process-global singleton provider to ensure that:
- Only one client instance exists per configuration (database + subscribe mode)
- Connections are reused across the application
- Cleanup is centralized and automatic

### Error Handling

All errors are wrapped with `LoggedError` from `@compliance-theater/logger` for consistent error handling and logging.

### Subscribe Mode

When `subscribeMode: false` (default), the client disables all subscribe-related methods to prevent accidental misuse. This ensures error stack traces point to the correct location when subscribe methods are called incorrectly.

## License

See the root LICENSE.md file.
