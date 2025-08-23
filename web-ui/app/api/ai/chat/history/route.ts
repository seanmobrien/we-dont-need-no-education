import { type NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { schema } from '@/lib/drizzle-db/schema';
import { selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { SQL, eq, count, sum } from 'drizzle-orm/sql';

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

type ColumnType = PgColumn | SQL.Aliased;;

export const getColumnFromName  = (columnName: string, {
  columnTurns,
  columnMessages,
  columnTokens
 }: { columnTurns: ColumnType; columnMessages: ColumnType; columnTokens: ColumnType; } ): ColumnType | undefined => {
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
  chatMetadata: typeof record.chatMetadata === 'string' ? JSON.parse(record.chatMetadata) : record.chatMetadata,
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
 * This function queries the database to retrieve chats for the current user using drizzle ORM.
 * The results are returned as a JSON response with pagination information.
 *
 * @returns {Promise<NextResponse>} A promise that resolves to a JSON response containing the
 * list of chats with pagination information, or an error message if the request fails.
 */
export const GET = wrapRouteRequest(async (req: NextRequest): Promise<NextResponse> => {
  try {
    // Define the base query for chats
    const result = await drizDbWithInit((db) => {
      const qSumTokens = db
        .select({
          chatId: schema.tokenUsage.chatId,
          totalTokens: sum(schema.tokenUsage.totalTokens).as('all_the_tokens'),
        })
        .from(schema.tokenUsage)
        .groupBy(schema.tokenUsage.chatId)
        .as('tblTokens');
      // Sum messages
      const qSumMessages = db
        .select({
          chatId: schema.chatMessages.chatId,
          totalMessages: count().as('all_the_messages'),
        })
        .from(schema.chatMessages)
        .groupBy(schema.chatMessages.chatId)
        .as('tblMessages');
      // Sum turns
      const qSumTurns = db
        .select({
          chatId: schema.chatTurns.chatId,
          totalTurns: count().as('all_the_turns'),
        })
        .from(schema.chatTurns)
        .groupBy(schema.chatTurns.chatId)
        .as('tblTurns');

      // Sum tokens by chat
      const columnTurns: SQL.Aliased = qSumTurns.totalTurns;
      // count(schema.chatTurns.turnId).as('all_the_turns');
      const columnTokens: SQL.Aliased =
        qSumTokens.totalTokens;
      const columnMessages: SQL.Aliased = qSumMessages.totalMessages;
      

      const query = db
        .select({
          id: schema.chats.id,
          title: schema.chats.title,
          userId: schema.chats.userId,
          createdAt: schema.chats.createdAt,
          chatMetadata: schema.chats.metadata,
          totalTokens: columnTokens,
          totalMessages: columnMessages,
          totalTurns: columnTurns,
        })
        .from(schema.chats)
        .leftJoin(qSumTokens, eq(qSumTokens.chatId, schema.chats.id))
        .leftJoin(qSumMessages, eq(qSumMessages.chatId, schema.chats.id))
        .leftJoin(qSumTurns, eq(qSumTurns.chatId, schema.chats.id));
      
        return selectForGrid<ChatSummary>({
          req,
          query,
          getColumn: (c) =>
            getColumnFromName(c, { columnTokens, columnMessages, columnTurns }),
          columnMap,
          recordMapper,
          defaultSort: [{ field: 'created_at', sort: 'desc' }],
        });      
    });
    log((l) =>
      l.verbose({ msg: `[[AUDIT]] - Chat history list ${result.results} matches:`, resultset: result.results.map(x => x.id) }),
    );
    return NextResponse.json(result);
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
}, { buildFallback: { rows: [], rowCount: 0 } });

export const dynamic = 'force-dynamic';