import { NextResponse } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { log, LoggedError } from '@compliance-theater/logger';
import { query } from '@compliance-theater/database/driver';
import { parsePaginationStats } from '@/lib/components/mui/data-grid/queryHelpers/utility';
export const GET = wrapRouteRequest(async (req) => {
    try {
        const { num, offset, page } = parsePaginationStats(new URL(req.url));
        const result = await query((sql) => sql `SELECT 
      s.stage, s.id, m.email_id AS targetId, s."user_id",
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
      LIMIT ${num} OFFSET ${offset};`, {
            transform: (result) => {
                let recipients;
                if (result.recipients === null || result.recipients === undefined) {
                    recipients = null;
                }
                else if (typeof result.recipients === 'string') {
                    recipients = result.recipients
                        .split(',')
                        .map((r) => r.trim());
                    if (recipients.length === 1) {
                        recipients = recipients[0];
                    }
                }
                else {
                    log((l) => l.warn({
                        msg: '[[WARNING]] - Unexpected recipient type detected:',
                        recipients,
                    }));
                    recipients = null;
                }
                const ret = {
                    stage: result.stage,
                    id: result.id,
                    targetId: result.targetid,
                    timestamp: result.timestamp,
                    sender: result.sender,
                    userId: result.userId,
                    recipients,
                };
                return ret;
            },
        });
        const total = await query((q) => q `SELECT COUNT(*) AS records FROM staging_message;`);
        log((l) => l.verbose({
            msg: '[[AUDIT]] -  Import list:',
            resultset: result,
            num,
            offset,
            cbTotal: total,
        }));
        return NextResponse.json({ pageStats: { page, num, total: total[0].records }, results: result }, { status: 200 });
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'GET email/import/list',
        });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});
export const dynamic = 'force-dynamic';
//# sourceMappingURL=route.js.map