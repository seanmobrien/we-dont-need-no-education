import { NextResponse } from 'next/server';
import { buildFallbackGrid, wrapRouteRequest, } from '@/lib/nextjs-util/server/utils';
import { mapRecordToSummary, mapRecordToThreadSummary, } from '@/lib/api/email/util';
import { query, queryExt } from '@compliance-theater/database/driver';
import { LoggedError } from '@compliance-theater/logger';
import { getAccessibleUserIds } from '@/lib/auth/resources/case-file/case-file-helpers';
const NEVER_USE_USER_ID = -942370932;
export const dynamic = 'force-dynamic';
export const GET = wrapRouteRequest(async (req, args) => {
    try {
        const { threadId } = await args.params;
        const threadIdNumber = parseInt(threadId, 10);
        if (isNaN(threadIdNumber)) {
            return NextResponse.json({ error: 'Invalid thread ID' }, { status: 400 });
        }
        const threadRecord = await query((sql) => sql `SELECT thread_id, subject, created_at FROM threads WHERE thread_id = ${threadIdNumber};`, {
            transform: mapRecordToThreadSummary,
        });
        if (threadRecord.length === 0) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
        }
        const { searchParams } = new URL(req.url);
        const expand = searchParams.get('expand');
        if (expand !== 'true' && expand !== '1') {
            return NextResponse.json(threadRecord[0], { status: 200 });
        }
        const eligibleUserIds = (await getAccessibleUserIds(req)) ?? [
            NEVER_USE_USER_ID,
        ];
        const result = await queryExt((sql) => sql `SELECT 
           e.email_id,
           e.subject,
           e.sent_timestamp,
           sender.contact_id AS senderId,
           sender.name AS senderName,
           sender.email AS senderEmail,
           e.thread_id,
           e.parent_email_id,
           COALESCE(json_agg(
         json_build_object(
           'recipient_id', recipient.contact_id,
           'recipient_name', recipient.name,
           'recipient_email', recipient.email
         )
           ) FILTER (WHERE recipient.contact_id IS NOT NULL), '[]') AS recipients
         FROM emails e
         JOIN contacts sender ON e.sender_id = sender.contact_id
         JOIN document_units du ON e.email_id = du.email_id
         LEFT JOIN email_recipients er ON e.email_id = er.email_id
         LEFT JOIN contacts recipient ON er.recipient_id = recipient.contact_id
         WHERE e.thread_id = ${threadIdNumber}
           AND du.user_id = ANY(${eligibleUserIds})
         GROUP BY e.email_id, sender.contact_id, sender.name, sender.email
         ORDER BY e.sent_timestamp DESC;
       `, {
            transform: mapRecordToSummary,
        });
        return NextResponse.json({
            ...threadRecord,
            emails: result.rows,
            total: result.rowCount,
        }, { status: 200 });
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            msg: 'Error fetching email thread',
            source: 'GET email/thread/[threadId]',
        });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}, { buildFallback: buildFallbackGrid });
//# sourceMappingURL=route.js.map