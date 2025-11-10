import { NextResponse } from 'next/server';
import { getTodoManager } from '@/lib/ai/tools/todo/todo-manager';
import { auth } from '@/auth';

/**
 * PATCH /api/todo/items/[id]
 * Updates a todo item (primarily for toggling completion)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { completed } = body;

    if (typeof completed !== 'boolean') {
      return NextResponse.json(
        { error: 'completed field must be a boolean' },
        { status: 400 },
      );
    }

    const manager = getTodoManager();
    const todo = manager.updateTodo(id, { completed });

    if (!todo) {
      return NextResponse.json(
        { error: `Todo with id ${id} not found` },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: todo.id,
      title: todo.title,
      description: todo.description,
      completed: todo.completed,
      status: todo.status,
      priority: todo.priority,
      createdAt: todo.createdAt.toISOString(),
      updatedAt: todo.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 },
    );
  }
}
