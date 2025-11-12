/**
 * @jest-environment node
 */
/**
 * Tests for the Todo Manager and Todo Tools
 */

import { Session } from '@auth/core/types';
import { TodoManager, getTodoManager } from '@/lib/ai/tools/todo/todo-manager';
import {
  createTodoCallback,
  getTodosCallback,
  updateTodoCallback,
  deleteTodoCallback,
  toggleTodoCallback,
} from '@/lib/ai/tools/todo/tool-callback';

import { auth } from '@/auth';
import { hideConsoleOutput } from '@/__tests__/test-utils';

type SerializedTodo = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  status: 'pending' | 'active' | 'complete';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt: string;
};

type SerializedTodoList = {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'active' | 'complete';
  priority: 'high' | 'medium' | 'low';
  todos: SerializedTodo[];
  createdAt?: string;
  updatedAt?: string;
};

type SerializedDeleteResult = {
  success: boolean;
  id: string;
};
const idPrefix = `todo::user-test-user-id::`;

describe('TodoManager', () => {
  let manager: TodoManager;
  let mockSession: Session;

  beforeEach(() => {
    // Create a fresh manager for each test
    manager = new TodoManager();

    // Setup mock session
    mockSession = {
      id: 1,
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        image: '',
        subject: 'test-subject',
      },
      expires: new Date(Date.now() + 3600000).toISOString(),
    };
  });

  afterEach(() => {
    //jest.clearAllMocks();
  });

  it('should create a new todo', async () => {
    const todo = await manager.createTodo('Test Todo', 'Test Description', {
      session: mockSession,
    });

    expect(todo).toBeDefined();
    expect(todo.title).toBe('Test Todo');
    expect(todo.description).toBe('Test Description');
    expect(todo.completed).toBe(false);
    expect(todo.status).toBe('pending');
    expect(todo.priority).toBe('medium');
    expect(todo.id).toBeDefined();
  });

  it('should get all todos', async () => {
    await manager.createTodo('Todo 1', undefined, { session: mockSession });
    await manager.createTodo('Todo 2', undefined, { session: mockSession });

    const todos = await manager.getTodos({ session: mockSession });
    expect(todos).toHaveLength(2);
  });

  it('should filter todos by completion status', async async () => {
    const todo1 = await await manager.createTodo('Todo 1', undefined, {
      session: mockSession,
    });
    await await manager.createTodo('Todo 2', undefined, { session: mockSession });

    await manager.updateTodo(
      todo1.id,
      { completed: true },
      { session: mockSession },
    );

    const completedTodos = await manager.getTodos({
      completed: true,
      session: mockSession,
    });
    const incompleteTodos = await manager.getTodos({
      completed: false,
      session: mockSession,
    });

    expect(completedTodos).toHaveLength(1);
    expect(incompleteTodos).toHaveLength(1);
  });

  it('should update a todo', async () => {
    const todo = await manager.createTodo('Original Title', undefined, {
      session: mockSession,
    });

    const updated = await manager.updateTodo(
      todo.id,
      {
        title: 'Updated Title',
        completed: true,
        priority: 'high',
      },
      { session: mockSession },
    );

    expect(updated).toBeDefined();
    expect(updated?.title).toBe('Updated Title');
    expect(updated?.completed).toBe(true);
    expect(updated?.status).toBe('complete');
    expect(updated?.priority).toBe('high');
  });

  it('should delete a todo', async () => {
    const todo = await manager.createTodo('To Delete', undefined, {
      session: mockSession,
    });

    expect(await manager.getCount({ session: mockSession })).toBe(1);

    const deleted = await manager.deleteTodo(todo.id, { session: mockSession });

    expect(deleted).toBe(true);
    expect(await manager.getCount({ session: mockSession })).toBe(0);
  });

  it('should toggle todo progression and update list status', async () => {
    const list = await manager.upsertTodoList(
      {
        title: 'Toggle Workflow',
        status: 'pending',
        todos: [
          {
            title: 'Toggle Me',
            status: 'pending',
            completed: false,
          },
        ],
      },
      { session: mockSession },
    );

    expect(list.status).toBe('pending');
    const initialTodoId = list.todos[0].id;

    const firstToggle = await manager.toggleTodo(initialTodoId, {
      session: mockSession,
    });
    const firstTodo = firstToggle?.todos.find((t) => t.id === initialTodoId);
    expect(firstTodo?.status).toBe('active');
    expect(firstTodo?.completed).toBe(false);
    expect(firstToggle?.status).toBe('active');

    const secondToggle = manager.toggleTodo('case-toggle-task');
    const secondTodo = secondToggle?.todos.find(
      (t) => t.id === 'case-toggle-task',
    );
    expect(secondTodo?.status).toBe('complete');
    expect(secondTodo?.completed).toBe(true);
    expect(secondToggle?.status).toBe('complete');

    const thirdToggle = manager.toggleTodo('case-toggle-task');
    const thirdTodo = thirdToggle?.todos.find(
      (t) => t.id === 'case-toggle-task',
    );
    expect(thirdTodo?.status).toBe('active');
    expect(thirdTodo?.completed).toBe(false);
    expect(thirdToggle?.status).toBe('active');
  });

  it('should return undefined for non-existent todo', () => {
    const result = manager.getTodo('non-existent-id');
    expect(result).toBeUndefined();
  });

  it('should upsert and replace todo lists', () => {
    const initial = manager.upsertTodoList({
      id: 'case-123-plan',
      title: 'Case 123 Plan',
      todos: [
        {
          id: 'case-123-intake',
          title: 'Capture intake notes',
          status: 'pending',
          priority: 'high',
        },
      ],
    });

    expect(initial.todos).toHaveLength(1);
    expect(manager.getTodos()).toHaveLength(1);

    const replaced = manager.upsertTodoList({
      id: 'case-123-plan',
      title: 'Case 123 Plan (Updated)',
      todos: [
        {
          id: 'case-123-summary',
          title: 'Publish summary report',
          status: 'active',
          priority: 'medium',
        },
      ],
    });

    expect(replaced.todos).toHaveLength(1);
    expect(replaced.todos[0].id).toBe('case-123-summary');
    expect(manager.getTodos()).toHaveLength(1);
    expect(manager.getTodo('case-123-intake')).toBeUndefined();
  });
});
const mockConsole = hideConsoleOutput();

