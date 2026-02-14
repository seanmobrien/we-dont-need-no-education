import { NextRequest, NextResponse } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { getTodoManager } from '@/lib/ai/tools/todo/todo-manager';
import {
  validateCreateTodoList,
  validateUpdateTodoList,
} from '@/lib/api/todo/todo-validation';
import { ValidationError } from '@compliance-theater/react/errors/validation-error';

export const dynamic = 'force-dynamic';

/**
 * Handles the GET request to fetch all todo lists.
 *
 * @returns {Promise<NextResponse>} A JSON response containing the list of todo lists
 */
export const GET = wrapRouteRequest(async () => {
  // NOTE: No try-catch here since wrapRouteRequest handles it
  const todoManager = await getTodoManager();
  const lists = await todoManager.getTodoLists({});

  // Add computed fields
  const listsWithCounts = lists.map((list) => ({
    ...list,
    totalItems: list.todos.length,
    completedItems: list.todos.filter((t) => t.completed).length,
    pendingItems: list.todos.filter((t) => !t.completed).length,
  }));

  return NextResponse.json({ data: listsWithCounts }, { status: 200 });
});

/**
 * Handles the POST request to create a new todo list.
 *
 * @param {NextRequest} req - The incoming request object.
 * @returns {Promise<NextResponse>} - The response object containing the result of the creation.
 */
export const POST = wrapRouteRequest(
  async (req: NextRequest): Promise<NextResponse> => {
    try {
      const raw = await req.json();
      const validated = validateCreateTodoList(raw);

      if (!validated.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validated.error.flatten() },
          { status: 400 },
        );
      }

      const todoManager = await getTodoManager();
      const createdList = await todoManager.upsertTodoList({
        title: validated.data.title,
        description: validated.data.description,
        status: validated.data.status,
        priority: validated.data.priority,
      });

      return NextResponse.json(
        {
          message: 'Todo list created successfully',
          data: createdList,
        },
        { status: 201 },
      );
    } catch (error) {
      if (ValidationError.isValidationError(error)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      // Rethrow and let wrapRouteRequest handle logging
      throw error;
    }
  },
);

/**
 * Handles the PUT request to update an existing todo list.
 *
 * @param {NextRequest} req - The incoming request object.
 * @returns {Promise<NextResponse>} - The response object containing the result of the update.
 */
export const PUT = wrapRouteRequest(
  async (req: NextRequest): Promise<NextResponse> => {
    try {
      const raw = await req.json();
      const validated = validateUpdateTodoList(raw);

      if (!validated.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validated.error.flatten() },
          { status: 400 },
        );
      }

      const todoManager = await getTodoManager();
      const existingList = await todoManager.getTodoList(
        validated.data.listId,
        {},
      );

      if (!existingList) {
        return NextResponse.json(
          { error: 'Todo list not found' },
          { status: 404 },
        );
      }

      // Upsert with existing data merged with updates
      const updatedList = await todoManager.upsertTodoList({
        id: validated.data.listId,
        title: validated.data.title ?? existingList.title,
        description: validated.data.description ?? existingList.description,
        status: validated.data.status ?? existingList.status,
        priority: validated.data.priority ?? existingList.priority,
        todos: existingList.todos,
        createdAt: existingList.createdAt,
      });

      return NextResponse.json(
        { message: 'Todo list updated successfully', data: updatedList },
        { status: 200 },
      );
    } catch (error) {
      if (ValidationError.isValidationError(error)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  },
);

/**
 * Handles the DELETE request to remove a todo list.
 *
 * @param {NextRequest} req - The incoming request object.
 * @returns {Promise<NextResponse>} - The response object containing the result of the deletion.
 */
export const DELETE = wrapRouteRequest(
  async (req: NextRequest): Promise<NextResponse> => {
    const { listId } = await req.json();

    if (!listId) {
      return NextResponse.json(
        { error: 'List ID is required' },
        { status: 400 },
      );
    }

    const todoManager = await getTodoManager();
    const deleted = await todoManager.deleteTodoList(listId, {});

    if (!deleted) {
      return NextResponse.json(
        { error: 'Todo list not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: 'Todo list deleted successfully' },
      { status: 200 },
    );
  },
);
