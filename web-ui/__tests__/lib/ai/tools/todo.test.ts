/**
 * Tests for the Todo Manager and Todo Tools
 */

import { TodoManager, getTodoManager } from '@/lib/ai/tools/todo/todo-manager';
import {
  createTodoCallback,
  getTodosCallback,
  updateTodoCallback,
  deleteTodoCallback,
  toggleTodoCallback,
} from '@/lib/ai/tools/todo/tool-callback';

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

describe('TodoManager', () => {
  let manager: TodoManager;

  beforeEach(() => {
    // Create a fresh manager for each test
    manager = new TodoManager();
  });

  it('should create a new todo', () => {
    const todo = manager.createTodo('Test Todo', 'Test Description');

    expect(todo).toBeDefined();
    expect(todo.title).toBe('Test Todo');
    expect(todo.description).toBe('Test Description');
    expect(todo.completed).toBe(false);
    expect(todo.status).toBe('pending');
    expect(todo.priority).toBe('medium');
    expect(todo.id).toBeDefined();
  });

  it('should get all todos', () => {
    manager.createTodo('Todo 1');
    manager.createTodo('Todo 2');

    const todos = manager.getTodos();
    expect(todos).toHaveLength(2);
  });

  it('should filter todos by completion status', () => {
    const todo1 = manager.createTodo('Todo 1');
    manager.createTodo('Todo 2');

    manager.updateTodo(todo1.id, { completed: true });

    const completedTodos = manager.getTodos(true);
    const incompleteTodos = manager.getTodos(false);

    expect(completedTodos).toHaveLength(1);
    expect(incompleteTodos).toHaveLength(1);
  });

  it('should update a todo', () => {
    const todo = manager.createTodo('Original Title');

    const updated = manager.updateTodo(todo.id, {
      title: 'Updated Title',
      completed: true,
      priority: 'high',
    });

    expect(updated).toBeDefined();
    expect(updated?.title).toBe('Updated Title');
    expect(updated?.completed).toBe(true);
    expect(updated?.status).toBe('complete');
    expect(updated?.priority).toBe('high');
  });

  it('should delete a todo', () => {
    const todo = manager.createTodo('To Delete');

    expect(manager.getCount()).toBe(1);

    const deleted = manager.deleteTodo(todo.id);

    expect(deleted).toBe(true);
    expect(manager.getCount()).toBe(0);
  });

  it('should toggle todo progression and update list status', () => {
    const list = manager.upsertTodoList({
      id: 'case-toggle',
      title: 'Toggle Workflow',
      status: 'pending',
      todos: [
        {
          id: 'case-toggle-task',
          title: 'Toggle Me',
          status: 'pending',
          completed: false,
        },
      ],
    });

    expect(list.status).toBe('pending');

    const firstToggle = manager.toggleTodo('case-toggle-task');
    const firstTodo = firstToggle?.todos.find(
      (t) => t.id === 'case-toggle-task',
    );
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

  describe('User Segmentation', () => {
    it('should create todos with userId', () => {
      const todo = manager.createTodo('Alice Task', undefined, {
        userId: 'user-alice',
      });

      expect(todo.userId).toBe('user-alice');
    });

    it('should filter todos by userId', () => {
      manager.createTodo('Alice Task 1', undefined, { userId: 'user-alice' });
      manager.createTodo('Alice Task 2', undefined, { userId: 'user-alice' });
      manager.createTodo('Bob Task 1', undefined, { userId: 'user-bob' });

      const aliceTodos = manager.getTodos({ userId: 'user-alice' });
      const bobTodos = manager.getTodos({ userId: 'user-bob' });

      expect(aliceTodos).toHaveLength(2);
      expect(bobTodos).toHaveLength(1);
      expect(aliceTodos.every((t) => t.userId === 'user-alice')).toBe(true);
      expect(bobTodos.every((t) => t.userId === 'user-bob')).toBe(true);
    });

    it('should create todo lists with userId', () => {
      const list = manager.upsertTodoList({
        title: 'Alice List',
        userId: 'user-alice',
        todos: [{ title: 'Alice Task' }],
      });

      expect(list.userId).toBe('user-alice');
      expect(list.todos[0].userId).toBe('user-alice');
    });

    it('should filter todo lists by userId', () => {
      manager.upsertTodoList({
        title: 'Alice List',
        userId: 'user-alice',
      });
      manager.upsertTodoList({
        title: 'Bob List',
        userId: 'user-bob',
      });

      const aliceLists = manager.getTodoLists({ userId: 'user-alice' });
      const bobLists = manager.getTodoLists({ userId: 'user-bob' });

      expect(aliceLists).toHaveLength(1);
      expect(bobLists).toHaveLength(1);
      expect(aliceLists[0].userId).toBe('user-alice');
      expect(bobLists[0].userId).toBe('user-bob');
    });

    it('should not allow one user to access another users todo list', () => {
      manager.upsertTodoList({
        id: 'alice-list',
        title: 'Alice List',
        userId: 'user-alice',
      });

      const bobAttempt = manager.getTodoList('alice-list', {
        userId: 'user-bob',
      });

      expect(bobAttempt).toBeUndefined();

      const aliceAccess = manager.getTodoList('alice-list', {
        userId: 'user-alice',
      });
      expect(aliceAccess).toBeDefined();
      expect(aliceAccess?.id).toBe('alice-list');
    });

    it('should not allow one user to update another users todo', () => {
      const aliceTodo = manager.createTodo('Alice Task', undefined, {
        userId: 'user-alice',
      });

      const bobUpdate = manager.updateTodo(
        aliceTodo.id,
        { title: 'Bob Modified' },
        { userId: 'user-bob' },
      );

      expect(bobUpdate).toBeUndefined();

      const aliceUpdate = manager.updateTodo(
        aliceTodo.id,
        { title: 'Alice Modified' },
        { userId: 'user-alice' },
      );

      expect(aliceUpdate).toBeDefined();
      expect(aliceUpdate?.title).toBe('Alice Modified');
    });

    it('should not allow one user to delete another users todo', () => {
      const aliceTodo = manager.createTodo('Alice Task', undefined, {
        userId: 'user-alice',
      });

      const bobDelete = manager.deleteTodo(aliceTodo.id, {
        userId: 'user-bob',
      });

      expect(bobDelete).toBe(false);
      expect(manager.getTodo(aliceTodo.id)).toBeDefined();

      const aliceDelete = manager.deleteTodo(aliceTodo.id, {
        userId: 'user-alice',
      });

      expect(aliceDelete).toBe(true);
      expect(manager.getTodo(aliceTodo.id)).toBeUndefined();
    });

    it('should not allow one user to toggle another users todo', () => {
      manager.upsertTodoList({
        title: 'Alice List',
        userId: 'user-alice',
        todos: [
          {
            id: 'alice-task',
            title: 'Alice Task',
            status: 'pending',
          },
        ],
      });

      const bobToggle = manager.toggleTodo('alice-task', {
        userId: 'user-bob',
      });

      expect(bobToggle).toBeUndefined();

      const aliceToggle = manager.toggleTodo('alice-task', {
        userId: 'user-alice',
      });

      expect(aliceToggle).toBeDefined();
      expect(
        aliceToggle?.todos.find((t) => t.id === 'alice-task')?.status,
      ).toBe('active');
    });

    it('should support separate default lists per user', () => {
      manager.createTodo('Alice Default Task', undefined, {
        userId: 'user-alice',
      });
      manager.createTodo('Bob Default Task', undefined, {
        userId: 'user-bob',
      });

      // Each user should have their own default list
      const aliceLists = manager.getTodoLists({ userId: 'user-alice' });
      const bobLists = manager.getTodoLists({ userId: 'user-bob' });

      expect(aliceLists).toHaveLength(1);
      expect(bobLists).toHaveLength(1);
      expect(aliceLists[0].todos).toHaveLength(1);
      expect(bobLists[0].todos).toHaveLength(1);
      expect(aliceLists[0].todos[0].title).toBe('Alice Default Task');
      expect(bobLists[0].todos[0].title).toBe('Bob Default Task');
    });

    it('should allow todos without userId for backward compatibility', () => {
      const genericTodo = manager.createTodo('Generic Task');

      expect(genericTodo.userId).toBeUndefined();

      const allTodos = manager.getTodos();
      expect(allTodos).toHaveLength(1);

      const noUserTodos = manager.getTodos({ userId: undefined });
      expect(noUserTodos).toHaveLength(1);
    });

    it('should filter by both userId and completed status', () => {
      const alice1 = manager.createTodo('Alice Task 1', undefined, {
        userId: 'user-alice',
      });
      manager.createTodo('Alice Task 2', undefined, {
        userId: 'user-alice',
      });
      manager.createTodo('Bob Task 1', undefined, { userId: 'user-bob' });

      manager.updateTodo(alice1.id, { completed: true });

      const aliceCompleted = manager.getTodos({
        userId: 'user-alice',
        completed: true,
      });
      const aliceIncomplete = manager.getTodos({
        userId: 'user-alice',
        completed: false,
      });

      expect(aliceCompleted).toHaveLength(1);
      expect(aliceIncomplete).toHaveLength(1);
    });
  });
});

describe('Todo Tool Callbacks', () => {
  beforeEach(() => {
    // Clear the singleton instance
    const manager = getTodoManager();
    manager.clearAll();
  });

  it('createTodoCallback should create a todo list and return success', async () => {
    const result = await createTodoCallback({
      listId: 'case-001-plan',
      title: 'Case 001 Plan',
      description: 'Intake and interim measures',
      status: 'active',
      priority: 'high',
      todos: [
        {
          id: 'case-001-intake',
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
      expect(list?.id).toBe('case-001-plan');
      expect(list?.title).toBe('Case 001 Plan');
      expect(list?.status).toBe('active');
      expect(list?.priority).toBe('high');
      expect(list?.todos).toHaveLength(2);
      expect(list?.todos[0].title).toBe('Conduct intake interview');
      expect(list?.todos[0].status).toBe('active');
      expect(list?.todos[1].status).toBe('pending');
    }
  });

  it('createTodoCallback should replace an existing list when ids match', async () => {
    const firstResult = await createTodoCallback({
      listId: 'case-002-plan',
      title: 'Case 002 Plan',
      todos: [
        {
          id: 'case-002-outreach',
          title: 'Perform outreach',
          status: 'pending',
        },
      ],
    });

    expect(firstResult.structuredContent.result.isError).toBeFalsy();

    const replacementResult = await createTodoCallback({
      listId: 'case-002-plan',
      title: 'Case 002 Plan (Revised)',
      todos: [
        {
          id: 'case-002-summary',
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
      expect(list?.todos?.[0].id).toBe('case-002-summary');
      expect(list?.title).toBe('Case 002 Plan (Revised)');
    }
  });

  it('getTodosCallback should return all todo lists', async () => {
    await createTodoCallback({
      listId: 'case-003-plan',
      title: 'Case 003 Plan',
      todos: [{ id: 'case-003-intake', title: 'Collect intake statement' }],
    });

    await createTodoCallback({
      listId: 'case-003-followup',
      title: 'Case 003 Follow Up',
      todos: [{ id: 'case-003-wellness', title: 'Schedule wellness check-in' }],
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
      expect(listIds).toContain('case-003-plan');
      expect(listIds).toContain('case-003-followup');
    }
  });

  it('getTodosCallback should return a specific list when listId provided', async () => {
    await createTodoCallback({
      listId: 'case-004-plan',
      title: 'Case 004 Plan',
      todos: [{ id: 'case-004-document', title: 'Document evidence timeline' }],
    });

    const result = await getTodosCallback({ listId: 'case-004-plan' });

    expect(result.structuredContent.result.isError).toBeFalsy();

    if (!result.structuredContent.result.isError) {
      const value = result.structuredContent.result.value as
        | SerializedTodoList
        | undefined;
      expect(value).toBeDefined();
      expect(value?.id).toBe('case-004-plan');
      expect(value?.todos).toHaveLength(1);
      expect(value?.todos?.[0].title).toBe('Document evidence timeline');
    }
  });

  it('updateTodoCallback should update a todo', async () => {
    const createResult = await createTodoCallback({
      listId: 'case-005-plan',
      title: 'Case 005 Plan',
      todos: [
        {
          id: 'case-005-original',
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

  it('deleteTodoCallback should delete a todo', async () => {
    const createResult = await createTodoCallback({
      listId: 'case-006-plan',
      title: 'Case 006 Plan',
      todos: [{ id: 'case-006-delete', title: 'To Delete' }],
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

  it('toggleTodoCallback should advance todo and list states', async () => {
    const createResult = await createTodoCallback({
      listId: 'case-007-plan',
      title: 'Case 007 Plan',
      todos: [{ id: 'case-007-toggle', title: 'Toggle Me' }],
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
