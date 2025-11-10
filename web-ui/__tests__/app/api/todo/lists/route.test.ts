/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/todo/lists/route';
import { getTodoManager } from '@/lib/ai/tools/todo/todo-manager';
import * as authModule from '@/auth';

// Mock the auth module
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

describe('GET /api/todo/lists', () => {
  let todoManager: ReturnType<typeof getTodoManager>;

  beforeEach(() => {
    // Get the singleton instance and clear it before each test
    todoManager = getTodoManager();
    todoManager.clearAll();

    // Mock successful authentication
    (authModule.auth as jest.Mock).mockResolvedValue({
      user: { id: 'test-user', email: 'test@example.com' },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    (authModule.auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/todo/lists');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns empty list when no todos exist', async () => {
    const request = new NextRequest('http://localhost/api/todo/lists');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.lists).toEqual([]);
  });

  it('returns all todo lists', async () => {
    // Create a todo list
    todoManager.upsertTodoList({
      title: 'Test List',
      description: 'Test description',
      todos: [
        { title: 'Task 1', description: 'Description 1' },
        { title: 'Task 2', description: 'Description 2', completed: true },
      ],
    });

    const request = new NextRequest('http://localhost/api/todo/lists');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.lists).toHaveLength(1);
    expect(data.lists[0].title).toBe('Test List');
    expect(data.lists[0].todos).toHaveLength(2);
  });

  it('filters by completed status when specified', async () => {
    todoManager.upsertTodoList({
      title: 'Test List',
      todos: [
        { title: 'Task 1', completed: false },
        { title: 'Task 2', completed: true },
      ],
    });

    // Test completed=true
    const requestCompleted = new NextRequest(
      'http://localhost/api/todo/lists?completed=true',
    );
    const responseCompleted = await GET(requestCompleted);
    const dataCompleted = await responseCompleted.json();
    
    expect(dataCompleted.lists[0].todos).toHaveLength(1);
    expect(dataCompleted.lists[0].todos[0].title).toBe('Task 2');

    // Test completed=false
    const requestIncomplete = new NextRequest(
      'http://localhost/api/todo/lists?completed=false',
    );
    const responseIncomplete = await GET(requestIncomplete);
    const dataIncomplete = await responseIncomplete.json();
    
    expect(dataIncomplete.lists[0].todos).toHaveLength(1);
    expect(dataIncomplete.lists[0].todos[0].title).toBe('Task 1');
  });

  it('serializes dates correctly', async () => {
    todoManager.upsertTodoList({
      title: 'Test List',
      todos: [{ title: 'Task 1' }],
    });

    const request = new NextRequest('http://localhost/api/todo/lists');
    const response = await GET(request);
    const data = await response.json();

    expect(data.lists[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(data.lists[0].updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(data.lists[0].todos[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(data.lists[0].todos[0].updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
