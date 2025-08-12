import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
// (normalizeNullableNumeric no longer needed directly; handled in validation module)
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { ValidationError } from '@/lib/react-util/errors/validation-error';

import { EmailService } from '@/lib/api/email/email-service';
import { parsePaginationStats } from '@/lib/components/mui/data-grid/queryHelpers/utility';
import { validateCreateEmail, validateUpdateEmail } from '@/lib/api/email/email-validation';
import { buildFallbackGrid, wrapRouteRequest } from '@/lib/nextjs-util/server/utils';

export const dynamic = 'force-dynamic';

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
export const GET = wrapRouteRequest(async (req: NextRequest): Promise<NextResponse> => {
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
}, { buildFallback: buildFallbackGrid });

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
export const POST = wrapRouteRequest(async (req: NextRequest): Promise<NextResponse> => {
  try {
    const raw = await req.json();
    const validated = validateCreateEmail(raw);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 },
      );
    }
    const emailService = new EmailService();
    const createdEmail = await emailService.createEmail(validated.data);

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
});

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
export const PUT = wrapRouteRequest(async (req: NextRequest): Promise<NextResponse> => {
  try {
    const raw = await req.json();
    const validated = validateUpdateEmail(raw);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 },
      );
    }
    const emailService = new EmailService();
    const updatedEmail = await emailService.updateEmail(validated.data);

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
});

/**
 * Handles the DELETE request to remove an email.
 *
 * This function uses the EmailService to delete an email by ID.
 *
 * @param {NextRequest} req - The incoming request object.
 * @returns {Promise<NextResponse>} - The response object containing the result of the email deletion.
 */
export const DELETE = wrapRouteRequest(async (req: NextRequest): Promise<NextResponse> => {
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
});
