import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { schema } from '@/lib/drizzle-db/schema';
import { DrizzleSelectQuery, selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers';
import { PgColumn } from 'drizzle-orm/pg-core';

/**
 * Chat summary interface for the data grid
 */
interface ChatSummary {
  id: string;
  title: string | null;
  userId: number;
  createdAt: string;
}

// Column map for the data grid
const columnMap = {
  id: 'id',
  title: 'title', 
  userId: 'user_id',
  createdAt: 'created_at',
} as const;

/**
 * Handles the GET request to fetch a list of chats with pagination.
 *
 * This function queries the database to retrieve chats for the current user using drizzle ORM.
 * The results are returned as a JSON response with pagination information.
 *
 * @returns {Promise<NextResponse>} A promise that resolves to a JSON response containing the
 * list of chats with pagination information, or an error message if the request fails.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const db = await drizDbWithInit();

    // Define the base query for chats
    const baseQuery = db
      .select({
        id: schema.chats.id,
        title: schema.chats.title,
        userId: schema.chats.userId,
        createdAt: schema.chats.createdAt,
      })
      .from(schema.chats);

    // Column getter function for filtering and sorting
    const getColumn = (columnName: string): PgColumn | undefined => {
      switch (columnName) {
        case 'id': return schema.chats.id;
        case 'title': return schema.chats.title;
        case 'user_id': return schema.chats.userId;
        case 'created_at': return schema.chats.createdAt;
        default: return undefined;
      }
    };

    // Record mapper to transform database records to ChatSummary objects
    const recordMapper = (record: Record<string, unknown>): ChatSummary => ({
      id: record.id as string,
      title: record.title as string | null,
      userId: record.userId as number,
      createdAt: record.createdAt as string,
    });

    // Use selectForGrid to apply filtering, sorting, and pagination
    const result = await selectForGrid<ChatSummary>({
      req,
      query: baseQuery as unknown as DrizzleSelectQuery,
      getColumn,
      columnMap,
      recordMapper,
      defaultSort: [{ field: 'created_at', sort: 'desc' }],
    });

    log((l) =>
      l.verbose({ msg: '[[AUDIT]] - Chat history list:', result }),
    );

    return Response.json(result);
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'GET chat history',
    });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}