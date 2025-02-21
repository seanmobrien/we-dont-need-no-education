import { parsePaginationStats } from '@/data-models';
import { errorLogFactory, log } from '@/lib/logger';
import { query } from '@/lib/neondb';
import { NextResponse } from 'next/server';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { num, offset } = parsePaginationStats(new URL(req.url));

    // Fetch list of emails with sender info
    const result = await query(
      (sql) =>
        sql`SELECT 
      s.stage, s.id, m.email_id AS targetId, 
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
      LIMIT ${num} OFFSET ${offset};`
    );
    log((l) =>
      l.verbose({ msg: '[[AUDIT]] -  Import list:', result, num, offset })
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    log((l) => l.error(errorLogFactory({ source: 'GET email', error })));
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
