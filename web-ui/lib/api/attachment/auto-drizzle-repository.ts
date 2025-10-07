import { BaseDrizzleRepository } from '../_baseDrizzleRepository';
import { EmailAttachment } from '/data-models/api/attachment';
import { emailAttachments } from '/drizzle/schema';

/**
 * Maps a database record to an EmailAttachment domain object
 */
const mapRecordToEmailAttachment = (
  record: Record<string, unknown>,
): EmailAttachment => ({
  attachmentId: record.attachmentId as number,
  fileName: record.fileName as string,
  filePath: record.filePath as string,
  extractedText: (record.extractedText as string) || null,
  extractedTextTsv: null, // Not supported in Drizzle schema yet
  policyId: (record.policyId as number) || null,
  summary: (record.summary as string) || null,
  emailId: record.emailId as string,
  mimeType: record.mimeType as string,
  size: record.size as number,
});

/**
 * Maps a database record to a partial EmailAttachment (summary view)
 */
const mapRecordToEmailAttachmentSummary = (
  record: Record<string, unknown>,
): Partial<EmailAttachment> => ({
  attachmentId: record.attachmentId as number,
  fileName: record.fileName as string,
  filePath: record.filePath as string,
  policyId: (record.policyId as number) || null,
  emailId: record.emailId as string,
  mimeType: record.mimeType as string,
  size: record.size as number,
});

/**
 * Example repository demonstrating auto-detection of primary key column and field.
 * This shows how idColumn and idField can be automatically inferred from the table schema.
 */
export class EmailAttachmentAutoDrizzleRepository extends BaseDrizzleRepository<
  EmailAttachment,
  'attachmentId'
> {
  constructor() {
    super({
      table: emailAttachments,
      // No idColumn or idField specified - they will be auto-detected!
      // The primary key column 'attachment_id' will be detected and mapped to field 'attachmentId'
      recordMapper: mapRecordToEmailAttachment,
      summaryMapper: mapRecordToEmailAttachmentSummary,
      tableName: 'email_attachments',
    });
  }

  protected prepareInsertData(
    model: Omit<EmailAttachment, 'attachmentId'>,
  ): Record<string, unknown> {
    return {
      fileName: model.fileName,
      filePath: model.filePath,
      extractedText: model.extractedText || null,
      policyId: model.policyId || null,
      summary: model.summary || null,
      emailId: model.emailId,
      mimeType: model.mimeType,
      size: model.size,
    };
  }

  protected prepareUpdateData(
    model: Partial<EmailAttachment>,
  ): Record<string, unknown> {
    const updateData: Record<string, unknown> = {};

    if (model.fileName !== undefined) updateData.fileName = model.fileName;
    if (model.filePath !== undefined) updateData.filePath = model.filePath;
    if (model.extractedText !== undefined)
      updateData.extractedText = model.extractedText;
    if (model.policyId !== undefined) updateData.policyId = model.policyId;
    if (model.summary !== undefined) updateData.summary = model.summary;
    if (model.mimeType !== undefined) updateData.mimeType = model.mimeType;
    if (model.size !== undefined) updateData.size = model.size;

    return updateData;
  }
}
