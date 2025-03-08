import { ValidationError } from '@/lib/react-util/errors';
import { FirstParameter, newUuid } from '@/lib/typescript';
import { ObjectRepository } from '../_types';
import {
  EmailMessageAttachment,
  EmailMessageAttachmentSummary,
  EmailMessageSummary,
} from '@/data-models/api/email-message';
import { BaseObjectRepository } from '../_baseObjectRepository';
import { query } from '@/lib/neondb';

type RepositoryEmailSummary = Omit<
  EmailMessageSummary,
  'sender' | 'recipients'
> & { senderId: number };

type RepositoryEmail = RepositoryEmailSummary & { emailContents: string };

const mapRecordToSummary = (
  record: Record<string, unknown>
): RepositoryEmailSummary => ({
  emailId: record.email_id as string,
  subject: record.subject as string,
  sentOn: record.sent_timestamp as Date,
  senderId: Number(record.sender_id),
  globalMessageId: (record.global_message_id as string) ?? undefined,
  parentEmailId: record.parent_email_id as string | null,
  importedFromId: record.imported_from_id
    ? (record.imported_from_id as string)
    : null,
  threadId: record.thread_id ? (record.thread_id as number) : undefined,
});

const mapRecordToObject = (record: Record<string, unknown>) => ({
  ...mapRecordToSummary(record),
  senderId: Number(record.sender_id),
  emailContents: record.email_contents as string,
});

export class EmailRepository extends BaseObjectRepository<
  RepositoryEmail,
  'emailId'
