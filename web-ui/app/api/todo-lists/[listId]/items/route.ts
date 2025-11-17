import { NextRequest, NextResponse } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { getTodoManager } from '@/lib/ai/tools/todo/todo-manager';
import {
  validateCreateTodoItem,
  validateUpdateTodoItem,
} from '@/lib/api/todo/todo-validation';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { extractParams } from '@/lib/nextjs-util/utils';
import { LoggedError } from '@/lib/react-util';

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

      const todoManager = await getTodoManager();
      const list = await todoManager.getTodoList(listId, {});

      if (!list) {
        return NextResponse.json(
          { error: 'Todo list not found' },
          { status: 404 },
        );
      }

      // Create the new todo using TodoManager's createTodo with the listId option
      const newTodo = await todoManager.createTodo(
        validated.data.title,
        validated.data.description,
        {
          status: validated.data.status,
          priority: validated.data.priority,
          listId: listId,
        },
      );

      return NextResponse.json(
        {
          message: 'Todo item created successfully',
          data: newTodo,
        },
        { status: 201 },
      );
    } catch (error) {
      if (ValidationError.isValidationError(error)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'POST /api/todo-lists/[listId]/items',
        data: { listId },
      });
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

      const todoManager = await getTodoManager();
      /* let the updateTodo api handle verifying the item and its list
      const list = await todoManager.getTodoList(listId, {});

      if (!list) {
        return NextResponse.json(
          { error: 'Todo list not found' },
          { status: 404 },
        );
      }
      */
      const updatedTodo = await todoManager.updateTodo(
        validated.data.itemId,
        {
          title: validated.data.title,
          description: validated.data.description,
          completed: validated.data.completed,
          status: validated.data.status,
          priority: validated.data.priority,
        },
        { listId },
      );

      if (!updatedTodo) {
        return NextResponse.json(
          { error: 'Todo item not found' },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { message: 'Todo item updated successfully', data: updatedTodo },
        { status: 200 },
      );
    } catch (error) {
      if (ValidationError.isValidationError(error)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'PUT /api/todo-lists/[listId]/items',
        data: { listId },
      });
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
    const { listId } = await extractParams<{ listId: string }>(withParams);

    /*
    if (!listId) {
      return NextResponse.json(
        { error: 'List ID is required' },
        { status: 400 },
      );
    }
    */

    try {
      const { itemId } = await req.json();

      if (!itemId) {
        return NextResponse.json(
          { error: 'Item ID is required' },
          { status: 400 },
        );
      }

      const todoManager = await getTodoManager();
      /* Let the deleteTodo api handle verifying the item and its list
      const list = await todoManager.getTodoList(listId, {});

      if (!list) {
        return NextResponse.json(
          { error: 'Todo list not found' },
          { status: 404 },
        );
      }
      */
      const deleted = await todoManager.deleteTodo(itemId);

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
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'DELETE /api/todo-lists/[listId]/items',
        data: { listId },
      });
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 },
      );
    }
  },
);
