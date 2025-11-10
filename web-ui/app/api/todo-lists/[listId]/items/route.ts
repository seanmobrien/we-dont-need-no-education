import { NextRequest, NextResponse } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { log } from '@/lib/logger';
import { auth } from '@/auth';
import { TodoService } from '@/lib/api/todo/todo-service';
import {
  validateCreateTodoItem,
  validateUpdateTodoItem,
} from '@/lib/api/todo/todo-validation';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { extractParams } from '@/lib/nextjs-util/utils';

export const dynamic = 'force-dynamic';

/**
 * Handles the POST request to create a new todo item in a list.
 *
 * @param {NextRequest} req - The incoming request object.
 * @param withParams - The route parameters
 * @returns {Promise<NextResponse>} - The response object containing the result of the creation.
 */
export const POST = wrapRouteRequest(
  async (
    req: NextRequest,
    withParams: { params: Promise<{ listId: string }> },
  ): Promise<NextResponse> => {
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

    const { listId } = await extractParams<{ listId: string }>(withParams);

    if (!listId) {
      return NextResponse.json(
        { error: 'List ID is required' },
        { status: 400 },
      );
    }

    try {
      const raw = await req.json();
      const validated = validateCreateTodoItem(raw);

      if (!validated.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validated.error.flatten() },
          { status: 400 },
        );
      }

      const todoService = new TodoService();
      const createdItem = await todoService.createTodoItem(
        listId,
        validated.data,
        userId,
      );

      if (!createdItem) {
        return NextResponse.json(
          { error: 'Todo list not found' },
          { status: 404 },
        );
      }

      return NextResponse.json(
        {
          message: 'Todo item created successfully',
          data: createdItem,
        },
        { status: 201 },
      );
    } catch (error) {
      if (ValidationError.isValidationError(error)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      log((l) =>
        l.error({
          source: 'POST /api/todo-lists/[listId]/items',
          error,
          listId,
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
 * Handles the PUT request to update an existing todo item.
 *
 * @param {NextRequest} req - The incoming request object.
 * @param withParams - The route parameters
 * @returns {Promise<NextResponse>} - The response object containing the result of the update.
 */
export const PUT = wrapRouteRequest(
  async (
    req: NextRequest,
    withParams: { params: Promise<{ listId: string }> },
  ): Promise<NextResponse> => {
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

    const { listId } = await extractParams<{ listId: string }>(withParams);

    if (!listId) {
      return NextResponse.json(
        { error: 'List ID is required' },
        { status: 400 },
      );
    }

    try {
      const raw = await req.json();
      const validated = validateUpdateTodoItem(raw);

      if (!validated.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validated.error.flatten() },
          { status: 400 },
        );
      }

      const todoService = new TodoService();
      const updatedItem = await todoService.updateTodoItem(
        listId,
        validated.data,
        userId,
      );

      if (!updatedItem) {
        return NextResponse.json(
          { error: 'Todo item not found' },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { message: 'Todo item updated successfully', data: updatedItem },
        { status: 200 },
      );
    } catch (error) {
      if (ValidationError.isValidationError(error)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      log((l) =>
        l.error({
          source: 'PUT /api/todo-lists/[listId]/items',
          error,
          listId,
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
 * Handles the DELETE request to remove a todo item.
 *
 * @param {NextRequest} req - The incoming request object.
 * @param withParams - The route parameters
 * @returns {Promise<NextResponse>} - The response object containing the result of the deletion.
 */
export const DELETE = wrapRouteRequest(
  async (
    req: NextRequest,
    withParams: { params: Promise<{ listId: string }> },
  ): Promise<NextResponse> => {
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

    const { listId } = await extractParams<{ listId: string }>(withParams);

    if (!listId) {
      return NextResponse.json(
        { error: 'List ID is required' },
        { status: 400 },
      );
    }

    try {
      const { itemId } = await req.json();

      if (!itemId) {
        return NextResponse.json(
          { error: 'Item ID is required' },
          { status: 400 },
        );
      }

      const todoService = new TodoService();
      const deleted = await todoService.deleteTodoItem(listId, itemId, userId);

      if (!deleted) {
        return NextResponse.json(
          { error: 'Todo item not found' },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { message: 'Todo item deleted successfully' },
        { status: 200 },
      );
    } catch (error) {
      log((l) =>
        l.error({
          source: 'DELETE /api/todo-lists/[listId]/items',
          error,
          listId,
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