describe('Todo Tool Callbacks', () => {
  beforeEach(() => {
    // Clear the singleton instance
    const manager = getTodoManager();
    manager.clearAll();
  });

  it('createTodoCallback should create a todo list and return success', () => {
    const result = createTodoCallback({
      listId: 'case-001-plan',
      title: 'Case 001 Plan',
      description: 'Intake and interim measures',
      status: 'active',
      priority: 'high',
      todos: [
        {
          id: todoIdPrefix + 'case-001-intake',
          title: 'Conduct intake interview',
          status: 'active',
          priority: 'high',
        },
        {
          title: 'Notify Title IX coordinator',
          status: 'pending',
          priority: 'medium',
        },
      ],
    });

    expect(result.structuredContent.result.isError).toBeFalsy();

    if (!result.structuredContent.result.isError) {
      const list = result.structuredContent.result.value as
        | SerializedTodoList
        | undefined;
      expect(list).toBeDefined();
      expect(list?.id).toBe(todoIdPrefix + 'case-001-plan');
      expect(list?.title).toBe('Case 001 Plan');
      expect(list?.status).toBe('active');
      expect(list?.priority).toBe('high');
      expect(list?.todos).toHaveLength(2);
      expect(list?.todos[0].title).toBe('Conduct intake interview');
      expect(list?.todos[0].status).toBe('active');
      expect(list?.todos[1].status).toBe('pending');
    }
  });

  it('createTodoCallback should replace an existing list when ids match', () => {
    const firstResult = createTodoCallback({
      listId: 'case-002-plan',
      title: 'Case 002 Plan',
      todos: [
        {
          id: todoIdPrefix + 'case-002-outreach',
          title: 'Perform outreach',
          status: 'pending',
        },
      ],
    });

    expect(firstResult.structuredContent.result.isError).toBeFalsy();

    const replacementResult = createTodoCallback({
      listId: 'case-002-plan',
      title: 'Case 002 Plan (Revised)',
      todos: [
        {
          id: todoIdPrefix + 'case-002-summary',
          title: 'Finalize summary report',
          status: 'active',
        },
      ],
    });

    expect(replacementResult.structuredContent.result.isError).toBeFalsy();

    if (!replacementResult.structuredContent.result.isError) {
      const list = replacementResult.structuredContent.result.value as
        | SerializedTodoList
        | undefined;
      expect(list?.todos).toHaveLength(1);
      expect(list?.todos?.[0].id).toBe(todoIdPrefix + 'case-002-summary');
      expect(list?.title).toBe('Case 002 Plan (Revised)');
    }
  });

  it('getTodosCallback should return all todo lists', () => {
    createTodoCallback({
      listId: 'case-003-plan',
      title: 'Case 003 Plan',
      todos: [
        {
          id: todoIdPrefix + 'case-003-intake',
          title: 'Collect intake statement',
        },
      ],
    });

    createTodoCallback({
      listId: 'case-003-followup',
      title: 'Case 003 Follow Up',
      todos: [
        {
          id: todoIdPrefix + 'case-003-wellness',
          title: 'Schedule wellness check-in',
        },
      ],
    });

    const result = await getTodosCallback({});

    expect(result.structuredContent.result.isError).toBeFalsy();

    if (!result.structuredContent.result.isError) {
      const items = result.structuredContent.result.items as
        | SerializedTodoList[]
        | undefined;
      expect(items).toBeDefined();
      expect(items).toHaveLength(2);
      const listIds = items?.map((list) => list?.id);
      expect(listIds).toContain(todoIdPrefix + 'case-003-plan');
      expect(listIds).toContain(todoIdPrefix + 'case-003-followup');
    }
  });

  it('getTodosCallback should return a specific list when listId provided', () => {
    createTodoCallback({
      listId: 'case-004-plan',
      title: 'Case 004 Plan',
      todos: [
        {
          id: todoIdPrefix + 'case-004-document',
          title: 'Document evidence timeline',
        },
      ],
    });

    const result = getTodosCallback({ listId: 'case-004-plan' });

    expect(result.structuredContent.result.isError).toBeFalsy();

    if (!result.structuredContent.result.isError) {
      const value = result.structuredContent.result.value as
        | SerializedTodoList
        | undefined;
      expect(value).toBeDefined();
      expect(value?.id).toBe(todoIdPrefix + 'case-004-plan');
      expect(value?.todos).toHaveLength(1);
      expect(value?.todos?.[0].title).toBe('Document evidence timeline');
    }
  });

  it('updateTodoCallback should update a todo', () => {
    const createResult = createTodoCallback({
      listId: 'case-005-plan',
      title: 'Case 005 Plan',
      todos: [
        {
          id: todoIdPrefix + 'case-005-original',
          title: 'Original',
          status: 'pending',
        },
      ],
    });

    if (createResult.structuredContent.result.isError) {
      throw new Error('Failed to create todo list');
    }

    const list = createResult.structuredContent.result.value as
      | SerializedTodoList
      | undefined;
    const todoId = list?.todos?.[0].id;

    const updateResult = await updateTodoCallback({
      id: todoId!,
      title: 'Updated',
      completed: true,
      priority: 'high',
    });

    expect(updateResult.structuredContent.result.isError).toBeFalsy();

    if (!updateResult.structuredContent.result.isError) {
      const todo = updateResult.structuredContent.result.value as
        | SerializedTodo
        | undefined;
      expect(todo?.title).toBe('Updated');
      expect(todo?.completed).toBe(true);
      expect(todo?.status).toBe('complete');
      expect(todo?.priority).toBe('high');
    }
  });

  it('deleteTodoCallback should delete a todo', () => {
    const createResult = createTodoCallback({
      listId: 'case-006-plan',
      title: 'Case 006 Plan',
      todos: [{ id: todoIdPrefix + 'case-006-delete', title: 'To Delete' }],
    });

    if (createResult.structuredContent.result.isError) {
      throw new Error('Failed to create todo list');
    }

    const list = createResult.structuredContent.result.value as
      | SerializedTodoList
      | undefined;
    const todoId = list?.todos?.[0].id;

    const deleteResult = await deleteTodoCallback({ id: todoId! });

    expect(deleteResult.structuredContent.result.isError).toBeFalsy();

    if (!deleteResult.structuredContent.result.isError) {
      const deletion = deleteResult.structuredContent.result.value as
        | SerializedDeleteResult
        | undefined;
      expect(deletion?.success).toBe(true);
    }
  });

  it('toggleTodoCallback should advance todo and list states', () => {
    const createResult = createTodoCallback({
      listId: 'case-007-plan',
      title: 'Case 007 Plan',
      todos: [{ id: todoIdPrefix + 'case-007-toggle', title: 'Toggle Me' }],
    });

    if (createResult.structuredContent.result.isError) {
      throw new Error('Failed to create todo list');
    }

    const list = createResult.structuredContent.result.value as
      | SerializedTodoList
      | undefined;
    const todoId = list?.todos?.[0].id;

    const toggleResult1 = await toggleTodoCallback({ id: todoId! });
    expect(toggleResult1.structuredContent.result.isError).toBeFalsy();

    if (!toggleResult1.structuredContent.result.isError) {
      const updatedList = toggleResult1.structuredContent.result.value as
        | SerializedTodoList
        | undefined;
      const toggledTodo = updatedList?.todos.find((todo) => todo.id === todoId);
      expect(updatedList?.status).toBe('active');
      expect(toggledTodo?.status).toBe('active');
      expect(toggledTodo?.completed).toBe(false);
    }

    const toggleResult2 = await toggleTodoCallback({ id: todoId! });
    expect(toggleResult2.structuredContent.result.isError).toBeFalsy();

    if (!toggleResult2.structuredContent.result.isError) {
      const updatedList = toggleResult2.structuredContent.result.value as
        | SerializedTodoList
        | undefined;
      const toggledTodo = updatedList?.todos.find((todo) => todo.id === todoId);
      expect(updatedList?.status).toBe('complete');
      expect(toggledTodo?.status).toBe('complete');
      expect(toggledTodo?.completed).toBe(true);
    }

    const toggleResult3 = await toggleTodoCallback({ id: todoId! });
    expect(toggleResult3.structuredContent.result.isError).toBeFalsy();

    if (!toggleResult3.structuredContent.result.isError) {
      const updatedList = toggleResult3.structuredContent.result.value as
        | SerializedTodoList
        | undefined;
      const toggledTodo = updatedList?.todos.find((todo) => todo.id === todoId);
      expect(updatedList?.status).toBe('active');
      expect(toggledTodo?.status).toBe('active');
      expect(toggledTodo?.completed).toBe(false);
    }
  });

  it('should return error for non-existent todo', async () => {
    const result = await updateTodoCallback({
      id: 'non-existent',
      title: 'Should Fail',
    });

    expect(result.structuredContent.result.isError).toBe(true);
  });
});
