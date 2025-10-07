/**
 * Tests for the Todo Manager and Todo Tools
 */

import { TodoManager, getTodoManager } from '/lib/ai/tools/todo/todo-manager';
import {
  createTodoCallback,
  getTodosCallback,
  updateTodoCallback,
  deleteTodoCallback,
  toggleTodoCallback,
} from '/lib/ai/tools/todo/tool-callback';

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
      completed: true 
    });
    
    expect(updated).toBeDefined();
    expect(updated?.title).toBe('Updated Title');
    expect(updated?.completed).toBe(true);
  });

  it('should delete a todo', () => {
    const todo = manager.createTodo('To Delete');
    
    expect(manager.getCount()).toBe(1);
    
    const deleted = manager.deleteTodo(todo.id);
    
    expect(deleted).toBe(true);
    expect(manager.getCount()).toBe(0);
  });

  it('should toggle todo completion', () => {
    const todo = manager.createTodo('Toggle Me');
    
    expect(todo.completed).toBe(false);
    
    const toggled1 = manager.toggleTodo(todo.id);
    expect(toggled1?.completed).toBe(true);
    
    const toggled2 = manager.toggleTodo(todo.id);
    expect(toggled2?.completed).toBe(false);
  });

  it('should return undefined for non-existent todo', () => {
    const result = manager.getTodo('non-existent-id');
    expect(result).toBeUndefined();
  });
});

describe('Todo Tool Callbacks', () => {
  beforeEach(() => {
    // Clear the singleton instance
    const manager = getTodoManager();
    manager.clearAll();
  });

  it('createTodoCallback should create a todo and return success', () => {
    const result = createTodoCallback({ 
      title: 'Test Todo',
      description: 'Test Description'
    });
    
    expect(result.structuredContent.result.isError).toBeFalsy();
    
    if (!result.structuredContent.result.isError) {
      expect(result.structuredContent.result.value).toBeDefined();
      expect(result.structuredContent.result.value?.title).toBe('Test Todo');
    }
  });

  it('getTodosCallback should return all todos', () => {
    // Create some todos first
    createTodoCallback({ title: 'Todo 1' });
    createTodoCallback({ title: 'Todo 2' });
    
    const result = getTodosCallback({});
    
    expect(result.structuredContent.result.isError).toBeFalsy();
    
    if (!result.structuredContent.result.isError) {
      expect(result.structuredContent.result.items).toHaveLength(2);
    }
  });

  it('updateTodoCallback should update a todo', () => {
    const createResult = createTodoCallback({ title: 'Original' });
    
    if (createResult.structuredContent.result.isError) {
      throw new Error('Failed to create todo');
    }
    
    const todoId = createResult.structuredContent.result.value?.id;
    
    const updateResult = updateTodoCallback({
      id: todoId!,
      title: 'Updated',
      completed: true
    });
    
    expect(updateResult.structuredContent.result.isError).toBeFalsy();
    
    if (!updateResult.structuredContent.result.isError) {
      expect(updateResult.structuredContent.result.value?.title).toBe('Updated');
      expect(updateResult.structuredContent.result.value?.completed).toBe(true);
    }
  });

  it('deleteTodoCallback should delete a todo', () => {
    const createResult = createTodoCallback({ title: 'To Delete' });
    
    if (createResult.structuredContent.result.isError) {
      throw new Error('Failed to create todo');
    }
    
    const todoId = createResult.structuredContent.result.value?.id;
    
    const deleteResult = deleteTodoCallback({ id: todoId! });
    
    expect(deleteResult.structuredContent.result.isError).toBeFalsy();
    
    if (!deleteResult.structuredContent.result.isError) {
      expect(deleteResult.structuredContent.result.value?.success).toBe(true);
    }
  });

  it('toggleTodoCallback should toggle completion status', () => {
    const createResult = createTodoCallback({ title: 'Toggle Me' });
    
    if (createResult.structuredContent.result.isError) {
      throw new Error('Failed to create todo');
    }
    
    const todoId = createResult.structuredContent.result.value?.id;
    
    const toggleResult1 = toggleTodoCallback({ id: todoId! });
    expect(toggleResult1.structuredContent.result.isError).toBeFalsy();
    
    if (!toggleResult1.structuredContent.result.isError) {
      expect(toggleResult1.structuredContent.result.value?.completed).toBe(true);
    }
    
    const toggleResult2 = toggleTodoCallback({ id: todoId! });
    expect(toggleResult2.structuredContent.result.isError).toBeFalsy();
    
    if (!toggleResult2.structuredContent.result.isError) {
      expect(toggleResult2.structuredContent.result.value?.completed).toBe(false);
    }
  });

  it('should return error for non-existent todo', () => {
    const result = updateTodoCallback({
      id: 'non-existent',
      title: 'Should Fail'
    });
    
    expect(result.structuredContent.result.isError).toBe(true);
  });
});
