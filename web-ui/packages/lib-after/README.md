# @compliance-theater/after

AfterManager utility for managing teardown/cleanup hooks in the Title IX Victim Advocacy Platform.

## Overview

`AfterManager` is a centralized singleton for registering and executing cleanup handlers that should run during application teardown or at specific lifecycle points. It provides a process-global registry that survives module reloads and integrates with process exit handlers.

## Features

- **Singleton Pattern**: Process-global instance using webpack-safe Symbol-based registration
- **Named Queues**: Organize handlers into logical groups (e.g., 'teardown', 'cleanup')
- **Timeout Protection**: Handlers have a default 7.5s timeout to prevent hanging
- **Process Exit Integration**: Automatically hooks into process exit via `prexit` module
- **Type-Safe**: Full TypeScript support with generics

## Usage

### Basic Usage

```typescript
import AfterManager from '@compliance-theater/after';

const manager = AfterManager.getInstance();

// Register a cleanup handler
manager.add('teardown', async () => {
  await closeDatabase();
  await flushLogs();
});

// Signal the queue to execute handlers
await manager.signal('teardown');
```

### Process Exit Integration

```typescript
import AfterManager from '@compliance-theater/after';

// Register a handler to run on process exit
AfterManager.processExit(async () => {
  console.log('Cleaning up before exit...');
  await cleanup();
});

// Check how many handlers are registered
const count = AfterManager.processExit();
console.log(`${count} handlers registered for process exit`);
```

### Multiple Queues

```typescript
const manager = AfterManager.getInstance();

// Create different queues for different purposes
manager.add('database-cleanup', async () => {
  await db.disconnect();
});

manager.add('file-cleanup', async () => {
  await fs.cleanupTempFiles();
});

// Signal specific queues
await manager.signal('database-cleanup');
await manager.signal('file-cleanup');
```

### Removing Handlers

```typescript
const handler = async () => {
  await cleanup();
};

manager.add('teardown', handler);

// Later, remove the handler
const removed = manager.remove('teardown', handler);
```

## API Reference

### Static Methods

#### `getInstance(): AfterManager`

Returns the process-global singleton instance. Creates and initializes the instance if it doesn't exist.

#### `processExit(): number`
#### `processExit(cb: () => Promise<void>): void`

Overloaded method for process exit integration:
- Without arguments: Returns the number of handlers registered for teardown
- With callback: Registers the callback on the 'teardown' queue

#### `isBranded<T>(check: T): boolean`

Type guard to check if a value has been branded by the manager (used internally for timeout detection).

#### `asBranded<T>(check: T): T & { __brand: symbol }`

Brands a value with the manager's symbol (used internally for timeout sentinels).

### Instance Methods

#### `add(queueName: string, handler: TAfterHandler<void>): boolean`

Registers a handler for the named queue. Returns `true` if the handler was added, `false` if it was already present.

#### `remove(queueName: string, handler: TAfterHandler<void>): boolean`

Removes a handler from the queue. Returns `true` if the handler was removed, `false` if it wasn't found.

#### `queue(queueName: string): Array<TAfterHandler<void>>`
#### `queue(queueName: string, create: true): Array<TAfterHandler<void>>`
#### `queue(queueName: string, create: false): undefined | Array<TAfterHandler<void>>`

Returns a shallow copy of the handlers for the named queue:
- With `create: true`: Creates the queue if it doesn't exist
- With `create: false`: Returns `undefined` if the queue doesn't exist
- Without second argument: Returns an array (doesn't create if missing)

#### `signal(signalName: string): Promise<void>`

Executes all handlers for the named queue in registration order. Waits for all handlers to complete or until the timeout (7.5s). Handlers that don't complete within the timeout will be logged but won't block the signal from completing.

## Dependencies

- `@compliance-theater/logger` - For error logging
- `@compliance-theater/typescript` - For SingletonProvider utility
- `prexit` - For process exit handler registration

## Implementation Details

- Uses Symbol.for() for webpack-safe singleton registration
- Stores singleton instance in SingletonProvider to survive hot module reloads
- Lazy-loads `prexit` module only when needed
- Handlers execute concurrently via Promise.all
- Timeout protection prevents handlers from hanging indefinitely
- All arrays returned by `queue()` are shallow copies to prevent external mutation

## License

Part of the Title IX Victim Advocacy Platform
