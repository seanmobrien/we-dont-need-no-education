import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import {
  normalizeNullableNumeric,
} from '@/data-models/_utilities';
import { LoggedError, ValidationError } from '@/lib/react-util';

import { EmailService, CreateEmailRequest, UpdateEmailRequest } from '@/lib/api/email/email-service';
import { parsePaginationStats } from '@/lib/components/mui/data-grid/queryHelpers/utility';

/**
 * Handles the GET request to fetch a list of emails with sender and recipient information.
 *
 * This function uses the EmailService to retrieve emails with their sender's details and
 * a list of recipients. The results are returned as a JSON response with pagination support.
 *
 * @param req - The incoming request object
 * @returns {Promise<NextResponse>} A promise that resolves to a JSON response containing the
 * list of emails with sender and recipient information, or an error message if the request fails.
 *
 * @throws {Error} If there is an issue with the service operation or any other error occurs during
 * the execution of the function, an error is logged and a 500 Internal Server Error response is returned.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const thisUrl = new URL(req.url);
    const pagination = parsePaginationStats(thisUrl);
    
    // Use the EmailService to get emails with full contact information
    const emailService = new EmailService();
    const result = await emailService.getEmailsSummary(pagination);

    return NextResponse.json(result, { status: 200 });
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
 * This function uses the EmailService to create a new email with recipients and
 * automatically creates the associated document unit for content storage.
 *
 * @param {NextRequest} req - The incoming request object.
 * @returns {Promise<NextResponse>} - The response object containing the result of the email creation.
 * @throws {Error} - If there is an issue with the email creation process.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse request email_contents
    const requestData = await req.json();
    const {
      senderId: incomingSenderId,
      subject,
      body,
      sentOn,
      threadId,
      parentEmailId,
      recipients,
      sender,
    } = requestData;

    // Support taking in either a senderId or sender object, with precedence given to
    // the id because you have to go out of your way to set it.
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

    // Create email using the service
    const emailService = new EmailService();
    const createRequest: CreateEmailRequest = {
      senderId,
      subject,
      body,
      sentOn,
      threadId: normalizeNullableNumeric(threadId),
      parentEmailId,
      recipients: recipients.map((r: {
        recipientId?: number;
        recipient_id?: number;
        recipientName?: string;
        recipient_name?: string;
        recipientEmail?: string;
        recipient_email?: string;
      }) => ({
        recipientId: r.recipientId || r.recipient_id,
        recipientName: r.recipientName || r.recipient_name,
        recipientEmail: r.recipientEmail || r.recipient_email,
      })),
      sender,
    };

    const createdEmail = await emailService.createEmail(createRequest);

    return NextResponse.json(
      {
        message: 'Email created successfully',
        email: createdEmail,
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
 * This function uses the EmailService to update an existing email with new data
 * and optionally update recipients.
 *
 * @param {NextRequest} req - The incoming request object.
 * @returns {Promise<NextResponse>} - The response object containing the result of the email update.
 * @throws {Error} - If there is an issue with the email update process.
 */
export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse request email_contents
    const requestData = await req.json();
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
    } = requestData;

    const threadId = normalizeNullableNumeric(incomingThreadId);
    const parentEmailId = String(incomingParentEmailId);
    // Support taking in either a senderId or sender object,
    // with precedence given to the id because you have to go out of your way to set it.
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
      !parentEmailId
    ) {
      return NextResponse.json(
        { error: 'At least one field is required for update' },
        { status: 400 },
      );
    }

    // Update email using the service
    const emailService = new EmailService();
    const updateRequest: UpdateEmailRequest = {
      emailId,
      senderId,
      subject,
      body,
      sentOn,
      threadId,
      parentEmailId,
      recipients: recipients ? recipients.map((r: {
        recipientId?: number;
        recipient_id?: number;
        recipientName?: string;
        recipient_name?: string;
        recipientEmail?: string;
        recipient_email?: string;
      }) => ({
        recipientId: r.recipientId || r.recipient_id,
        recipientName: r.recipientName || r.recipient_name,
        recipientEmail: r.recipientEmail || r.recipient_email,
      })) : undefined,
      sender,
    };

    const updatedEmail = await emailService.updateEmail(updateRequest);

    return NextResponse.json(
      { message: 'Email updated successfully', email: updatedEmail },
      { status: 200 },
    );
  } catch (error) {
    if (ValidationError.isValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    log((l) => l.error({ source: 'PUT email', error }));
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

/**
 * Handles the DELETE request to remove an email.
 *
 * This function uses the EmailService to delete an email by ID.
 *
 * @param {NextRequest} req - The incoming request object.
 * @returns {Promise<NextResponse>} - The response object containing the result of the email deletion.
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const { emailId } = await req.json();

    if (!emailId) {
      return NextResponse.json(
        { error: 'Email ID is required' },
        { status: 400 },
      );
    }

    const emailService = new EmailService();
    const deleted = await emailService.deleteEmail(emailId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: 'Email deleted successfully' },
      { status: 200 },
    );
  } catch (error) {
    log((l) => l.error({ source: 'DELETE email', error }));
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
