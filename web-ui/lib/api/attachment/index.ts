import { BaseObjectRepository } from '../_baseObjectRepository';
import { ObjectRepository } from '../_types';
import { ValidationError } from '@/lib/react-util';
import { FirstParameter } from '@/lib/typescript';
import { EmailAttachment } from '@/data-models/api/attachment';

export class EmailAttachmentsRepository extends BaseObjectRepository<
  EmailAttachment,
  'attachmentId'
> {
  constructor() {
    super({
      tableName: 'email_attachments',
      idField: ['attachmentId', 'attachment_id'],
      objectMap: (record) => ({
        attachmentId: Number(record.attachment_id),
        fileName: String(record.file_name),
        filePath: String(record.file_path),
        extractedText: record.extracted_text
          ? String(record.extracted_text)
          : null,
        extractedTextTsv: record.extracted_text_tsv
          ? String(record.extracted_text_tsv)
          : null,
        policyId: record.policy_id ? Number(record.policy_id) : null,
        summary: record.summary ? String(record.summary) : null,
        emailId: String(record.email_id),
        mimeType: String(record.mime_type),
        size: Number(record.size),
      }),
      summaryMap: (record) => ({
        attachmentId: Number(record.attachment_id),
        fileName: String(record.file_name),
        filePath: String(record.file_path),
        extractedText: record.extracted_text
          ? String(record.extracted_text)
          : null,
        extractedTextTsv: record.extracted_text_tsv
          ? String(record.extracted_text_tsv)
          : null,
        policyId: record.policy_id ? Number(record.policy_id) : null,
        summary: record.summary ? String(record.summary) : null,
        emailId: String(record.email_id),
        mimeType: String(record.mime_type),
        size: Number(record.size),
      }),
    });
  }

  validate<
    TMethod extends keyof ObjectRepository<EmailAttachment, 'attachmentId'>,
  >(
    method: TMethod,
    obj: FirstParameter<
      Pick<ObjectRepository<EmailAttachment, 'attachmentId'>, TMethod>[TMethod]
    >,
  ): void {
    const asModel = obj as EmailAttachment;
    if (
      method === 'create' &&
      (!asModel.fileName || !asModel.filePath || !asModel.emailId)
    ) {
      throw new ValidationError({
        field: 'fileName, filePath, or emailId',
        source: 'EmailAttachmentsRepository',
      });
    }
  }

  protected getListQueryProperties(): [string, Array<unknown>, string] {
    return [
      `SELECT * FROM email_attachments ORDER BY attachment_id`,
      [],
      `SELECT COUNT(*) as records FROM email_attachments`,
    ];
  }

  protected getQueryProperties(recordId: number): [string, Array<unknown>] {
    return [
      `SELECT * FROM email_attachments WHERE attachment_id = $1`,
      [recordId],
    ];
  }

  protected getCreateQueryProperties({
    fileName,
    filePath,
    extractedText,
    extractedTextTsv,
    policyId,
    summary,
    emailId,
    mimeType,
    size,
  }: EmailAttachment): [string, Array<unknown>] {
    return [
      `INSERT INTO email_attachments (file_name, file_path, extracted_text, extracted_text_tsv, policy_id, summary, email_id, mime_type, size) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        fileName,
        filePath,
        extractedText,
        extractedTextTsv,
        policyId,
        summary,
        emailId,
        mimeType,
        size,
      ],
    ];
  }

  protected getUpdateQueryProperties({
    fileName,
    filePath,
    extractedText,
    extractedTextTsv,
    policyId,
    summary,
    mimeType,
    size,
  }: EmailAttachment): [Record<string, unknown>] {
    return [
      {
        file_name: fileName,
        file_path: filePath,
        extracted_text: extractedText,
        extracted_text_tsv: extractedTextTsv,
        policy_id: policyId,
        summary: summary,
        mime_type: mimeType,
        size: size,
      },
    ];
  }
}
