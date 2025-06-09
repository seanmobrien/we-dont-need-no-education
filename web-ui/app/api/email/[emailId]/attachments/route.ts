import { NextRequest, NextResponse } from 'next/server';
import { extractParams } from '@/lib/nextjs-util';
import { DocumentUnitRepository } from '@/lib/api/document-unit';
import { LoggedError } from '@/lib/react-util';
import { DocumentUnit } from '@/data-models/api/document-unit';

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
    // Create a DocumentUnitRepository instance with download key generation enabled
    const repo = new DocumentUnitRepository({ 
      generateDownloadKey: true,
      alwaysReturnContent: false,
    });

    // Get all document units for this email
    const documentUnits = await repo.list();
    
    // Filter for attachments related to this email
    const emailAttachments = documentUnits.results.filter((unit: Partial<DocumentUnit>) => 
      unit.emailId === emailId && 
      unit.documentType === 'attachment' && 
      unit.attachmentId !== null &&
      unit.attachmentId !== undefined
    );

    // Transform the data to include the attachment information we need
    const attachments = emailAttachments.map((unit: Partial<DocumentUnit>) => ({
      unitId: unit.unitId!,
      attachmentId: unit.attachmentId!,
      fileName: extractFileNameFromPath(unit.hrefDocument),
      hrefDocument: unit.hrefDocument,
      hrefApi: unit.hrefApi,
    }));

    return NextResponse.json(attachments, { status: 200 });
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

// Helper function to extract filename from a file path or URL
function extractFileNameFromPath(hrefDocument?: string): string | undefined {
  if (!hrefDocument) return undefined;
  
  // Remove query parameters first
  const urlWithoutQuery = hrefDocument.split('?')[0];
  
  // Extract filename from the path
  const segments = urlWithoutQuery.split('/');
  const fileName = segments[segments.length - 1];
  
  return fileName || undefined;
}