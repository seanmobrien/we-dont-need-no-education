import { NextResponse, NextRequest } from 'next/server';
import { log } from '@/lib/logger';
import { query } from '@/lib/neondb';
import { parsePaginationStats } from '@/data-models';
import type { ImportStage, StagedMessageSummary } from '@/data-models';
import { LoggedError } from '@/lib/react-util';

/**
 * Handles GET requests to fetch a paginated list of emails with sender and recipient information.
 *
 * @param {NextRequest} req - The incoming request object.
 * @returns {Promise<NextResponse>} - A promise that resolves to a NextResponse object containing the paginated list of emails.
 *
 * The function performs the following steps:
 * 1. Parses pagination parameters (num, offset, page) from the request URL.
 * 2. Executes a SQL query to fetch a list of emails with sender and recipient information.
 * 3. Transforms the query result to a structured format.
 * 4. Executes a SQL query to count the total number of records.
 * 5. Logs the results and pagination information.
 * 6. Returns a JSON response with the paginated list of emails and pagination statistics.
 *
 * If an error occurs during the process, it logs the error and returns a 500 Internal Server Error response.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { num, offset, page } = parsePaginationStats(new URL(req.url));

    // Fetch list of emails with sender info
    const result = await query(
      (sql) =>
        sql`SELECT 
      s.stage, s.id, m.email_id AS targetId, s."userId",
      (SELECT h.value 
        FROM staging_message, 
        LATERAL unnest((message).payload.headers) AS h(name, value) 
        WHERE h.name='Date') AS timestamp,
      (SELECT h.value FROM staging_message, LATERAL unnest((message).payload.headers) AS h(name, value) WHERE h.name='From') AS Sender,
        concat(
          (SELECT h.value FROM staging_message, LATERAL unnest((message).payload.headers) AS h(name, value) WHERE h.name='To'),
          ',',
          (SELECT h.value FROM staging_message, LATERAL unnest((message).payload.headers) AS h(name, value) WHERE h.name='Cc')
        ) AS Recipients
      FROM emails m 
      RIGHT JOIN staging_message s ON s.external_id = m.imported_from_id
      LIMIT ${num} OFFSET ${offset};`,
      {
        transform: (result) => {
          let recipients: Array<string> | string | null;
          if (result.recipients === null || result.recipients === undefined) {
            recipients = null;
          } else if (typeof result.recipients === 'string') {
            recipients = result.recipients
              .split(',')
              .map((r: string) => r.trim());
            if (recipients.length === 1) {
              recipients = recipients[0];
            }
          } else {
            log((l) =>
              l.warn({
                msg: '[[WARNING]] - Unexpected recipient type detected:',
                recipients,
              }),
            );
            recipients = null;
          }
          const ret: StagedMessageSummary = {
            stage: result.stage as ImportStage,
            id: result.id as string,
            targetId: result.targetid as string,
            timestamp: result.timestamp as Date,
            sender: result.sender as string,
            userId: result.userId as number,
            recipients,
          };
          return ret;
        },
      },
    );

    const total = await query(
      (q) => q`SELECT COUNT(*) AS records FROM staging_message;`,
    );
    log((l) =>
      l.verbose({
        msg: '[[AUDIT]] -  Import list:',
        result,
        num,
        offset,
        cbTotal: total,
      }),
    );

    return NextResponse.json(
      { pageStats: { page, num, total: total[0].records }, results: result },
      { status: 200 },
    );
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'GET email/import/list',
    });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
