import { NextResponse } from 'next/server';
import { getTodoManager } from '@/lib/ai/tools/todo/todo-manager';
import { auth } from '@/auth';

/**
 * GET /api/todo/lists/[id]
 * Returns a specific todo list by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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
    const list = manager.getTodoList(id, { completed });

    if (!list) {
      return NextResponse.json(
        { error: `Todo list with id ${id} not found` },
        { status: 404 },
      );
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error fetching todo list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch todo list' },
      { status: 500 },
    );
  }
}
