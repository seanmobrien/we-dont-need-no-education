import { NextRequest, NextResponse } from 'next/server';
import { wrapRouteRequest, extractParams } from '@/lib/nextjs-util/server/utils';
import { getTodoManager } from '@/lib/ai/tools/todo/todo-manager';

export const dynamic = 'force-dynamic';

/**
 * Handles the GET request to fetch a specific todo list by ID.
 *
 * @param req - The incoming request object
 * @param withParams - The route parameters
 * @returns {Promise<NextResponse>} A JSON response containing the todo list
 */
export const GET = wrapRouteRequest(
  async (
    _req: NextRequest,
    withParams: { params: Promise<{ listId: string }> },
  ) => {
    const { listId } = await extractParams<{ listId: string }>(withParams);

    if (!listId) {
      return NextResponse.json(
        { error: 'List ID is required' },
        { status: 400 },
      );
    }

    // NOTE: No try-catch here since wrapRouteRequest handles it
    const todoManager = await getTodoManager();
    const list = await todoManager.getTodoList(listId, {});

    if (!list) {
      return NextResponse.json(
        { error: 'Todo list not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: list }, { status: 200 });
  },
);
