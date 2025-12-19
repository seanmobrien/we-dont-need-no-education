import { NextRequest, NextResponse } from 'next/server';
import { extractParams } from '@/lib/nextjs-util/server/utils';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { buildAttachmentDownloadUrl } from '@/lib/api/attachment';
import { getAbsoluteUrl } from '@/lib/site-util/url-builder';
import { isValidUuid } from '@/lib/ai/tools/utility';
import {
  checkEmailAuthorization,
  CaseFileScope,
} from '@/lib/auth/resources/case-file';

// Helper function to extract filename from a file path or URL
const extractFileNameFromPath = (hrefDocument?: string): string | undefined => {
  if (!hrefDocument) return undefined;

  // Remove query parameters first
  const urlWithoutQuery = hrefDocument.split('?')[0];

  // Extract filename from the path
  const segments = urlWithoutQuery.split('/');
  const fileName = segments[segments.length - 1];

  return fileName || undefined;
};

export async function GET(
  req: NextRequest,
  withParams: { params: Promise<{ emailId: string }> },
) {
  const { emailId } = await extractParams(withParams);

  if (!emailId) {
    return NextResponse.json(
      { error: 'Email ID is required' },
      { status: 400 },
    );
  }

  try {
    let resolvedEmailId: string | null = null;
    if (isValidUuid(emailId)) {
      resolvedEmailId = emailId;

      // Check case file authorization
      const authCheck = await checkEmailAuthorization(req, resolvedEmailId, {
        requiredScope: CaseFileScope.READ,
      });
      if (!authCheck.authorized) {
        return authCheck.response;
      }
    } else {
      const emailNumericId = parseInt(emailId, 10);
      if (isNaN(emailNumericId)) {
        return NextResponse.json(
          { error: 'Invalid email ID format' },
          { status: 400 },
        );
      }
      resolvedEmailId = await drizDbWithInit((db) =>
        db.query.documentUnits
          .findFirst({
            where: (e, { eq }) => eq(e.unitId, emailNumericId),
            columns: {
              emailId: true,
            },
          })
          .then((doc) => doc?.emailId ?? null),
      );
      if (!resolvedEmailId) {
        return NextResponse.json({ error: 'Email not found' }, { status: 404 });
      }

      // Check case file authorization
      const authCheck = await checkEmailAuthorization(req, resolvedEmailId, {
        requiredScope: CaseFileScope.READ,
      });
      if (!authCheck.authorized) {
        return authCheck.response;
      }
    }
    return await drizDbWithInit((db) =>
      db.query.emailAttachments
        .findMany({
          where: (a, { eq }) => eq(a.emailId, resolvedEmailId),
          with: {
            email: {
              with: {
                doc: true,
              },
            },
          },
        })
        .then((attachments) => {
          // Transform the results to match the expected format
          const result = attachments.map((attachment) => ({
            unitId: attachment.email!.doc?.unitId,
            attachmentId: attachment.attachmentId,
            fileName: extractFileNameFromPath(attachment.filePath),
            hrefDocument: buildAttachmentDownloadUrl(attachment),
            hrefApi: getAbsoluteUrl(
              `/api/attachment/${attachment.attachmentId}`,
            ),
          }));
          return NextResponse.json(result, { status: 200 });
        }),
    );
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'GET email/emailId/attachments',
      msg: 'Error fetching email attachments',
      include: { emailId },
    });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
