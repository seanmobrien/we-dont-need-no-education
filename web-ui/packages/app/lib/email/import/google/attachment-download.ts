import { BlobServiceClient } from '@azure/storage-blob';
import { log } from '@/lib/logger';
import { googleProviderFactory } from '@/app/api/email/import/[provider]/_googleProviderFactory';
import { query } from '@/lib/neondb';
import type { StagedAttachment } from '@/lib/api/email/import/staged-attachment';
import { NextApiRequest } from 'next/types';
import { NextRequest } from 'next/server';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { env } from '@compliance-theater/env';

export type AttachmentDownloadJob = {
  model: StagedAttachment;
};

export type AttachmentDownloadResult = {
  result: StagedAttachment;
  success: boolean;
  error?: string;
};

const downloadAttachment = async ({
  messageId,
  attachmentId,
  userId,
  req,
}: {
  messageId: string;
  attachmentId: string;
  req: NextRequest | NextApiRequest;
  userId: number;
}): Promise<Buffer> => {
  const factoryResponse = await googleProviderFactory('google', {
    req,
    userId,
  });
  if ('status' in factoryResponse) {
    throw new Error('Error creating google provider');
  }
  const res = await factoryResponse.mail.attachments.get({
    userId: 'me',
    messageId,
    id: attachmentId,
  });
  if (!res.data.data) {
    throw new Error('Attachment data not found');
  }
  const attachmentData = res.data.data;
  return Buffer.from(attachmentData, 'base64');
};

const uploadToAzureStorage = async ({
  buffer,
  externalId,
  fileName,
  mimeType,
}: {
  buffer: Buffer;
  externalId: string;
  fileName: string;
  mimeType: string;
}): Promise<string> => {
  const AZURE_STORAGE_CONNECTION_STRING = env(
    'AZURE_STORAGE_CONNECTION_STRING',
  );

  const blobServiceClient = BlobServiceClient.fromConnectionString(
    AZURE_STORAGE_CONNECTION_STRING,
  );
  const containerClient = blobServiceClient.getContainerClient(
    `email-attachments-${externalId}`,
  );
  await containerClient.createIfNotExists();
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);
  await blockBlobClient.deleteIfExists();
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: mimeType || 'application/octet-stream',
      blobContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      blobContentEncoding: 'base64',
    },
  });
  return blockBlobClient.url;
};
const attachmentJobs = new Map<string, Promise<AttachmentDownloadResult>>();

export const extractAttachmentText = async ({
  buffer,
  fileName,
  mimeType,
}: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<string | null> => {
  // Are we working with a pdf?
  if (!(mimeType === 'application/pdf' || fileName.endsWith('.pdf'))) {
    // No, early exit
    log((l) =>
      l.verbose({
        message: `Attachment ${fileName} is not a PDF, skipping text extraction.`,
        data: { mimeType, fileName },
      }),
    );
    return null;
  }
  try {
    const pdfBuffer = Buffer.from(buffer);

    // Use dynamic import to prevent build issues with pdf-parse test files
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(pdfBuffer);
    const extractedText = pdfData.text?.trim();
    if (!extractedText) {
      // No extractable text, return null;
      log((l) =>
        l.verbose({
          message: `Attachment ${fileName} is not a PDF, skipping text extraction.`,
          data: { mimeType, fileName },
        }),
      );
      return null;
    }
    // Sanitize the extracted text to remove null characters
    const sanitizedText = extractedText.replace(/\x00/g, '');
    // and return it!
    log((l) =>
      l.info({
        message: `Extracted ${sanitizedText.length} characters from attachment ${fileName}`,
        data: { mimeType, fileName },
      }),
    );
    return sanitizedText;
  } catch (e) {
    LoggedError.isTurtlesAllTheWayDownBaby(e, {
      log: true,
      source: 'attachment-download',
      data: { fileName, mimeType },
    });
  }
  // If we made it to here we have no extracted text to return.
  return null;
};

export const saveAttachment = async (
  req: NextRequest | NextApiRequest,
  id: string,
  job: AttachmentDownloadJob,
): Promise<AttachmentDownloadResult> => {
  try {
    log((l) =>
      l.verbose({
        message: `Processing attachment download job ${id}.`,
        data: job,
      }),
    );

    const { model } = job;
    const records = await query(
      (sql) =>
        sql`select external_id, "user_id" from staging_message where id=${model.stagedMessageId}`,
    );
    if (!records.length) {
      throw new Error(
        `Staged message with ID ${model.stagedMessageId} not found`,
      );
    }
    const attachmentBuffer = await downloadAttachment({
      req,
      messageId: String(records[0].external_id),
      attachmentId: model.attachmentId!,
      userId: Number(records[0].userId),
    });
    const extractedText = await extractAttachmentText({
      buffer: attachmentBuffer,
      fileName: model.filename,
      mimeType: model.mimeType ?? 'application/octet-stream',
    });
    const fileUrl = await uploadToAzureStorage({
      buffer: attachmentBuffer,
      externalId: String(records[0].external_id),
      fileName: model.filename,
      mimeType: model.mimeType ?? 'application/octet-stream',
    });

    await query(
      (sql) =>
        sql`UPDATE staging_attachment SET "storageId"=${fileUrl}, IMPORTED=true WHERE staging_message_id=${model.stagedMessageId} AND "partId"=${model.partId}`,
    );

    const result: AttachmentDownloadResult = {
      result: { ...model, storageId: fileUrl, extractedText },
      success: true,
    };
    return result;
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'attachment-download',
      data: { jobId: id, job },
    });
  }
};
export const queueAttachment = ({
  req,
  job,
  id,
}: {
  req: NextRequest | NextApiRequest;
  job: AttachmentDownloadJob;
  id: string;
}) => {
  if (attachmentJobs.has(id)) {
    log((l) => l.warn({ message: `Attachment job ${id} already exists` }));
    return;
  }
  attachmentJobs.set(id, saveAttachment(req, id, job));
};
export const getQueuedAttachment = (id: string) => {
  if (!attachmentJobs.has(id)) {
    throw new Error(`Attachment job ${id} not found`);
  }
  const operation = attachmentJobs.get(id);
  if (!operation) {
    // note this should not happen, but just in case...
    throw new Error(`Attachment job ${id} not found`);
  }
  // Now that the job is being retrieved we can remove it from the map
  return operation.finally(() => {
    attachmentJobs.delete(id);
  });
};
