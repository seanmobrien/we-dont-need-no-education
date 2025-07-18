import { NextResponse } from 'next/server';
import { BlobServiceClient } from '@azure/storage-blob';
import { env } from '@/lib/site-util/env';
import { log } from '@/lib/logger';
import { AttachmentRepository } from '@/lib/api/attachment';
import { extractParams } from '@/lib/nextjs-util';

const attachmentRepository = new AttachmentRepository();

export async function POST(
  req: Request,
  args: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await extractParams(args);

  if (!attachmentId) {
    return NextResponse.json(
      { error: 'Attachment ID is required' },
      { status: 400 },
    );
  }

  try {
    // Fetch attachment details using the AttachmentRepository
    const attachment = await attachmentRepository.get(Number(attachmentId));

    if (!attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 },
      );
    }

    const fileUrl = attachment.filePath;

    // Parse the fully qualified URL to get the blob client
    // Download the PDF file from Azure Blob Storage
    const AZURE_STORAGE_CONNECTION_STRING = env(
      'AZURE_STORAGE_CONNECTION_STRING',
    );
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      AZURE_STORAGE_CONNECTION_STRING,
    );
    const fileUrlParts = fileUrl.split('/');
    const containerName = fileUrlParts[fileUrlParts.length - 2];
    const blobName = decodeURIComponent(fileUrlParts[fileUrlParts.length - 1]);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    // Download the PDF file from Azure Blob Storage
    const downloadBlockBlobResponse = await blobClient.download();
    const chunks: Buffer[] = [];
    for await (const chunk of downloadBlockBlobResponse.readableStreamBody!) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    // Extract text from the PDF using dynamic import to prevent build issues
    const pdfData = await import('pdf-parse').then(pdfParse => pdfParse.default(pdfBuffer));
    const extractedText = pdfData.text?.trim();
    if (!extractedText) {
      return NextResponse.json(
        { error: 'No text found in the PDF' },
        { status: 400 },
      );
    }

    // Sanitize the extracted text to remove null characters
    const sanitizedText = extractedText.replace(/\x00/g, '');

    // Update the attachment using the AttachmentRepository
    await attachmentRepository.update({
      attachmentId: attachment.attachmentId,
      extractedText: sanitizedText,
    });

    log((l) =>
      l.info({ message: `Extracted text for attachment ${attachmentId}` }),
    );

    return NextResponse.json({
      message: 'Text extracted successfully',
      extractedText: sanitizedText,
    });
  } catch (error) {
    log((l) => l.error({ message: 'Error extracting text from PDF', error }));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
