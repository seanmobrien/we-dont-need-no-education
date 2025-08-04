import { NextRequest, NextResponse } from 'next/server';
import { query, queryExt } from '@/lib/neondb';
import { log } from '@/lib/logger';
import {
  normalizeNullableNumeric,
  parsePaginationStats,
} from '@/data-models/_utilities';
import {
  insertRecipients,
  mapRecordToObject,
  mapRecordToSummary,
} from '../../../lib/api/email/util';
import { LoggedError, ValidationError } from '@/lib/react-util';
import { buildOrderBy } from '@/lib/components/mui/data-grid/server';

/**
 * Handles the GET request to fetch a list of emails with sender and recipient information.
 *
 * This function queries the database to retrieve emails along with their sender's details and
 * a list of recipients. The results are returned as a JSON response.
 *
 * @returns {Promise<NextResponse>} A promise that resolves to a JSON response containing the
 * list of emails with sender and recipient information, or an error message if the request fails.
 *
 * @throws {Error} If there is an issue with the database query or any other error occurs during
 * the execution of the function, an error is logged and a 500 Internal Server Error response is returned.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const thisUrl = new URL(req.url);
    const { num, offset, page } = parsePaginationStats(thisUrl);
    // Fetch list of emails with sender info
    const result = await query(
      (sql) =>
        sql`SELECT 
          e.email_id,
          e.thread_id,
          e.subject,
          e.sent_timestamp,
          sender.contact_id AS senderId,
          sender.name AS senderName,
          sender.email AS senderEmail,
          (
            
              SELECT COALESCE(json_agg(json_build_object(
                          'recipient_id', recipient.contact_id,
                          'recipient_name', recipient.name,
                          'recipient_email', recipient.email
                      )
                ),'[]')						
                FROM email_recipients er 
                    LEFT JOIN contacts recipient ON er.recipient_id = recipient.contact_id 
                WHERE e.email_id = er.email_id AND recipient.contact_id IS NOT NULL    
          ) AS recipients,
          (SELECT COUNT(*) FROM email_attachments ea WHERE ea.email_id=e.email_id) AS count_attachments,
          (
            SELECT COUNT(*) FROM document_property dp 
            JOIN document_units d2 ON d2.unit_id=dp.document_id
            WHERE d2.email_id=e.email_id
              AND document_property_type_id=9
          ) AS count_kpi,
          (
            SELECT COUNT(*) FROM document_property dp 
            WHERE document_unit_email(dp.document_id)=e.email_id
              AND (document_property_type_id=102 OR document_property_type_id=1000)
          ) AS count_notes,
          (
            SELECT COUNT(*) FROM document_property dp 
            WHERE document_unit_email(dp.document_id)=e.email_id
              AND document_property_type_id=4
          ) AS count_cta,
          (
            SELECT COUNT(*) FROM document_property dp 
            WHERE document_unit_email(dp.document_id)=e.email_id
              AND document_property_type_id=5
          ) AS count_responsive_actions
        FROM emails e
        JOIN contacts sender ON e.sender_id = sender.contact_id                      
        ${buildOrderBy({ sql, source: req, defaultSort: [{ field: 'sent_timestamp', sort: 'desc' }], columnMap: { sentOn: 'sent_timestamp' } })}          
        LIMIT ${num} OFFSET ${offset};`,
      { transform: mapRecordToSummary },
    );
    log((l) =>
      l.verbose({ msg: '[[AUDIT]] -  Email list:', resultset: result, num, offset }),
    );
    const total = await query(
      (sql) => sql`SELECT COUNT(*) AS records  FROM emails e
        JOIN contacts sender ON e.sender_id = sender.contact_id`,
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
      source: 'GET email',
    });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

/**
 * Handles the POST request to create a new email.
 *
 * @param {NextRequest} req - The incoming request object.
 * @returns {Promise<NextResponse>} - The response object containing the result of the email creation.
 * @throws {Error} - If there is an issue with the email creation process.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse request email_contents
    const {
      senderId: incomingSenderId,
      subject,
      body,
      sentOn,
      threadId,
      parentEmailId,
      recipients,
      sender,
    } = await req.json();

    // Support taking in either a senderId or sender object, with precendence given to
    // the id bacause you have to go out of your way to set it.
    const senderId = incomingSenderId ?? sender?.contactId;

    // Validate required fields
    if (
      !senderId ||
      !subject ||
      !body ||
      !sentOn ||
      !recipients ||
      recipients.length === 0
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Insert email into the database
    const result = await query(
      (
        sql,
      ) => sql`INSERT INTO emails (sender_id, subject, email_contents, sent_timestamp, thread_id, parent_email_id) 
       VALUES (${senderId}, ${subject}, ${body}, ${sentOn}, ${normalizeNullableNumeric(
         threadId,
       )}, ${normalizeNullableNumeric(parentEmailId)}) RETURNING *`,
      { transform: mapRecordToObject },
    );

    const emailId = Number(result[0].emailId);
    await insertRecipients(emailId, recipients);

    log((l) =>
      l.verbose({ msg: '[[AUDIT]] -  Email created:', resultset: result[0] }),
    );

    return NextResponse.json(
      {
        message: 'Email created successfully',
        email: result[0],
      },
      { status: 201 },
    );
  } catch (error) {
    if (ValidationError.isValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    log((l) =>
      l.error({
        source: 'POST email',
        error,
      }),
    );
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

/**
 * Handles the PUT request to update an existing email.
 *
 * @param {NextRequest} req - The incoming request object.
 * @returns {Promise<NextResponse>} - The response object containing the result of the email update.
 * @throws {Error} - If there is an issue with the email update process.
 */
