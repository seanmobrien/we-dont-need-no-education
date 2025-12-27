import { type NextRequest, NextResponse } from 'next/server';
import { log } from '@compliance-theater/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { schema } from '@/lib/drizzle-db/schema';
import {
  DrizzleSelectQuery,
  selectForGrid,
} from '@/lib/components/mui/data-grid/queryHelpers';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { SQL, lte, inArray } from 'drizzle-orm/sql';
import { getAccessibleUserIds } from '@/lib/auth/resources/case-file';
import { NEVER_USE_USER_ID } from '@/lib/constants';

/**
 * Chat summary interface for the data grid
 */
interface ChatSummary {
  id: string;
  title: string | null;
  userId: number;
  createdAt: string;
  chatMetadata: object | null;
  totalTokens: number;
  totalMessages: number;
  totalTurns: number;
}

type ColumnType = PgColumn | SQL.Aliased;

const getColumnFromName = (
  columnName: string,
  {
    columnTurns,
    columnMessages,
    columnTokens,
  }: {
    columnTurns: ColumnType;
    columnMessages: ColumnType;
    columnTokens: ColumnType;
  }
): ColumnType | undefined => {
  switch (columnName) {
    case 'id':
      return schema.chats.id;
    case 'title':
      return schema.chats.title;
    case 'user_id':
      return schema.chats.userId;
    case 'created_at':
      return schema.chats.createdAt;
    case 'chat_metadata':
      return schema.chats.metadata;
    case 'total_tokens':
      return columnTokens;
    case 'total_messages':
      return columnMessages;
    case 'total_turns':
      return columnTurns;
    default:
      return undefined;
  }
};

// Record mapper to transform database records to ChatSummary objects
const recordMapper = (record: Record<string, unknown>): ChatSummary => ({
  id: String(record.id),
  title: record.title != null ? String(record.title) : null,
  userId: Number(record.userId),
  createdAt: String(record.createdAt),
  chatMetadata:
    typeof record.chatMetadata === 'string'
      ? JSON.parse(record.chatMetadata)
      : record.chatMetadata,
  totalTokens: Number(record.totalTokens) || 0,
  totalMessages: Number(record.totalMessages) || 0,
  totalTurns: Number(record.totalTurns) || 0,
});

// Column map for the data grid
const columnMap = {
  chatMetadata: 'chat_metadata',
  createdAt: 'created_at',
  id: 'id',
  title: 'title',
  totalTokens: 'total_tokens',
  totalMessages: 'total_messages',
  totalTurns: 'total_turns',
  userId: 'user_id',
} as const;

/**
 * Handles the GET request to fetch a list of chats with pagination.
 *
 * This function queries the database to retrieve chats using drizzle ORM.
 * Supports filtering by user type via query parameter:
 * - viewType=user: Shows chats for users with userId > 0 (default)
 * - viewType=system: Shows system chats with userId <= 0
 *
 * @returns {Promise<NextResponse>} A promise that resolves to a JSON response containing the
 * list of chats with pagination information, or an error message if the request fails.
 */
export const GET = wrapRouteRequest(
  async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Get view type from query parameters
      const url = new URL(req.url);
      const viewType = url.searchParams.get('viewType') || 'user';
      const isSystemView = viewType === 'system';

      const accessibleUsers = (await getAccessibleUserIds(req)) ?? [
        NEVER_USE_USER_ID,
      ];

      // Define the base query for chats
      const result = await drizDbWithInit((db) => {
        const query = db
          .select({
            id: schema.chats.id,
            title: schema.chats.title,
            userId: schema.chats.userId,
            createdAt: schema.chats.createdAt,
            chatMetadata: schema.chats.metadata,
            totalTokens: schema.chats.allTheTokens,
            totalMessages: schema.chats.allTheMessages,
            totalTurns: schema.chats.allTheTurns,
          })
          .from(schema.chats);
        // Apply the user/system filter
        const filteredQuery = isSystemView
          ? query.where(lte(schema.chats.userId, 0))
          : query.where(inArray(schema.chats.userId, accessibleUsers));

        return selectForGrid<ChatSummary>({
          req,
          query: filteredQuery as unknown as DrizzleSelectQuery,
          getColumn: (c) =>
            getColumnFromName(c, {
              columnTokens: schema.chats.allTheTokens,
              columnMessages: schema.chats.allTheMessages,
              columnTurns: schema.chats.allTheTurns,
            }),
          columnMap,
          recordMapper,
          defaultSort: [{ field: 'created_at', sort: 'desc' }],
        });
      });
      log((l) =>
        l.verbose({
          msg: `[[AUDIT]] - Chat history list (${viewType} view) ${result.results.length} matches:`,
          resultset: result.results.map((x) => x.id),
          viewType,
        })
      );
      return NextResponse.json(result);
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'GET chat history',
      });
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  },
  { buildFallback: { rows: [], rowCount: 0 } }
);

export const dynamic = 'force-dynamic';
