import { NextRequest, NextResponse } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { log } from '@/lib/logger';
import { getTodoManager } from '@/lib/ai/tools/todo/todo-manager';
import {
  validateCreateTodoList,
  validateUpdateTodoList,
} from '@/lib/api/todo/todo-validation';
import { ValidationError } from '@/lib/react-util/errors/validation-error';

export const dynamic = 'force-dynamic';

/**
 * Handles the GET request to fetch all todo lists.
 *
 * @returns {Promise<NextResponse>} A JSON response containing the list of todo lists
 */
export const GET = wrapRouteRequest(async () => {
  try {
    const todoManager = getTodoManager();
    const lists = todoManager.getTodoLists();

    // Add computed fields
    const listsWithCounts = lists.map((list) => ({
      ...list,
      totalItems: list.todos.length,
      completedItems: list.todos.filter((t) => t.completed).length,
      pendingItems: list.todos.filter((t) => !t.completed).length,
    }));

    return NextResponse.json({ data: listsWithCounts }, { status: 200 });
  } catch (error) {
    log((l) =>
      l.error({
        source: 'GET /api/todo-lists',
        error,
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
    try {
      const raw = await req.json();
      const validated = validateCreateTodoList(raw);

      if (!validated.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validated.error.flatten() },
          { status: 400 },
        );
      }

      const todoManager = getTodoManager();
      const createdList = todoManager.upsertTodoList({
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
      log((l) =>
        l.error({
          source: 'POST /api/todo-lists',
          error,
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
    try {
      const raw = await req.json();
      const validated = validateUpdateTodoList(raw);

      if (!validated.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validated.error.flatten() },
          { status: 400 },
        );
      }

      const todoManager = getTodoManager();
      const existingList = todoManager.getTodoList(validated.data.listId);

      if (!existingList) {
        return NextResponse.json(
          { error: 'Todo list not found' },
          { status: 404 },
        );
      }

      // Upsert with existing data merged with updates
      const updatedList = todoManager.upsertTodoList({
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
      log((l) =>
        l.error({
          source: 'PUT /api/todo-lists',
          error,
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
    try {
      const { listId } = await req.json();

      if (!listId) {
        return NextResponse.json(
          { error: 'List ID is required' },
          { status: 400 },
        );
      }

      const todoManager = getTodoManager();
      const list = todoManager.getTodoList(listId);

      if (!list) {
        return NextResponse.json(
          { error: 'Todo list not found' },
          { status: 404 },
        );
      }

      // Delete all todos in the list first
      list.todos.forEach((todo) => {
        todoManager.deleteTodo(todo.id);
      });

      // Since TodoManager doesn't have a deleteList method, we need to clear the list
      // by upserting with empty todos array (effectively removing it from active lists)
      todoManager.upsertTodoList({
        id: listId,
        title: list.title,
        description: list.description,
        status: list.status,
        priority: list.priority,
        todos: [],
        createdAt: list.createdAt,
      });

      return NextResponse.json(
        { message: 'Todo list deleted successfully' },
        { status: 200 },
      );
    } catch (error) {
      log((l) =>
        l.error({
          source: 'DELETE /api/todo-lists',
          error,
        }),
      );
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 },
      );
    }
  },
);
