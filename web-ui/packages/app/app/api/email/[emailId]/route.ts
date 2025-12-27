import { NextRequest, NextResponse } from 'next/server';
import {
  buildFallbackGrid,
  wrapRouteRequest,
} from '@/lib/nextjs-util/server/utils';
import { log } from '@compliance-theater/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { extractParams } from '@/lib/nextjs-util/server/utils';
import { eq } from 'drizzle-orm';
import { drizDbWithInit, schema } from '@/lib/drizzle-db';
import {
  checkCaseFileAuthorization,
  CaseFileScope,
} from '@/lib/auth/resources/case-file';
import { unauthorizedServiceResponse } from '@/lib/nextjs-util/server/unauthorized-service-response';

/**
 * Extracts the emailId out of the route parameters, with some magic to support document IDs if that's what we were given.
 * @param req - The request object containing the emailId parameter.
 * @template T - The type of the request parameters, which should include an emailId property
 * @returns A promise that resolves to an object containing the emailId and an optional documentId
 */
const extractEmailId = async <T extends { emailId: string }>(req: {
  params: T | Promise<T>;
}): Promise<{ emailId: string | null; documentId?: number }> => {
  const { emailId } = await extractParams<T>(req);
  // If no email id provided, return null
  if (!emailId) {
    return { emailId: null };
  }
  // Otherwise check to see if we got a GUID
  const guidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (guidRegex.test(emailId)) {
    // If so, return it as-is
    return { emailId };
  }
  // If not, see if it can be interpreted as a document id (eg a number)
  const documentId = Number(emailId);
  if (!documentId || Number.isNaN(documentId)) {
    // If not, return null
    return { emailId: null };
  }
  // If so try and look it up
  const doc = await drizDbWithInit((db) => {
    return db.query.documentUnits.findFirst({
      where: (d, { eq }) => eq(d.unitId, documentId),
      columns: {
        unitId: true,
        emailId: true,
      },
    });
  });
  if (doc) {
    // And if we found it, return the email id with the doc id for context
    return { emailId: doc.emailId, documentId: doc.unitId };
  }
  // Otherwise, we have nada
  return { emailId: null };
};

export const dynamic = 'force-dynamic';

export const GET = wrapRouteRequest(
  async (
    req: NextRequest,
    withParams: { params: Promise<{ emailId: string }> }
  ) => {
    const { emailId, documentId } = await extractEmailId(withParams);
    if (!emailId) {
      return NextResponse.json(
        { error: 'Email ID is required' },
        { status: 400 }
      );
    }

    // Check case file authorization
    const authCheck = await checkCaseFileAuthorization(req, emailId, {
      requiredScope: CaseFileScope.READ,
    });
    if (!authCheck.authorized) {
      return (
        authCheck.response ??
        unauthorizedServiceResponse({ req, scopes: ['case-file:read'] })
      );
    }

    try {
      const record = await (
        await drizDbWithInit()
      ).query.emails.findFirst({
        where: (e, { eq }) => eq(e.emailId, emailId),
        with: {
          sender: {
            columns: {
              contactId: true,
              name: true,
              email: true,
            },
          },
          emailRecipients: {
            with: {
              recipient: {
                columns: {
                  contactId: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        columns: {
          emailId: true,
          subject: true,
          emailContents: true,
          sentTimestamp: true,
          threadId: true,
          parentId: true,
        },
      });
      if (!record) {
        return NextResponse.json({ error: 'Email not found' }, { status: 404 });
      }
      const result = {
        emailId: record.emailId,
        subject: record.subject,
        body: record.emailContents,
        sentOn: record.sentTimestamp,
        threadId: record.threadId,
        parentEmailId: record.parentId,
        sender: {
          contactId: record.sender.contactId,
          name: record.sender.name,
          email: record.sender.email,
        },
        recipients: (record.emailRecipients || []).map((er) => ({
          contactId: er.recipient.contactId,
          name: er.recipient.name,
          email: er.recipient.email,
        })),
        // If they passed us a document id, include it in the response
        ...(documentId ? { documentId } : {}),
      };
      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'GET email/emailId',
        msg: 'Error fetching email details',
        include: { emailId: emailId },
      });
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  },
  { buildFallback: buildFallbackGrid }
);

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
export const DELETE = wrapRouteRequest(
  async (
    req: NextRequest,
    withParams: {
      params: Promise<{ emailId: string }>;
    }
  ): Promise<NextResponse> => {
    const { emailId } = await extractEmailId(withParams);
    if (!emailId) {
      return NextResponse.json(
        { error: 'Email ID is required' },
        { status: 400 }
      );
    }

    // Check case file authorization (write scope required for deletion)
    const authCheck = await checkCaseFileAuthorization(req, emailId, {
      requiredScope: CaseFileScope.WRITE,
    });
    if (!authCheck.authorized) {
      return (
        authCheck.response ??
        unauthorizedServiceResponse({ req, scopes: ['case-file:write'] })
      );
    }

    try {
      const records = await (await drizDbWithInit())
        .delete(schema.emails)
        .where(eq(schema.emails.emailId, emailId))
        .returning({ emailId: schema.emails.emailId });
      if (records.length === 0) {
        return NextResponse.json({ error: 'Email not found' }, { status: 404 });
      }
      const { emailId: deletedEmailId } = records[0];
      log((l) =>
        l.verbose({
          msg: '[[AUDIT]] -  Email deleted:',
          resultset: deletedEmailId,
        })
      );
      return NextResponse.json(
        { message: 'Email deleted successfully', email: deletedEmailId },
        { status: 200 }
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
        { status: 500 }
      );
    }
  }
);
