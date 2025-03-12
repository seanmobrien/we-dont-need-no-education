import { NextRequest, NextResponse } from 'next/server';
import { mapRecordToSummary } from '../../email-route-util';
import { query, queryExt } from '@/lib/neondb';
import { errorLogFactory, log } from '@/lib/logger';

export const mapRecordToThreadSummary = (record: Record<string, unknown>) => ({
  threadId: record.thread_id,
  subject: record.subject,
  createdOn: record.created_at,
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    // Extract the slug from params
    const { threadId } = await params;
    const threadIdNumber = parseInt(threadId, 10);
    if (isNaN(threadIdNumber)) {
      return NextResponse.json({ error: 'Invalid thread ID' }, { status: 400 });
    }
    const threadRecord = await query(
      (sql) =>
        sql`SELECT thread_id, subject, created_at FROM threads WHERE thread_id = ${threadIdNumber};`,
      {
        transform: mapRecordToThreadSummary,
      }
    );
    if (threadRecord.length === 0) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }
    // Check if all emails should be pulled
    const { searchParams } = new URL(req.url);
    const expand = searchParams.get('expand');
    if (expand !== 'true' && expand !== '1') {
      return NextResponse.json(threadRecord[0], { status: 200 });
    }
    // pull away
    const result = await queryExt(
      (sql) => sql`SELECT 
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
         LEFT JOIN email_recipients er ON e.email_id = er.email_id
         LEFT JOIN contacts recipient ON er.recipient_id = recipient.contact_id
         WHERE e.thread_id = ${threadIdNumber}           
         GROUP BY e.email_id, sender.contact_id, sender.name, sender.email
         ORDER BY e.sent_timestamp DESC;
       `,
      {
        transform: mapRecordToSummary,
      }
    );
    return NextResponse.json(
      {
        ...threadRecord,
        emails: result.rows,
        total: result.rowCount,
      },
      { status: 200 }
    );
  } catch (error) {
    log((l) => l.error(errorLogFactory({ error, source: 'GET email/query' })));
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
