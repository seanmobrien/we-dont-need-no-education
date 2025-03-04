import { ValidationError } from '@/lib/react-util/errors';
import { FirstParameter, newUuid } from '@/lib/typescript';
import { ObjectRepository } from '../_types';
import { EmailMessageSummary } from '@/data-models/api/email-message';
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //): [string, Array<any>] {
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
/*
export class EmailRepository
  implements ObjectRepository<RepositoryEmail, 'emailId'>
{
  constructor() {}
  static MapRecordToSummary = mapRecordToSummary;
  static MapRecordToObject = mapRecordToObject;

  static logError(error: unknown): never {
    if (typeof error !== 'object' || error === null) {
      log((l) =>
        l.error(
          errorLogFactory({
            message: String(error),
            source: 'EmailRepository',
            error: error,
          })
        )
      );
      throw new LoggedError({
        error: new Error(String(error)),
        critical: true,
      });
    }
    if (DataIntegrityError.isDataIntegrityError(error)) {
      log((l) =>
        l.error(
          errorLogFactory({
            message: 'Database Integrity failure',
            source: 'EmailRepository',
            error,
          })
        )
      );
      throw new LoggedError({ error, critical: false });
    }
    if (ValidationError.isValidationError(error)) {
      log((l) =>
        l.error(
          errorLogFactory({
            message: 'Validation error',
            source: 'EmailRepository',
            error,
          })
        )
      );
      throw new LoggedError({ error, critical: false });
    }
    log((l) =>
      l.error(
        errorLogFactory({
          message: '[AUDIT] A database operation failed',
          source: 'EmailRepository',
          error,
        })
      )
    );
    throw new LoggedError({
      error: isError(error) ? error : new Error(String(error)),
      critical: true,
    });
  }

  async list(
    pagination?: PaginationStats
  ): Promise<PaginatedResultset<RepositoryEmailSummary>> {
    const { num, page, offset } = parsePaginationStats(pagination);
    try {
      const results = await query(
        (sql) =>
          sql`SELECT * FROM emails ORDER BY sent_timestamp DESC LIMIT ${num} OFFSET ${offset}`,
        { transform: EmailRepository.MapRecordToSummary }
      );
      if (results.length === page) {
        const total = await query(
          (sql) => sql`SELECT COUNT(*) as records FROM emails`
        );
        return {
          results,
          pageStats: {
            num,
            page,
            total: total[0].records as number,
          },
        };
      } else {
        return {
          results,
          pageStats: {
            num,
            page,
            total: offset + results.length,
          },
        };
      }
    } catch (error) {
      EmailRepository.logError(error);
    }
    return {
      results: [],
      pageStats: {
        num: 0,
        page: 0,
        total: 0,
      },
    };
  }

  async get(emailId: number): Promise<RepositoryEmail | null> {
    try {
      const result = await query(
        (sql) => sql`SELECT * FROM emails WHERE email_id = ${emailId}`,
        { transform: EmailRepository.MapRecordToObject }
      );
      return result.length === 1 ? result[0] : null;
    } catch (error) {
      EmailRepository.logError(error);
    }
    // should never get here as logError throws
    return null;
  }

  async create({
    senderId,
    threadId,
    parentEmailId,
    subject,
    emailContents,
    globalMessageId,
    importedFromId,
    sentOn,
  }: Omit<Partial<RepositoryEmail>, 'emailId'>): Promise<RepositoryEmail> {
    try {
      if (!senderId || !subject || !emailContents) {
        throw new ValidationError({
          field: 'senderId||subject||emailContents',
          source: 'EmailRepository',
        });
      }
      const result = await query(
        (sql) =>
          sql`INSERT INTO emails (sender_id, thread_id, parent_email_id, subject, email_contents, global_message_id, imported_from_id, sent_timestamp) VALUES (${senderId}, ${threadId}, ${parentEmailId}, ${subject}, ${emailContents}, ${globalMessageId}, ${importedFromId}, ${sentOn}) RETURNING *`,
        { transform: EmailRepository.MapRecordToObject }
      );
      log((l) => l.verbose('[ [AUDIT]] -  EmailMessage created:', result[0]));
      if (result.length !== 1) {
        throw new DataIntegrityError('Failed to create EmailMessage', {
          table: 'emails',
        });
      }
      return result[0];
    } catch (error) {
      EmailRepository.logError(error);
      throw error;
    }
  }

  async update({
    emailId,
    senderId,
    threadId,
    parentEmailId,
    globalMessageId,
    importedFromId,
    subject,
    emailContents,
    sentOn,
  }: PartialExceptFor<RepositoryEmail, 'emailId'>): Promise<RepositoryEmail> {
    if (!emailId) {
      throw new ValidationError({
        field: 'emailId',
        source: 'EmailRepository',
      });
    }
    if (!senderId && !subject && !emailContents && !sentOn) {
      throw new ValidationError({
        field: 'At least one field is required for update',
        source: 'EmailRepository',
      });
    }
    const updateFields: string[] = [];
    const values: unknown[] = [];
    const fieldMap = {
      sender_id: senderId,
      thread_id: threadId,
      parent_email_id: parentEmailId,
      subject,
      email_contents: emailContents,
      sent_timestamp: sentOn,
      imported_from_id: importedFromId,
      global_message_id: globalMessageId,
    };
    let paramIndex = 1;
    Object.entries(fieldMap).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    });
    values.push(emailId);

    try {
      const result = await queryExt(
        (sql) =>
          sql<false, true>(
            `UPDATE emails SET ${updateFields.join(
              ', '
            )} WHERE email_id = $${paramIndex} RETURNING *`.toString(),
            values
          ),
        { transform: EmailRepository.MapRecordToObject }
      );

      if (result.rowCount === 0) {
        throw new DataIntegrityError('Failed to update EmailMessage');
      }
      log((l) =>
        l.verbose('[[AUDIT]] -  EmailMessage updated:', result.rows[0])
      );
      return result.rows[0];
    } catch (error) {
      EmailRepository.logError(error);
      throw error;
    }
  }

  async delete(emailId: string): Promise<boolean> {
    if (!emailId) {
      throw new TypeError('emailId is required for delete');
    }
    try {
      const results = await query(
        (sql) => sql`
            DELETE FROM emails
            WHERE email_id = ${emailId}
            RETURNING email_id`
      );
      if (results.length === 0) {
        throw new DataIntegrityError('Failed to delete EmailMessage');
      }
      return true;
    } catch (error) {
      if (!EmailRepository.logError(error)) {
        throw error;
      }
    }
    return false;
  }
}
*/
