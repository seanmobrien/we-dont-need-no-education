import { NextRequest, NextResponse } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { log } from '@/lib/logger';
import { auth } from '@/auth';
import { TodoService } from '@/lib/api/todo/todo-service';
import {
  validateCreateTodoList,
  validateUpdateTodoList,
} from '@/lib/api/todo/todo-validation';
import { ValidationError } from '@/lib/react-util/errors/validation-error';

export const dynamic = 'force-dynamic';

/**
 * Handles the GET request to fetch all todo lists for the authenticated user.
 *
 * @returns {Promise<NextResponse>} A JSON response containing the list of todo lists
 */
export const GET = wrapRouteRequest(async () => {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user ID from session - adjust this based on your session structure
  const userId = (session.user as { id?: number }).id;
  if (!userId) {
    return NextResponse.json(
      { error: 'User ID not found in session' },
      { status: 401 },
    );
  }

  try {
    const todoService = new TodoService();
    const lists = await todoService.getUserTodoLists(userId);

    return NextResponse.json({ data: lists }, { status: 200 });
  } catch (error) {
    log((l) =>
      l.error({
        source: 'GET /api/todo-lists',
        error,
        userId,
      }),
    );
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
});

/**
 * Handles the POST request to create a new todo list.
 *
 * @param {NextRequest} req - The incoming request object.
 * @returns {Promise<NextResponse>} - The response object containing the result of the creation.
 */
export const POST = wrapRouteRequest(
  async (req: NextRequest): Promise<NextResponse> => {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: number }).id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 401 },
      );
    }

    try {
      const raw = await req.json();
      const validated = validateCreateTodoList(raw);

      if (!validated.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validated.error.flatten() },
          { status: 400 },
        );
      }

      const todoService = new TodoService();
      const createdList = await todoService.createTodoList(
        validated.data,
        userId,
      );

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
      log((l) =>
        l.error({
          source: 'POST /api/todo-lists',
          error,
          userId,
        }),
      );
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 },
      );
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
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: number }).id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 401 },
      );
    }

    try {
      const raw = await req.json();
      const validated = validateUpdateTodoList(raw);

      if (!validated.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validated.error.flatten() },
          { status: 400 },
        );
      }

      const todoService = new TodoService();
      const updatedList = await todoService.updateTodoList(
        validated.data,
        userId,
      );

      if (!updatedList) {
        return NextResponse.json(
          { error: 'Todo list not found' },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { message: 'Todo list updated successfully', data: updatedList },
        { status: 200 },
      );
    } catch (error) {
      if (ValidationError.isValidationError(error)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      log((l) =>
        l.error({
          source: 'PUT /api/todo-lists',
          error,
          userId,
        }),
      );
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 },
      );
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
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: number }).id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 401 },
      );
    }

    try {
      const { listId } = await req.json();

      if (!listId) {
        return NextResponse.json(
          { error: 'List ID is required' },
          { status: 400 },
        );
      }

      const todoService = new TodoService();
      const deleted = await todoService.deleteTodoList(listId, userId);

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
    } catch (error) {
      log((l) =>
        l.error({
          source: 'DELETE /api/todo-lists',
          error,
          userId,
        }),
      );
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 },
      );
    }
  },
);
