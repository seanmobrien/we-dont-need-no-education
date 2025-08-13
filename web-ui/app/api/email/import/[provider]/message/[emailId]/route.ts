import { NextRequest, NextResponse } from 'next/server';
import {
  defaultGmailErrorFilter,
  getImportMessageSource,
} from '../../_utilitites';
import { query, queryExt } from '@/lib/neondb';
import { newUuid } from '@/lib/typescript';
import {
  DefaultImportManager,
  queueStagedAttachments,
} from '@/lib/email/import/google';
import { LoggedError } from '@/lib/react-util/errors/logged-error';

export const dynamic = 'force-dynamic';

/**
 * Handles GET requests to retrieve an importable email message from the associated provider (e.g., Gmail).
 *
 * @param req - The incoming Next.js request object.
 * @param params - A promise resolving to an object containing the provider name and email ID.
 * @returns A response containing the importable message source or an error/status object.
 */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ provider: string; emailId: string }> },
) => {
  const { provider, emailId } = await params;
  const result = await getImportMessageSource({
    req,
    provider,
    emailId,
    refresh: true,
    errorFilter: defaultGmailErrorFilter,
  });
  return 'status' in result!
    ? result
    : NextResponse.json(result, { status: 200 });
};

/**
 * Handles the POST request to initiate the import process for a staged email.
 *
 * @param req - The incoming Next.js request object.
 * @param params - A promise resolving to an object containing the email provider and email ID.
 * @returns A JSON response with the result of the import operation.
 *
 * This API endpoint triggers the import process for a specific staged email, identified by the provider and emailId.
 */
export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ provider: string; emailId: string }> },
) => {
  const { provider, emailId } = await params;
  const importInstance = new DefaultImportManager(provider);
  const result = await importInstance.importEmail(emailId, { req });
  return NextResponse.json(result, { status: 200 });
};

/**
 * Handles the PUT request to stage an email message for import.
 *
 * This API endpoint processes an email message identified by the given provider and emailId,
 * stages it for import, and stores it in the `staging_message` table. If the message has already
 * been imported and the `refresh` query parameter is not set, it returns an error. If `refresh`
 * is set, it deletes the previous staging record and stages the message again.
 *
 * The endpoint also processes and stages any attachments associated with the email message.
 * If attachment processing fails, the staged message is rolled back and an error is returned.
 *
 * @param req - The Next.js request object.
 * @param params - An object containing the provider and emailId as route parameters.
 * @returns A JSON response with the staged message details and status code 201 on success,
 *          or an error message with the appropriate status code on failure.
 */
export const PUT = async (
  req: NextRequest,
  { params }: { params: Promise<{ provider: string; emailId: string }> },
) => {
  const { provider, emailId } = await params;
  const result = await getImportMessageSource({
    req,
    provider,
    emailId,
    refresh: true,
    errorFilter: defaultGmailErrorFilter,
  });
  if (!result) {
    return NextResponse.json({ error: 'message not found' }, { status: 404 });
  }
  if ('status' in result) {
    return result;
  }

  if (result.stage !== 'new') {
    if (req.nextUrl.searchParams.get('refresh')) {
      await query(
        (sql) =>
          sql`delete from staging_message where external_id = ${emailId}`,
      );
      result.stage = 'new';
    } else {
      return NextResponse.json(
        { error: 'message already imported' },
        { status: 400 },
      );
    }
  }
  const id = newUuid();
  const payload = JSON.stringify({
    external_id: emailId,
    id: id,
    stage: 'staged',
    message: result.raw,
    userId: result.userId,
  });
  const records = await queryExt((sql) =>
    sql(
      "INSERT INTO staging_message SELECT * FROM  \
      jsonb_populate_record(null::staging_message, '" +
        payload.replaceAll("'", "''") +
        "'::jsonb)",
    ),
  );
  if (records.rowCount !== 1) {
    return NextResponse.json(
      { error: 'Unexpected failure updating staging table.' },
      { status: 500 },
    );
  }
  // Stage attachments
  try {
    const attachments = await Promise.all(
      (result.raw.payload?.parts ?? []).flatMap((part) =>
        queueStagedAttachments({ req, stagedMessageId: id, part }),
      ),
    );
    if (!attachments.every((attachment) => attachment.status === 'success')) {
      throw new Error('Failed to stage attachments', { cause: attachments });
    }
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'email-import',
      data: { emailId, attachments: result.raw.payload?.parts },
    });
    try {
      await query((sql) => sql`delete from staging_message where id = ${id}`);
    } catch (suppress) {
      LoggedError.isTurtlesAllTheWayDownBaby(suppress, {
        log: true,
        source: 'email-import',
      });
    }
    return NextResponse.json(
      { error: 'Failed to process attachments' },
      { status: 500 },
    );
  }
  return NextResponse.json(
    {
      ...result,
      id,
      stage: 'staged',
    },
    { status: 201 },
  );
};
