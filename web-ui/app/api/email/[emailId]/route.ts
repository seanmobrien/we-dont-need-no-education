import { NextRequest, NextResponse } from 'next/server';
import { query } from 'lib/neondb';
import { errorLogFactory, log } from 'lib/logger';
import { mapRecordToObject } from '../email-route-util';

export async function GET(
  req: NextRequest,
  { params }: { params: { emailId: string } }
) {
  const { emailId: emailIdFromParams } = await params;
  try {
    const emailId = parseInt(emailIdFromParams, 10);
    if (isNaN(emailId)) {
      return NextResponse.json({ error: 'Invalid email ID' }, { status: 400 });
    }

    // Fetch detailed email data
    const result = await query(
      (sql) => sql`
        SELECT 
          e.email_id,
          e.subject,
          e.email_contents,
          e.sent_timestamp,
          e.thread_id,
          e.parent_email_id,
          sender.contact_id AS senderId,
          sender.name AS senderName,
          sender.email AS senderEmail,
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
        WHERE e.email_id = ${emailId}
        GROUP BY e.email_id, sender.contact_id, sender.name, sender.email;
      `,
      { transform: mapRecordToObject }
    );
    return result.length === 0
      ? NextResponse.json({ error: 'Email not found' }, { status: 404 })
      : NextResponse.json(result[0], { status: 200 });
  } catch (error) {
    log((l) =>
      l.error(
        errorLogFactory({
          error,
          source: 'GET email/emailId',
          include: { emailId: emailIdFromParams },
        })
      )
    );
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
