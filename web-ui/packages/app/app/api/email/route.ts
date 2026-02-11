import { NextRequest, NextResponse } from 'next/server';
import { log } from '@compliance-theater/logger';
// (normalizeNullableNumeric no longer needed directly; handled in validation module)
import { ValidationError } from '@/lib/react-util/errors/validation-error';

import { EmailService } from '@/lib/api/email/email-service';
import {
  validateCreateEmail,
  validateUpdateEmail,
} from '@/lib/api/email/email-validation';
import {
  buildFallbackGrid,
  wrapRouteRequest,
} from '@/lib/nextjs-util/server/utils';
import { drizDbWithInit, schema } from '@compliance-theater/database';
import { eq, and, inArray } from 'drizzle-orm';
// count_kpi import removed; not used in this route currently
import {
  DrizzleSelectQuery,
  getEmailColumn,
  selectForGrid,
} from '@/lib/components/mui/data-grid/queryHelpers';
import { ContactSummary, EmailMessageSummary } from '@/data-models';
import { getAccessibleUserIds } from '@/lib/auth/resources/case-file';
import { getAccessToken } from '@/lib/auth/access-token';

export const dynamic = 'force-dynamic';

const NEVER_USE_USER_ID = -942370932 as const;

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
export const GET = wrapRouteRequest(
  async (req: NextRequest) => {
    const normalAccessToken = await getAccessToken(req);
    const eligibleUserIds = (await getAccessibleUserIds(normalAccessToken)) ?? [
      NEVER_USE_USER_ID,
    ];
    const results = await drizDbWithInit(async (db) => {
      const getColumn = (columnName: string) => {
        switch (columnName) {
          case 'sentOn':
            return schema.emails.sentTimestamp;
          case 'sender':
            return schema.contacts.name;
          case 'count_cta':
            return schema.emails.countCta;
          case 'count_kpi':
            return schema.emails.countKpi;
          case 'count_notes':
            return schema.emails.countNotes;
          case 'count_responsive_actions':
            return schema.emails.countResponsiveActions;
          case 'count_attachments':
            return schema.emails.countAttachments;
          default:
            return getEmailColumn({ columnName, table: schema.emails });
        }
      };

      const bq = db
        .select({
          emailId: schema.emails.emailId,
          senderId: schema.emails.senderId,
          senderName: schema.contacts.name,
          senderEmai: schema.contacts.email,
          subject: schema.emails.subject,
          sentOn: schema.emails.sentTimestamp,
          threadId: schema.emails.threadId,
          parentEmailId: schema.emails.parentId,
          importedFromId: schema.emails.importedFromId,
          globalMessageId: schema.emails.globalMessageId,
          count_kpi: schema.emails.countKpi,
          count_notes: schema.emails.countNotes,
          count_cta: schema.emails.countCta,
          count_responsive_actions: schema.emails.countResponsiveActions,
          count_attachments: schema.emails.countAttachments,
        })
        .from(schema.emails)
        // Inner join to document units with user id allow-list provides access filter
        .innerJoin(
          schema.documentUnits,
          and(
            and(
              eq(schema.emails.emailId, schema.documentUnits.emailId),
              eq(schema.documentUnits.documentType, 'email'),
            ),
            inArray(schema.documentUnits.userId, eligibleUserIds),
          ),
        )
        // Inner join to contacts to get sender name and email
        .innerJoin(
          schema.contacts,
          eq(schema.emails.senderId, schema.contacts.contactId),
        );
      return await selectForGrid<EmailMessageSummary>({
        req,
        query: bq as unknown as DrizzleSelectQuery,
        getColumn,
        defaultSort: 'sentOn',
        recordMapper: (emailDomain) => ({
          emailId: String(emailDomain.emailId),
          sender: {
            contactId: Number(emailDomain.senderId),
            name: String(emailDomain.senderName),
            email: String(emailDomain.senderEmail),
          } as ContactSummary,
          subject: String(emailDomain.subject ?? ''),
          sentOn: new Date(
            emailDomain.sentOn
              ? Date.parse(String(emailDomain.sentOn))
              : Date.now(),
          ),
          threadId: emailDomain.threadId
            ? Number(emailDomain.threadId)
            : undefined,
          parentEmailId: emailDomain.parentId
            ? String(emailDomain.parentId)
            : undefined,
          importedFromId: emailDomain.importedFromId
            ? String(emailDomain.importedFromId)
            : undefined,
          globalMessageId: emailDomain.globalMessageId
            ? String(emailDomain.globalMessageId)
            : undefined,
          recipients: emailDomain.recipients as Array<ContactSummary>,
          count_attachments: Number(emailDomain.count_attachments) ?? 0,
          count_kpi: Number(emailDomain.count_kpi) ?? 0,
          count_notes: Number(emailDomain.count_notes) ?? 0,
          count_cta: Number(emailDomain.count_cta) ?? 0,
          count_responsive_actions:
            Number(emailDomain.count_responsive_actions) ?? 0,
        }),
      });
    });

    return Response.json(results);
  },
  { buildFallback: buildFallbackGrid },
);

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
export const POST = wrapRouteRequest(
  async (req: NextRequest): Promise<NextResponse> => {
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
  },
);

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
export const PUT = wrapRouteRequest(
  async (req: NextRequest): Promise<NextResponse> => {
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
  },
);

/**
 * Handles the DELETE request to remove an email.
 *
 * This function uses the EmailService to delete an email by ID.
 *
 * @param {NextRequest} req - The incoming request object.
 * @returns {Promise<NextResponse>} - The response object containing the result of the email deletion.
 */
export const DELETE = wrapRouteRequest(
  async (req: NextRequest): Promise<NextResponse> => {
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
        return NextResponse.json({ error: 'Email not found' }, { status: 404 });
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
  },
);