export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse request email_contents
    const {
      emailId,
      senderId: incomingSenderId,
      subject,
      body,
      sentOn,
      threadId: incomingThreadId,
      parentEmailId: incomingParentEmailId,
      recipients,
      sender,
    } = await req.json();

    const threadId = normalizeNullableNumeric(incomingThreadId);
    const parentEmailId = normalizeNullableNumeric(incomingParentEmailId);
    // Support taking in either a senderId or sender object,
    // with precendence given ot the id bacause you have to go out of your way to set it.
    const senderId = incomingSenderId ?? sender?.contactId;

    // Validate required fields
    if (!emailId) {
      return NextResponse.json(
        { error: 'Email ID is required' },
        { status: 400 },
      );
    }

    // Validate that at least one field to update is provided
    if (
      !senderId &&
      !subject &&
      !body &&
      !sentOn &&
      (threadId ?? 0) < 1 &&
      (parentEmailId ?? 0) < 1
    ) {
      return NextResponse.json(
        { error: 'At least one field is required for update' },
        { status: 400 },
      );
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (senderId) {
      updateFields.push(`sender_id = $${paramIndex++}`);
      values.push(senderId);
    }
    if (subject) {
      updateFields.push(`subject = $${paramIndex++}`);
      values.push(subject);
    }
    if (body) {
      updateFields.push(`email_contents = $${paramIndex++}`);
      values.push(body);
    }
    if (sentOn) {
      updateFields.push(`sent_timestamp = $${paramIndex++}`);
      values.push(sentOn);
    }
    if (normalizeNullableNumeric(threadId)) {
      updateFields.push(`thread_id = $${paramIndex++}`);
      values.push(threadId);
    }
    if (normalizeNullableNumeric(parentEmailId)) {
      updateFields.push(`parent_email_id = $${paramIndex++}`);
      values.push(parentEmailId);
    }

    values.push(emailId); // Add email_id as the last parameter

    // Execute update query
    const result = await queryExt(
      (sql) =>
        sql<false, true>(
          `UPDATE emails SET ${updateFields.join(
            ', ',
          )} WHERE email_id = $${paramIndex} RETURNING *`,
          values,
        ),
      { transform: mapRecordToObject },
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Email not found or not updated' },
        { status: 404 },
      );
    }
    if (recipients && recipients.length > 0) {
      await insertRecipients(emailId, recipients, true);
    }

    log((l) =>
      l.verbose({ msg: '[[AUDIT]] -  Email updated:', resultset: result.rows[0] }),
    );

    return NextResponse.json(
      { message: 'Email updated successfully', email: result.rows[0] },
      { status: 200 },
    );
  } catch (error) {
    log((l) => l.error({ source: 'PUT email', error }));
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
