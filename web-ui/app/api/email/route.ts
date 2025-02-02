import { NextRequest, NextResponse } from 'next/server';
import { query, queryExt } from 'lib/neondb';


const aliasEmailContents = (input: Record<string, unknown> | unknown) => {
  if (typeof input !== 'object' || input === null || !('email_contents' in input)) {  
    return input;
  }
  const output = { body: input.email_contents, ...input };  
  delete output.email_contents;
  return output;
};

export async function POST(req: NextRequest) {
  try {
    // Parse request email_contents
    const { sender_id, subject, body, sent_timestamp } =
      await req.json();

    // Validate required fields
    if (!sender_id || !subject || !body || !sent_timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert email into the database
    const result = await query(
      (
        sql
      ) => sql`INSERT INTO email (sender_id, subject, email_contents, sent_timestamp) 
       VALUES (${sender_id}, ${subject}, ${body}, ${sent_timestamp}) RETURNING *`
    );
    return NextResponse.json(
      { message: 'Email created successfully', email: aliasEmailContents(result[0]) },
      { status: 201 }
    );
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Parse request email_contents
    const { email_id, sender_id, subject, body, sent_timestamp } =
      await req.json();

    // Validate required fields
    if (!email_id) {
      return NextResponse.json(
        { error: 'Email ID is required' },
        { status: 400 }
      );
    }

    // Validate that at least one field to update is provided
    if (!sender_id && !subject && !body && !sent_timestamp) {
      return NextResponse.json(
        { error: 'At least one field is required for update' },
        { status: 400 }
      );
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (sender_id) {
      updateFields.push(`sender_id = $${paramIndex++}`);
      values.push(sender_id);
    }
    if (subject) {
      updateFields.push(`subject = $${paramIndex++}`);
      values.push(subject);
    }
    if (body) {
      updateFields.push(`email_contents = $${paramIndex++}`);
      values.push(body);
    }
    if (sent_timestamp) {
      updateFields.push(`sent_timestamp = $${paramIndex++}`);
      values.push(sent_timestamp);
    }

    values.push(email_id); // Add email_id as the last parameter

    // Execute update query
    const result = await queryExt(sql => sql<false, true>(
      `UPDATE email SET ${updateFields.join(
        ', '
      )} WHERE email_id = $${paramIndex} RETURNING *`,
      values
    ));

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Email not found or not updated' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Email updated successfully', email: result.rows[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const emailId = searchParams.get('email_id');

    if (emailId) {
      // Fetch detailed email data
      const result = await query(
        (sql) => sql`
        SELECT 
          e.email_id,
          e.subject,
          e.email_contents AS body,
          e.sent_timestamp,
          e.thread_id,
          e.parent_email_id,
          sender.contact_id AS sender_id,
          sender.name AS sender_name,
          sender.email AS sender_email,
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
      `
      );

      if (result.length === 0) {
        return NextResponse.json({ error: 'Email not found' }, { status: 404 });
      }
      return NextResponse.json(result[0], { status: 200 });
    } else {
      // Fetch list of emails with sender info
      const result = await query(
        (sql) => sql`
        SELECT 
          e.email_id,
          e.subject,
          e.sent_timestamp,
          sender.contact_id AS sender_id,
          sender.name AS sender_name,
          sender.email AS sender_email
        FROM emails e
        JOIN contacts sender ON e.sender_id = sender.contact_id
        ORDER BY e.sent_timestamp DESC;
      `
      );

      return NextResponse.json(result, { status: 200 });
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