> {
  constructor() {
    super({
      tableName: 'emails',
      idField: 'emailId',
      objectMap: mapRecordToObject,
      summaryMap: mapRecordToSummary,
    });
  }
  /**
   * Validates the input for a specific method.
   *
   * @template TMethod
   * @param {TMethod} method - The method to validate.
   * @param {FirstParameter<ObjectRepository<T, KId>[TMethod]>} obj - The input to validate.
   */
  validate<TMethod extends keyof ObjectRepository<RepositoryEmail, 'emailId'>>(
    method: TMethod,
    obj: FirstParameter<
      Pick<ObjectRepository<RepositoryEmail, 'emailId'>, TMethod>[TMethod]
    >
  ): void {
    const asModel = obj as RepositoryEmail;
    switch (method) {
      case 'create':
        if (!asModel.senderId || !asModel.subject || !asModel.emailContents) {
          throw new ValidationError({
            field: 'senderId||subject||emailContents',
            source: 'EmailRepository',
          });
        }
        break;
      case 'update':
        if (
          !asModel.emailId ||
          (!asModel.senderId &&
            !asModel.subject &&
            !asModel.globalMessageId &&
            !asModel.importedFromId &&
            !asModel.emailContents &&
            !asModel.sentOn)
        ) {
          throw new ValidationError({
            field: 'emailId||At least one field is required for update',
            source: 'EmailRepository',
          });
        }
        break;
      default:
        break;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected getListQueryProperties(): [string, Array<any>, string] {
    return [
      `SELECT * FROM emails ORDER BY sent_timestamp`,
      [],
      `SELECT COUNT(*) as records FROM emails`,
    ];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected getQueryProperties(emailId: string): [string, Array<any>] {
    return ['SELECT * FROM emails WHERE email_id = $1', [emailId]];
  }
  protected getCreateQueryProperties(
    obj: RepositoryEmail
  ): [
    string,
    [
      string,
      number,
      number | null,
      string | null,
      string,
      string,
      string | null,
      string | null,
      string | Date | null
    ]
  ] {
    if (!obj.emailId) {
      obj.emailId = newUuid();
    }
    return [
      'INSERT INTO emails (email_id, sender_id, thread_id, parent_id, subject, email_contents, global_message_id, imported_from_id, sent_timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING email_id',
      [
        obj.emailId,
        obj.senderId,
        obj.threadId ?? null,
        obj.parentEmailId ?? null,
        obj.subject,
        obj.emailContents,
        obj.globalMessageId ?? null,
        obj.importedFromId ?? null,
        obj.sentOn,
      ],
    ];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected updateQueryProperties(obj: RepositoryEmail): [Record<string, any>] {
    return [
      {
        sender_id: obj.senderId,
        thread_id: obj.threadId,
        parent_email_id: obj.parentEmailId,
        subject: obj.subject,
        email_contents: obj.emailContents,
        sent_timestamp: obj.sentOn,
        imported_from_id: obj.importedFromId,
        global_message_id: obj.globalMessageId,
      },
    ];
  }
  async getIdForUniqueMessageId(
    uniqueId: string | null
  ): Promise<string | null> {
    if (!uniqueId) return null;
    try {
      const result = await query(
        (sql) =>
          sql`select email_id from emails where global_message_id = ${uniqueId}`
      );
      return result.length === 1 ? (result[0].email_id as string) : null;
    } catch (error) {
      BaseObjectRepository.logError(this.source, error);
    }
    return null;
  }
}

const mapAttachmentRecordToSummary = (
  record: Record<string, unknown>
): EmailMessageAttachmentSummary => ({
  attachmentId: record.attachment_id as number,
  emailId: record.email_id as string,
  fileName: record.file_name as string,
  filePath: record.file_path as string,
});

const mapAttachmentRecordToObject = (
  record: Record<string, unknown>
): EmailMessageAttachment => ({
  ...mapAttachmentRecordToSummary(record),
  extractedText: record.extracted_text as string | null,
  extractedTextVector: record.extracted_text_vector as string | null,
  policyId: record.policy_id as number | null,
  summary: record.summary as string | null,
});

export class EmailAttachmentRepository extends BaseObjectRepository<
  EmailMessageAttachment,
  'attachmentId'
> {
  constructor() {
    super({
      tableName: 'email_attachments',
      idField: 'attachmentId',
      objectMap: mapAttachmentRecordToObject,
      summaryMap: mapAttachmentRecordToSummary,
    });
  }

  /**
   * Validates the input for a specific method.
   *
   * @template TMethod
   * @param {TMethod} method - The method to validate.
   * @param {FirstParameter<ObjectRepository<T, KId>[TMethod]>} obj - The input to validate.
   */
  validate<
    TMethod extends keyof ObjectRepository<
      EmailMessageAttachment,
      'attachmentId'
    >
  >(
    method: TMethod,
    obj: FirstParameter<
      Pick<
        ObjectRepository<EmailMessageAttachment, 'attachmentId'>,
        TMethod
      >[TMethod]
    >
  ): void {
    const asModel = obj as EmailMessageAttachment;
    switch (method) {
      case 'create':
        if (!asModel.fileName || !asModel.filePath || !asModel.emailId) {
          throw new ValidationError({
            field: 'fileName||filePath||emailId',
            source: 'EmailAttachmentRepository',
          });
        }
        break;
      case 'update':
        if (
          !asModel.attachmentId ||
          (!asModel.fileName &&
            !asModel.filePath &&
            !asModel.emailId &&
            !asModel.extractedText &&
            !asModel.extractedTextVector &&
            !asModel.policyId &&
            !asModel.summary)
        ) {
          throw new ValidationError({
            field: 'attachmentId||At least one field is required for update',
            source: 'EmailAttachmentRepository',
          });
        }
        break;
      default:
        break;
    }
  }
  protected getQueryProperties(attachmentId: number): [string, Array<number>] {
    return [
      'SELECT * FROM email_attachments WHERE attachment_id = $1',
      [attachmentId],
    ];
  }
  protected getCreateQueryProperties(
    obj: EmailMessageAttachment
  ): [
    string,
    [
      string,
      string,
      string | null,
      string | null,
      number | null,
      string | null,
      string
    ]
  ] {
    return [
      'INSERT INTO email_attachments (file_name, file_path, extracted_text, extracted_text_tsv, policy_id, summary, email_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING email_id',
      [
        obj.fileName,
        obj.filePath,
        obj.extractedText,
        obj.extractedTextVector,
        obj.policyId,
        obj.summary,
        obj.emailId,
      ],
    ];
  }
  protected updateQueryProperties(
    obj: EmailMessageAttachment
  ): [Record<string, string | number | null>] {
    return [
      {
        file_name: obj.fileName,
        file_path: obj.filePath,
        extracted_text: obj.extractedText,
        extracted_text_tsv: obj.extractedTextVector,
        policy_id: obj.policyId,
        summary: obj.summary,
        email_id: obj.emailId,
      },
    ];
  }
}
