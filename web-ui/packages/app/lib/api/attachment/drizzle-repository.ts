import { BaseDrizzleRepository } from '../_baseDrizzleRepository';
import { EmailAttachment } from '@/data-models/api/attachment';
import { emailAttachments } from '@compliance-theater/database/schema';
import { ValidationError } from '@compliance-theater/react/errors/validation-error';

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
 * EmailAttachmentDrizzleRepository provides Drizzle ORM-based data access
 * for email attachment records in a flattened format suitable for REST API consumption.
 *
 * This repository matches the output format of the existing SQL-based implementation
 * while leveraging Drizzle's type-safe query capabilities.
 */
export class EmailAttachmentDrizzleRepository extends BaseDrizzleRepository<
  EmailAttachment,
  'attachmentId'
> {
  constructor() {
    super({
      table: emailAttachments,
      recordMapper: mapRecordToEmailAttachment,
      summaryMapper: mapRecordToEmailAttachmentSummary,
    });
  }

  /**
   * Validates email attachment data for repository operations
   */
  protected validate<TMethod extends keyof EmailAttachmentDrizzleRepository>(
    method: TMethod,
    obj: Record<string, unknown>,
  ): void {
    super.validate(method, obj);

    const asModel = obj as EmailAttachment;

    switch (method) {
      case 'create':
        if (!asModel.fileName || !asModel.filePath || !asModel.emailId) {
          throw new ValidationError({
            field: 'fileName, filePath, or emailId',
            source: 'EmailAttachmentDrizzleRepository',
          });
        }
        if (!asModel.mimeType || typeof asModel.size !== 'number') {
          throw new ValidationError({
            field: 'mimeType or size',
            source: 'EmailAttachmentDrizzleRepository',
          });
        }
        break;

      case 'update':
        if (!asModel.attachmentId) {
          throw new ValidationError({
            field: 'attachmentId',
            source: 'EmailAttachmentDrizzleRepository',
          });
        }
        break;

      case 'get':
      case 'delete':
        if (!obj[this.idField]) {
          throw new ValidationError({
            field: String(this.idField),
            source: 'EmailAttachmentDrizzleRepository',
          });
        }
        break;
    }
  }

  /**
   * Prepares EmailAttachment data for database insertion
   */
  protected prepareInsertData(
    model: Omit<EmailAttachment, 'attachmentId'>,
  ): Record<string, unknown> {
    return {
      fileName: model.fileName,
      filePath: model.filePath,
      extractedText: model.extractedText || null,
      // Note: extractedTextTsv is not included as it's not supported in the Drizzle schema yet
      policyId: model.policyId || null,
      summary: model.summary || null,
      emailId: model.emailId,
      mimeType: model.mimeType,
      size: model.size,
    };
  }

  /**
   * Prepares EmailAttachment data for database updates
   */
  protected prepareUpdateData(
    model: Partial<EmailAttachment>,
  ): Record<string, unknown> | Promise<Record<string, unknown>> {
    // Exclude non-updatable fields and fields not in database schema
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { attachmentId, emailId, extractedTextTsv, ...updateFields } = model;

    // Filter out undefined values to only include fields being updated
    const updateData: Record<string, unknown> = {};
    Object.entries(updateFields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateData[key] = value;
      }
    });

    return updateData;
  }
}
