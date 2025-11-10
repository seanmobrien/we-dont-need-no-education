import { NextResponse } from 'next/server';
import { getTodoManager } from '@/lib/ai/tools/todo/todo-manager';
import { auth } from '@/auth';

/**
 * GET /api/todo/lists
 * Returns all todo lists for the current user
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const completedParam = searchParams.get('completed');
    const completed =
      completedParam === null
        ? undefined
        : completedParam === 'true'
          ? true
          : completedParam === 'false'
            ? false
            : undefined;

    const manager = getTodoManager();
    const lists = manager.getTodoLists({ completed });

    return NextResponse.json({
      lists: lists.map((list) => ({
        id: list.id,
        title: list.title,
        description: list.description,
        status: list.status,
        priority: list.priority,
        todos: list.todos.map((todo) => ({
          id: todo.id,
          title: todo.title,
          description: todo.description,
          completed: todo.completed,
          status: todo.status,
          priority: todo.priority,
          createdAt: todo.createdAt.toISOString(),
          updatedAt: todo.updatedAt.toISOString(),
        })),
        createdAt: list.createdAt.toISOString(),
        updatedAt: list.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching todo lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch todo lists' },
      { status: 500 },
    );
  }
}
