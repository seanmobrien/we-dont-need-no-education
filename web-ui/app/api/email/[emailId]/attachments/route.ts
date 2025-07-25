import { NextRequest, NextResponse } from 'next/server';
import { extractParams } from '@/lib/nextjs-util';
import { LoggedError } from '@/lib/react-util';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { buildAttachmentDownloadUrl } from '@/lib/api';
import { getAbsoluteUrl } from '@/lib/site-util/url-builder';

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
    return await (drizDbWithInit().then(
      db => db.query.emailAttachments.findMany({
        where: (emailAttachments, { eq }) =>
          eq(emailAttachments.emailId, emailId),
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
          hrefApi: getAbsoluteUrl(`/api/attachment/${attachment.attachmentId}`),
        }));
        return NextResponse.json(result, { status: 200 });
      })
    ));
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
