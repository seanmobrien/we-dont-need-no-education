import { BlobServiceClient } from '@azure/storage-blob';
import { log, LoggedError } from '@compliance-theater/logger';
import { googleProviderFactory } from '@/app/api/email/import/[provider]/_googleProviderFactory';
import { query } from '@compliance-theater/database/driver';
import { env } from '@compliance-theater/env';
const downloadAttachment = async ({ messageId, attachmentId, userId, req, }) => {
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
const uploadToAzureStorage = async ({ buffer, externalId, fileName, mimeType, }) => {
    const AZURE_STORAGE_CONNECTION_STRING = env('AZURE_STORAGE_CONNECTION_STRING');
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(`email-attachments-${externalId}`);
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
const attachmentJobs = new Map();
export const extractAttachmentText = async ({ buffer, fileName, mimeType, }) => {
    if (!(mimeType === 'application/pdf' || fileName.endsWith('.pdf'))) {
        log((l) => l.verbose({
            message: `Attachment ${fileName} is not a PDF, skipping text extraction.`,
            data: { mimeType, fileName },
        }));
        return null;
    }
    try {
        const pdfBuffer = Buffer.from(buffer);
        const pdfParse = (await import('pdf-parse')).default;
        const pdfData = await pdfParse(pdfBuffer);
        const extractedText = pdfData.text?.trim();
        if (!extractedText) {
            log((l) => l.verbose({
                message: `Attachment ${fileName} is not a PDF, skipping text extraction.`,
                data: { mimeType, fileName },
            }));
            return null;
        }
        const sanitizedText = extractedText.replace(/\x00/g, '');
        log((l) => l.info({
            message: `Extracted ${sanitizedText.length} characters from attachment ${fileName}`,
            data: { mimeType, fileName },
        }));
        return sanitizedText;
    }
    catch (e) {
        LoggedError.isTurtlesAllTheWayDownBaby(e, {
            log: true,
            source: 'attachment-download',
            data: { fileName, mimeType },
        });
    }
    return null;
};
export const saveAttachment = async (req, id, job) => {
    try {
        log((l) => l.verbose({
            message: `Processing attachment download job ${id}.`,
            data: job,
        }));
        const { model } = job;
        const records = await query((sql) => sql `select external_id, "user_id" from staging_message where id=${model.stagedMessageId}`);
        if (!records.length) {
            throw new Error(`Staged message with ID ${model.stagedMessageId} not found`);
        }
        const attachmentBuffer = await downloadAttachment({
            req,
            messageId: String(records[0].external_id),
            attachmentId: model.attachmentId,
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
        await query((sql) => sql `UPDATE staging_attachment SET "storageId"=${fileUrl}, IMPORTED=true WHERE staging_message_id=${model.stagedMessageId} AND "partId"=${model.partId}`);
        const result = {
            result: { ...model, storageId: fileUrl, extractedText },
            success: true,
        };
        return result;
    }
    catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'attachment-download',
            data: { jobId: id, job },
        });
    }
};
export const queueAttachment = ({ req, job, id, }) => {
    if (attachmentJobs.has(id)) {
        log((l) => l.warn({ message: `Attachment job ${id} already exists` }));
        return;
    }
    attachmentJobs.set(id, saveAttachment(req, id, job));
};
export const getQueuedAttachment = (id) => {
    if (!attachmentJobs.has(id)) {
        throw new Error(`Attachment job ${id} not found`);
    }
    const operation = attachmentJobs.get(id);
    if (!operation) {
        throw new Error(`Attachment job ${id} not found`);
    }
    return operation.finally(() => {
        attachmentJobs.delete(id);
    });
};
//# sourceMappingURL=attachment-download.js.map