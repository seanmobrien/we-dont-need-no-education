import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/neondb';
import { log } from '@/lib/logger';
import { parsePaginationStats } from '@/data-models/_utilities';
import { LoggedError } from '@/lib/react-util';
import { buildOrderBy } from '@/lib/components/mui/data-grid/server';

/**
 * Chat summary interface for the data grid
 */
interface ChatSummary {
  id: string;
  title: string | null;
  userId: number;
  createdAt: string;
}

/**
 * Transform a database record to chat summary
 */
const mapRecordToChatSummary = (record: any): ChatSummary => ({
  id: record.id,
  title: record.title,
  userId: record.user_id,
  createdAt: record.created_at,
});

/**
 * Handles the GET request to fetch a list of chats with pagination.
 *
 * This function queries the database to retrieve chats for the current user.
 * The results are returned as a JSON response with pagination information.
 *
 * @returns {Promise<NextResponse>} A promise that resolves to a JSON response containing the
 * list of chats with pagination information, or an error message if the request fails.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const thisUrl = new URL(req.url);
    const { num, offset, page } = parsePaginationStats(thisUrl);
    
    // Fetch list of chats
    const result = await query(
      (sql) =>
        sql`SELECT 
          c.id,
          c.title,
          c.user_id,
          c.created_at
        FROM chats c
        ${buildOrderBy({ 
          sql, 
          source: req, 
          defaultSort: [{ field: 'created_at', sort: 'desc' }], 
          columnMap: { createdAt: 'created_at' } 
        })}          
        LIMIT ${num} OFFSET ${offset};`,
      { transform: mapRecordToChatSummary },
    );

    log((l) =>
      l.verbose({ msg: '[[AUDIT]] - Chat history list:', result, num, offset }),
    );

    const total = await query(
      (sql) => sql`SELECT COUNT(*) AS records FROM chats c`,
    );

    return NextResponse.json(
      {
        pageStats: { page, num, total: Number(total[0].records) },
        results: result,
      },
      { status: 200 },
    );
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