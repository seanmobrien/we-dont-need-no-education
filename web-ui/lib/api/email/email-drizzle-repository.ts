import { BaseDrizzleRepository } from '../_baseDrizzleRepository';
import { emails } from '@/drizzle/schema';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { eq } from 'drizzle-orm';


/**
 * Base repository interface supports object repository implementation
 */
type BaseEmailDrizzleRepository = BaseDrizzleRepository<EmailDomain, 'emailId'>;

/**
 * Domain model for Email entity used by the repository
 * This flattens the complex EmailMessage structure for database operations
 */
export type EmailDomain = {
  /** Unique identifier of the email */
  emailId: string;
  /** ID of the sender contact */
  senderId: number;
  /** Email subject */
  subject: string;
  /** Email body content */
  emailContents: string;
  /** When the email was sent */
  sentTimestamp: Date | string;
  /** Thread ID if part of a conversation */
  threadId?: number | null;
  /** Parent email ID if this is a reply */
  parentId?: string | null;
  /** Import source identifier */
  importedFromId?: string | null;
  /** Global message identifier */
  globalMessageId?: string | null;
};

/**
 * Summary version of EmailDomain for list operations
 */
export type EmailDomainSummary = Omit<EmailDomain, 'emailContents'> & {
  count_attachments?: number;
  count_kpi?: number;
  count_notes?: number;
  count_cta?: number;
  count_responsive_actions?: number;
};

/**
 * Maps a database record to an EmailDomain object
 * 
 * @param record - Database record from Drizzle query
 * @returns Mapped EmailDomain object
 */
const mapRecordToEmailDomain = (record: Record<string, unknown>): EmailDomain => ({
  emailId: record.emailId as string,
  senderId: record.senderId as number,
  subject: record.subject as string,
  emailContents: record.emailContents as string,
  sentTimestamp: record.sentTimestamp as string,
  threadId: record.threadId as number | null,
  parentId: record.parentId as string | null,
  importedFromId: record.importedFromId as string | null,
  globalMessageId: record.globalMessageId as string | null,
});

/**
 * Maps a database record to an EmailDomainSummary object (for list operations)
 * 
 * @param record - Database record from Drizzle query  
 * @returns Mapped EmailDomainSummary object
 */
const mapRecordToEmailDomainSummary = (record: Record<string, unknown>): Partial<EmailDomain> => ({
  emailId: record.emailId as string,
  senderId: record.senderId as number,
  subject: record.subject as string,
  sentTimestamp: record.sentTimestamp as string,
  threadId: record.threadId as number | null,
  parentId: record.parentId as string | null,
  importedFromId: record.importedFromId as string | null,
  globalMessageId: record.globalMessageId as string | null,
  // Note: emailContents is excluded from summary
});

/**
 * EmailDrizzleRepository provides Drizzle ORM-based data access
 * for email records. This repository handles the core email entity
 * operations using the drizzle data access layer.
 * 
 * The repository operates on a flattened domain model that can be
 * easily converted to the API response format by higher-level services.
 * 
 * @example
 * ```typescript
 * const repository = new EmailDrizzleRepository();
 * 
 * // Create a new email
 * const newEmail = await repository.create({
 *   senderId: 123,
 *   subject: "Test Email",
 *   emailContents: "Hello World",
 *   sentTimestamp: new Date()
 * });
 * 
 * // Get paginated list
 * const emails = await repository.list({ page: 1, num: 10 });
 * 
 * // Get single email
 * const email = await repository.get('email-uuid');
 * ```
 */  
  export class EmailDrizzleRepository extends BaseDrizzleRepository<
    EmailDomain,
    'emailId'
  > implements BaseEmailDrizzleRepository {
  constructor() {
    super({
      table: emails,
      recordMapper: mapRecordToEmailDomain,
      summaryMapper: mapRecordToEmailDomainSummary,
      tableName: 'emails',
      idField: 'emailId',
    });
  }

  /**
   * Validates email data for repository operations
   * 
   * @param method - The repository method being called
   * @param obj - The data object to validate
   * @throws {ValidationError} When validation fails
   */
  protected validate<TMethod extends keyof BaseEmailDrizzleRepository>(
    method: TMethod,
    obj: Record<string, unknown>,
  ): void {
    super.validate(method, obj);
    
    const email = obj as Partial<EmailDomain>;
    
    switch (method) {
      case 'create':
        if (!email.senderId || !email.subject || !email.emailContents) {
          throw new ValidationError({
            field: 'senderId||subject||emailContents',
            source: 'EmailDrizzleRepository::create',
          });
        }
        break;
      case 'update':
        if (!email.emailId) {
          throw new ValidationError({
            field: 'emailId',
            source: 'EmailDrizzleRepository::update',
          });
        }
        // At least one field besides emailId must be provided for update
        const updateFields = ['senderId', 'subject', 'emailContents', 'sentTimestamp', 
                             'threadId', 'parentId', 'importedFromId', 'globalMessageId'];
        if (!updateFields.some(field => email[field as keyof EmailDomain] !== undefined)) {
          throw new ValidationError({
            field: 'At least one field is required for update',
            source: 'EmailDrizzleRepository::update',
          });
        }
        break;
      default:
        break;
    }
  }

  /**
   * Prepares data for database insert operations
   * Maps domain object fields to database column names
   * 
   * @param model - Email domain object without ID
   * @returns Database insert data
   */
  protected prepareInsertData(model: Omit<EmailDomain, 'emailId'>): Record<string, unknown> {
    return {
      sender_id: model.senderId,
      subject: model.subject,
      email_contents: model.emailContents,
      sent_timestamp: model.sentTimestamp || new Date(),
      thread_id: model.threadId || null,
      parent_id: model.parentId || null,
      imported_from_id: model.importedFromId || null,
      global_message_id: model.globalMessageId || null,
    };
  }

  /**
   * Prepares data for database update operations  
   * Maps domain object fields to database column names
   * 
   * @param model - Partial email domain object with ID
   * @returns Database update data
   */
  protected prepareUpdateData(model: Partial<EmailDomain>): Record<string, unknown> {
    const updateData: Record<string, unknown> = {};
    
    if (model.senderId !== undefined) updateData.sender_id = model.senderId;
    if (model.subject !== undefined) updateData.subject = model.subject;
    if (model.emailContents !== undefined) updateData.email_contents = model.emailContents;
    if (model.sentTimestamp !== undefined) updateData.sent_timestamp = model.sentTimestamp;
    if (model.threadId !== undefined) updateData.thread_id = model.threadId;
    if (model.parentId !== undefined) updateData.parent_id = model.parentId;
    if (model.importedFromId !== undefined) updateData.imported_from_id = model.importedFromId;
    if (model.globalMessageId !== undefined) updateData.global_message_id = model.globalMessageId;
    
    return updateData;
  }

  /**
   * Finds an email by its global message ID
   * 
   * @param globalMessageId - The global message identifier to search for
   * @returns Promise resolving to email domain object or null if not found
   */
  async findByGlobalMessageId(globalMessageId: string): Promise<EmailDomain | null> {
    try {
      const records = await this.db
        .select()
        .from(this.config.table)
        .where(eq(emails.globalMessageId, globalMessageId))
        .limit(1);

      if (records.length === 0) {
        return null;
      }

      return this.config.recordMapper(records[0]);
    } catch (error) {
      this.logDatabaseError('findByGlobalMessageId', error);
      throw error;
    }
  }
}