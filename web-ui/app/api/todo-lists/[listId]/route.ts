import { NextRequest, NextResponse } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { log } from '@/lib/logger';
import { getTodoManager } from '@/lib/ai/tools/todo/todo-manager';
import { extractParams } from '@/lib/nextjs-util/utils';

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
    req: NextRequest,
    withParams: { params: Promise<{ listId: string }> },
  ) => {
    const { listId } = await extractParams<{ listId: string }>(withParams);

    if (!listId) {
      return NextResponse.json(
        { error: 'List ID is required' },
        { status: 400 },
      );
    }

    try {
      const todoManager = getTodoManager();
      const list = todoManager.getTodoList(listId);

      if (!list) {
        return NextResponse.json(
          { error: 'Todo list not found' },
          { status: 404 },
        );
      }

      return NextResponse.json({ data: list }, { status: 200 });
    } catch (error) {
      log((l) =>
        l.error({
          source: 'GET /api/todo-lists/[listId]',
          error,
          listId,
        }),
      );
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 },
      );
    }
  },
);
