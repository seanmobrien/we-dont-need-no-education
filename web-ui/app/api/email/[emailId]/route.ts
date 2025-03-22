import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/neondb';
import { log } from '@/lib/logger';
import { mapRecordToObject } from '../email-route-util';
import { LoggedError } from '@/lib/react-util';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ emailId: string }> },
) {
  const { emailId } = await params;
  const guidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!emailId || !guidRegex.test(emailId)) {
    return NextResponse.json(
      { error: 'Email ID is required' },
      { status: 400 },
    );
  }
  try {
    // Fetch detailed email data
    const result = await query(
      (sql) => sql`
        SELECT 
          e.email_id,
          e.subject,
          e.email_contents,
          e.sent_timestamp,
          e.thread_id,
          e.parent_id,
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
      { transform: mapRecordToObject },
    );
    return result.length === 0
      ? NextResponse.json({ error: 'Email not found' }, { status: 404 })
      : NextResponse.json(result[0], { status: 200 });
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'GET email/emailId',
      msg: 'Error fetching email details',
      include: { emailId: emailId },
    });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

/**
 * Handles the DELETE request to remove an email and its associated recipients from the database.
 *
 * @param {NextRequest} req - The incoming request object.
 * @returns {Promise<NextResponse>} - The response object containing the result of the deletion operation.
 *
 * @throws {Error} - If there is an issue with the deletion process.
 *
 * The function performs the following steps:
 * 1. Parses the request body to extract the `emailId`.
 * 2. Validates that the `emailId` is provided.
 * 3. Deletes associated recipients from the `email_recipients` table.
 * 4. Deletes the email from the `emails` table and returns the deleted email.
 * 5. Logs the deletion operation.
 * 6. Returns a success response if the email is deleted, or an error response if the email is not found or if an internal server error occurs.
 */
export async function DELETE({
  params,
}: {
  params: Promise<{ emailId: string }>;
}): Promise<NextResponse> {
  const { emailId: emailId } = await params;
  if (!emailId) {
    return NextResponse.json(
      { error: 'Email ID is required' },
      { status: 400 },
    );
  }
  try {
    // Delete associated recipients first
    await query(
      (sql) => sql`DELETE FROM email_recipients WHERE email_id = ${emailId}`,
    );

    // Delete the email
    const result = await query(
      (sql) => sql`DELETE FROM emails WHERE email_id = ${emailId} RETURNING *`,
    );

    if (result.length === 0) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }
    log((l) =>
      l.verbose({ msg: '[[AUDIT]] -  Email deleted:', result: result[0] }),
    );
    return NextResponse.json(
      { message: 'Email deleted successfully', email: result[0] },
      { status: 200 },
    );
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'DELETE email/emailId',
      msg: 'Error deleting email',
      include: { emailId },
    });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
