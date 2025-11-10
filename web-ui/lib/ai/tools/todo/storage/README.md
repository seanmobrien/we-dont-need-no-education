# Todo Storage Strategies

This directory contains pluggable storage strategies for the todo-list management system.

## Overview

The todo storage system uses a strategy pattern to support multiple storage backends:
- **In-Memory**: Fast, ephemeral storage (default)
- **Redis**: Persistent, distributed storage with TTL and user segmentation

## Architecture

```
TodoManager
    ↓ (uses)
TodoStorageStrategy (interface)
    ↓ (implemented by)
├── InMemoryStorageStrategy
└── RedisStorageStrategy
```

## Configuration

Storage strategy is configured via the `todo_storage_strategy` feature flag in `web-ui/lib/site-util/feature-flags/known-feature.ts`.

### Default Configuration (In-Memory)

```typescript
// No configuration needed - in-memory is the default
const manager = getTodoManager();
```

### Redis Configuration

1. Set environment variables:
```bash
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-password-here
```

2. Set the feature flag (via Flagsmith or environment):
```typescript
// In your feature flag service or environment config
todo_storage_strategy = "redis"
```

3. Use the factory method:
```typescript
import { createTodoManagerFromFeatureFlag } from '@/lib/ai/tools/todo/todo-manager-factory';

// Creates manager with storage strategy based on feature flag
const manager = await createTodoManagerFromFeatureFlag(userId);
```

## Storage Strategy Interface

All storage strategies implement the `TodoStorageStrategy` interface:

```typescript
interface TodoStorageStrategy {
  upsertTodoList(list: TodoList, userId?: string): Promise<void>;
  getTodoList(listId: string, userId?: string, options?: { completed?: boolean }): Promise<TodoList | undefined>;
  getTodoLists(userId?: string, options?: { completed?: boolean }): Promise<TodoList[]>;
  deleteTodoList(listId: string, userId?: string): Promise<boolean>;
  
  upsertTodo(todo: Todo, listId: string, userId?: string): Promise<void>;
  getTodo(todoId: string, userId?: string): Promise<Todo | undefined>;
  getTodos(userId?: string, completed?: boolean): Promise<Todo[]>;
  deleteTodo(todoId: string, userId?: string): Promise<boolean>;
  
  getTodoToListMapping(todoId: string, userId?: string): Promise<string | undefined>;
  getCount(userId?: string): Promise<number>;
  clearAll(userId?: string): Promise<void>;
}
```

## User Segmentation

Only the Redis storage strategy supports true user segmentation via the optional `userId` parameter for multi-tenant deployments. The in-memory strategy does **not** segment data by user and should only be used for single-user or local development scenarios.

```typescript
// With Redis strategy, all operations are scoped to the provided userId
const manager = await createTodoManagerFromFeatureFlag('user-123');
await manager.createTodo('User-specific task');

// ⚠️ With in-memory strategy, all data is shared across users. Do not use for multi-tenant deployments.
```

## Graceful Fallback

When using Redis strategy, the system can be configured to fall back to in-memory storage if Redis is unavailable:

```typescript
import { createStorageStrategy } from '@/lib/ai/tools/todo/storage';
import { InMemoryStorageStrategy } from '@/lib/ai/tools/todo/storage/in-memory-storage';

const fallback = new InMemoryStorageStrategy();
const storage = await createStorageStrategy('redis', { enableFallback: true }, fallback);
```

## Redis Key Patterns

The Redis storage strategy uses the following key patterns:

- Lists: `todo:list[:user:USER_ID]:LIST_ID`
- Todos: `todo:todo[:user:USER_ID]:TODO_ID`
- Mappings: `todo:mapping[:user:USER_ID]:TODO_ID`

Example:
```
todo:list:user:alice:case-123-plan
todo:todo:user:alice:task-456
todo:mapping:user:alice:task-456  -> "case-123-plan"
```

## Testing

Run the storage strategy tests:

```bash
cd web-ui
yarn test __tests__/lib/ai/tools/todo/storage.test.ts
```

## Migration

To migrate from the current in-memory system to Redis:

1. Set up Redis instance
2. Configure environment variables
3. Enable the `todo_storage_strategy` feature flag
4. Restart the application

Note: Existing in-memory data will not be migrated automatically. Consider implementing a migration script if needed.
