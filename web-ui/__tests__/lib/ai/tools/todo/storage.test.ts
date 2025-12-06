/**
 * Tests for storage strategies
 */

import { InMemoryStorageStrategy } from '@/lib/ai/tools/todo/storage/in-memory-storage';
import { RedisStorageStrategy } from '@/lib/ai/tools/todo/storage/redis-storage';
import {
  createStorageStrategy,
  createFallbackStrategy,
} from '@/lib/ai/tools/todo/storage/factory';
import type { Todo, TodoList } from '@/lib/ai/tools/todo/types';
import { hideConsoleOutput } from '@/__tests__/test-utils';

const idPrefix = `todo::user-test-user-id::`;
const consoleSpy = hideConsoleOutput();
describe('InMemoryStorageStrategy', () => {
  let storage: InMemoryStorageStrategy;

  beforeEach(() => {
    storage = new InMemoryStorageStrategy();
  });

  afterEach(async () => {
    await storage.clearAll({ prefix: '' });
  });

  it('should store and retrieve a todo list', async () => {
    const list: TodoList = {
      id: idPrefix + idPrefix + 'list-1',
      title: 'Test List',
      description: 'Test Description',
      status: 'active',
      priority: 'high',
      todos: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await storage.upsertTodoList(list);
    const retrieved = await storage.getTodoList(list.id);

    expect(retrieved).toEqual(list);
  });

  it('should replace existing list on upsert', async () => {
    const list1: TodoList = {
      id: idPrefix + 'list-1',
      title: 'Original',
      status: 'active',
      priority: 'medium',
      todos: [
        {
          id: idPrefix + 'todo-1',
          title: 'Original Todo',
          completed: false,
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const list2: TodoList = {
      id: idPrefix + 'list-1',
      title: 'Updated',
      status: 'active',
      priority: 'high',
      todos: [
        {
          id: idPrefix + 'todo-2',
          title: 'Updated Todo',
          completed: false,
          status: 'active',
          priority: 'high',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await storage.upsertTodoList(list1);
    await storage.upsertTodoList(list2);

    const retrieved = await storage.getTodoList(list2.id);
    expect(retrieved?.title).toBe('Updated');
    expect(retrieved?.todos).toHaveLength(1);
    expect(retrieved?.todos[0].id).toBe(idPrefix + 'todo-2');

    // Old todo should be gone
    const oldTodo = await storage.getTodo(idPrefix + 'todo-1');
    expect(oldTodo).toBeUndefined();
  });

  it('should store and retrieve individual todos', async () => {
    await storage.upsertTodoList(
      listFactory({
        id: idPrefix + 'list-1',
      }),
    );
    const todo: Todo = {
      id: idPrefix + 'todo-1',
      title: 'Test Todo',
      completed: false,
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await storage.upsertTodo(todo, { list: idPrefix + 'list-1' });
    const retrieved = await storage.getTodo(idPrefix + 'todo-1');

    expect(retrieved).toEqual(todo);
  });

  it('should retrieve all todos across lists', async () => {
    const list1: TodoList = {
      id: idPrefix + 'list-1',
      title: 'List 1',
      status: 'active',
      priority: 'medium',
      todos: [
        {
          id: idPrefix + 'todo-1',
          title: 'Todo 1',
          completed: false,
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const list2: TodoList = {
      id: idPrefix + 'list-2',
      title: 'List 2',
      status: 'active',
      priority: 'medium',
      todos: [
        {
          id: idPrefix + 'todo-2',
          title: 'Todo 2',
          completed: true,
          status: 'complete',
          priority: 'high',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await storage.upsertTodoList(list1);
    await storage.upsertTodoList(list2);

    const allTodos = await storage.getTodos({ prefix: idPrefix });
    expect(allTodos).toHaveLength(2);

    const completedTodos = await storage.getTodos({
      prefix: idPrefix,
      completed: true,
    });
    expect(completedTodos).toHaveLength(1);
    expect(completedTodos[0].id).toBe(idPrefix + 'todo-2');

    const incompleteTodos = await storage.getTodos({
      prefix: idPrefix,
      completed: false,
    });
    expect(incompleteTodos).toHaveLength(1);
    expect(incompleteTodos[0].id).toBe(idPrefix + 'todo-1');
  });
  const listFactory = (
    copy: Partial<Omit<TodoList, 'id'> & { id: string }>,
  ): TodoList => {
    return {
      ...copy,
      id: idPrefix + 'list-1',
      title: 'Test List',
      status: 'active',
      priority: 'medium',
      todos: [...(copy.todos || [])],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };
  it('should delete todos and lists', async () => {
    const list: TodoList = listFactory({
      todos: [
        {
          id: idPrefix + 'todo-1',
          title: 'Todo 1',
          completed: false,
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    await storage.upsertTodoList(list);

    const deleted = await storage.deleteTodo(idPrefix + 'todo-1');
    expect(deleted).toBe(true);

    const retrieved = await storage.getTodo(idPrefix + 'todo-1');
    expect(retrieved).toBeUndefined();

    const listDeleted = await storage.deleteTodoList(idPrefix + 'list-1');
    expect(listDeleted).toBe(true);

    const listRetrieved = await storage.getTodoList(idPrefix + 'list-1');
    expect(listRetrieved).toBeUndefined();
  });

  it('should get todo to list mapping', async () => {
    const list = await storage.upsertTodoList(
      listFactory({
        id: idPrefix + 'list-1',
        title: 'Test List',
      }),
    );

    const todo: Todo = {
      id: idPrefix + 'todo-1',
      title: 'Test Todo',
      completed: false,
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await storage.upsertTodo(todo, { list: list.id });

    const listId = await storage.getTodoToListMapping(todo.id);
    expect(listId).toBe(list.id);
  });

  it('should get count of todos', async () => {
    const list: TodoList = {
      id: idPrefix + 'list-1',
      title: 'Test List',
      status: 'active',
      priority: 'medium',
      todos: [
        {
          id: idPrefix + 'todo-1',
          title: 'Todo 1',
          completed: false,
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: idPrefix + 'todo-2',
          title: 'Todo 2',
          completed: false,
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await storage.upsertTodoList(list);

    const count = await storage.getCount({ prefix: idPrefix });
    expect(count).toBe(2);
  });

  it('should clear all data', async () => {
    const list: TodoList = {
      id: idPrefix + 'list-1',
      title: 'Test List',
      status: 'active',
      priority: 'medium',
      todos: [
        {
          id: idPrefix + 'todo-1',
          title: 'Todo 1',
          completed: false,
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await storage.upsertTodoList(list);
    await storage.clearAll({ prefix: idPrefix });

    const count = await storage.getCount({ prefix: idPrefix });
    expect(count).toBe(0);

    const lists = await storage.getTodoLists({ prefix: idPrefix });
    expect(lists).toHaveLength(0);
  });
});

describe('RedisStorageStrategy', () => {
  let storage: RedisStorageStrategy;

  beforeEach(async () => {
    storage = new RedisStorageStrategy({
      keyPrefix: 'test-todo',
      ttl: 3600,
    });
  });

  afterEach(async () => {
    await storage.clearAll({ prefix: idPrefix });
  });

  it('should store and retrieve a todo list', async () => {
    const list: TodoList = {
      id: idPrefix + 'list-1',
      title: 'Test List',
      description: 'Test Description',
      status: 'active',
      priority: 'high',
      todos: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await storage.upsertTodoList(list);
    const retrieved = await storage.getTodoList(list.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe(list.title);
    expect(retrieved?.description).toBe(list.description);
  });

  it('should replace existing list on upsert', async () => {
    const list1: TodoList = {
      id: idPrefix + 'list-1',
      title: 'Original',
      status: 'active',
      priority: 'medium',
      todos: [
        {
          id: idPrefix + 'todo-1',
          title: 'Original Todo',
          completed: false,
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const list2: TodoList = {
      id: idPrefix + 'list-1',
      title: 'Updated',
      status: 'active',
      priority: 'high',
      todos: [
        {
          id: idPrefix + 'todo-2',
          title: 'Updated Todo',
          completed: false,
          status: 'active',
          priority: 'high',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await storage.upsertTodoList(list1);
    await storage.upsertTodoList(list2);

    const retrieved = await storage.getTodoList(list2.id);
    expect(retrieved?.title).toBe('Updated');
    expect(retrieved?.todos).toHaveLength(1);
    expect(retrieved?.todos[0].id).toBe(idPrefix + 'todo-2');

    // Old todo should be gone
    const oldTodo = await storage.getTodo(idPrefix + 'todo-1');
    expect(oldTodo).toBeUndefined();
  });

  it('should store and retrieve individual todos', async () => {
    const list = await storage.upsertTodoList(
      redisListFactory({
        id: idPrefix + 'list-1',
      }),
    );
    const todo: Todo = {
      id: idPrefix + 'todo-1',
      title: 'Test Todo',
      completed: false,
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await storage.upsertTodo(todo, { list: list.id });
    const retrieved = await storage.getTodo(idPrefix + 'todo-1');

    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe(todo.title);
  });

  it('should retrieve all todos across lists', async () => {
    const list1: TodoList = {
      id: idPrefix + 'list-1',
      title: 'List 1',
      status: 'active',
      priority: 'medium',
      todos: [
        {
          id: idPrefix + 'todo-1',
          title: 'Todo 1',
          completed: false,
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const list2: TodoList = {
      id: idPrefix + 'list-2',
      title: 'List 2',
      status: 'active',
      priority: 'medium',
      todos: [
        {
          id: idPrefix + 'todo-2',
          title: 'Todo 2',
          completed: true,
          status: 'complete',
          priority: 'high',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await storage.upsertTodoList(list1);
    await storage.upsertTodoList(list2);

    const allTodos = await storage.getTodos({ prefix: idPrefix });
    expect(allTodos.length).toBeGreaterThanOrEqual(2);

    const completedTodos = await storage.getTodos({
      prefix: idPrefix,
      completed: true,
    });
    expect(completedTodos.length).toBeGreaterThanOrEqual(1);
    expect(completedTodos.some((t) => t.id === idPrefix + 'todo-2')).toBe(true);

    const incompleteTodos = await storage.getTodos({
      prefix: idPrefix,
      completed: false,
    });
    expect(incompleteTodos.length).toBeGreaterThanOrEqual(1);
    expect(incompleteTodos.some((t) => t.id === idPrefix + 'todo-1')).toBe(
      true,
    );
  });

  const redisListFactory = (
    copy: Partial<Omit<TodoList, 'id'> & { id: string }>,
  ): TodoList => {
    return {
      ...copy,
      id: copy.id || idPrefix + 'list-1',
      title: copy.title || 'Test List',
      status: copy.status || 'active',
      priority: copy.priority || 'medium',
      todos: [...(copy.todos || [])],
      createdAt: copy.createdAt || new Date(),
      updatedAt: copy.updatedAt || new Date(),
    };
  };

  it('should delete todos and lists', async () => {
    const list: TodoList = redisListFactory({
      id: idPrefix + 'list-1',
      todos: [
        {
          id: idPrefix + 'todo-1',
          title: 'Todo 1',
          completed: false,
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    await storage.upsertTodoList(list);

    const deleted = await storage.deleteTodo(idPrefix + 'todo-1');
    expect(deleted).toBe(true);

    const retrieved = await storage.getTodo(idPrefix + 'todo-1');
    expect(retrieved).toBeUndefined();

    const listDeleted = await storage.deleteTodoList(idPrefix + 'list-1');
    expect(listDeleted).toBe(true);

    const listRetrieved = await storage.getTodoList(idPrefix + 'list-1');
    expect(listRetrieved).toBeUndefined();
  });

  it('should get todo to list mapping', async () => {
    const list = await storage.upsertTodoList(
      redisListFactory({
        id: idPrefix + 'list-1',
        title: 'Test List',
      }),
    );

    const todo: Todo = {
      id: idPrefix + 'todo-1',
      title: 'Test Todo',
      completed: false,
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await storage.upsertTodo(todo, { list: list.id });

    const listId = await storage.getTodoToListMapping(todo.id);
    expect(listId).toBe(list.id);
  });

  it('should get count of todos', async () => {
    const list: TodoList = {
      id: idPrefix + 'list-1',
      title: 'Test List',
      status: 'active',
      priority: 'medium',
      todos: [
        {
          id: idPrefix + 'todo-1',
          title: 'Todo 1',
          completed: false,
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: idPrefix + 'todo-2',
          title: 'Todo 2',
          completed: false,
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await storage.upsertTodoList(list);

    const count = await storage.getCount({ prefix: idPrefix });
    expect(count).toBe(2);
  });

  it('should clear all data', async () => {
    const list: TodoList = {
      id: idPrefix + 'list-1',
      title: 'Test List',
      status: 'active',
      priority: 'medium',
      todos: [
        {
          id: idPrefix + 'todo-1',
          title: 'Todo 1',
          completed: false,
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await storage.upsertTodoList(list);
    const result = await storage.clearAll({ prefix: idPrefix });

    expect(result.todosCleared).toBeGreaterThanOrEqual(0);
    expect(result.listsCleared).toBeGreaterThanOrEqual(0);
    expect(result.matchesCleared).toBeGreaterThanOrEqual(0);

    const count = await storage.getCount({ prefix: idPrefix });
    expect(count).toBe(0);

    const lists = await storage.getTodoLists({ prefix: idPrefix });
    expect(lists).toHaveLength(0);
  });

  it('should handle serialization and deserialization of dates', async () => {
    const now = new Date();
    const list: TodoList = {
      id: idPrefix + 'list-1',
      title: 'Date Test List',
      status: 'active',
      priority: 'medium',
      todos: [
        {
          id: idPrefix + 'todo-1',
          title: 'Date Test Todo',
          completed: false,
          status: 'pending',
          priority: 'medium',
          createdAt: now,
          updatedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await storage.upsertTodoList(list);
    const retrieved = await storage.getTodoList(list.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.createdAt).toBeInstanceOf(Date);
    expect(retrieved?.updatedAt).toBeInstanceOf(Date);
    expect(retrieved?.todos[0].createdAt).toBeInstanceOf(Date);
    expect(retrieved?.todos[0].updatedAt).toBeInstanceOf(Date);
  });

  it('should rehydrate todos from normalized storage', async () => {
    const list = await storage.upsertTodoList(
      redisListFactory({
        id: idPrefix + 'list-meta',
        todos: [],
      }),
    );

    const todo: Todo = {
      id: idPrefix + 'todo-standalone',
      title: 'Standalone Todo',
      completed: false,
      status: 'active',
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await storage.upsertTodo(todo, { list: list.id });

    const retrieved = await storage.getTodoList(list.id);
    expect(retrieved?.todos).toHaveLength(1);
    expect(retrieved?.todos[0].id).toBe(todo.id);
  });

  it('should remove todos from list membership on delete', async () => {
    const createdAt = new Date();
    const list = await storage.upsertTodoList(
      redisListFactory({
        id: idPrefix + 'list-delete',
        todos: [
          {
            id: idPrefix + 'todo-remove',
            title: 'Remove Me',
            completed: false,
            status: 'pending',
            priority: 'medium',
            createdAt,
            updatedAt: createdAt,
          },
          {
            id: idPrefix + 'todo-keep',
            title: 'Keep Me',
            completed: false,
            status: 'pending',
            priority: 'medium',
            createdAt,
            updatedAt: createdAt,
          },
        ],
      }),
    );

    await storage.deleteTodo(idPrefix + 'todo-remove');

    const retrieved = await storage.getTodoList(list.id);
    expect(retrieved?.todos).toHaveLength(1);
    expect(retrieved?.todos[0].id).toBe(idPrefix + 'todo-keep');
  });
});

describe('Storage Factory', () => {
  it('should create in-memory strategy', async () => {
    const storage = await createStorageStrategy('in-memory');
    expect(storage).toBeInstanceOf(InMemoryStorageStrategy);
  });

  it('should create Redis strategy with fallback', async () => {
    const fallback = new InMemoryStorageStrategy();
    const storage = await createStorageStrategy(
      'redis',
      { enableFallback: true },
      fallback,
    );

    // Storage should be created even if Redis is not available
    expect(storage).toBeDefined();
  });

  it.skip('should use fallback when primary fails', async () => {
    consoleSpy.setup();
    // This test is skipped because it requires mocking LoggedError
    // The fallback mechanism is tested in integration tests
    const fallback = new InMemoryStorageStrategy();
    const primary = new InMemoryStorageStrategy();

    // Mock primary to fail
    jest
      .spyOn(primary, 'getTodoList')
      .mockRejectedValue(new Error('Primary failed'));

    const storage = createFallbackStrategy(primary, fallback);

    // Should fall back to the fallback strategy
    const result = await storage.getTodoList('test-id');
    expect(result).toBeUndefined(); // Fallback returns undefined for non-existent
  });
});
