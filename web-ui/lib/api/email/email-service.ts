import { EmailDrizzleRepository, EmailDomain } from './email-drizzle-repository';
import { EmailMessage, EmailMessageSummary } from '@/data-models/api/email-message';
import { ContactSummary } from '@/data-models/api/contact';
import { PaginatedResultset, PaginationStats } from '@/data-models';
import { query } from '@/lib/neondb';
import { log } from '@/lib/logger';

/**
 * Request model for creating emails via the service
 */
export type CreateEmailRequest = {
  senderId: number;
  subject: string;
  body: string;
  sentOn?: Date | string;
  threadId?: number | null;
  parentEmailId?: string | null;
  recipients: Array<{
    recipientId: number;
    recipientName?: string;
    recipientEmail?: string;
  }>;
  sender?: {
    contactId: number;
  };
};

/**
 * Request model for updating emails via the service
 */
export type UpdateEmailRequest = {
  emailId: string;
  senderId?: number;
  subject?: string;
  body?: string;
  sentOn?: Date | string;
  threadId?: number | null;
  parentEmailId?: string | null;
  recipients?: Array<{
    recipientId: number;
    recipientName?: string;
    recipientEmail?: string;
  }>;
  sender?: {
    contactId: number;
  };
};

/**
 * EmailService provides business logic layer for email operations.
 * It bridges between the API layer and the data access layer, handling
 * complex operations like fetching related data (contacts, recipients)
 * and converting between different data models.
 * 
 * This service abstracts the complexity of working with the drizzle repository
 * and provides a clean interface for the API routes.
 * 
 * @example
 * ```typescript
 * const service = new EmailService();
 * 
 * // Get emails with full contact information
 * const emails = await service.getEmailsSummary({ page: 1, num: 10 });
 * 
 * // Create new email with recipients
 * const newEmail = await service.createEmail({
 *   senderId: 123,
 *   subject: "Test",
 *   body: "Hello",
 *   recipients: [{ recipientId: 456 }]
 * });
 * ```
 */
export class EmailService {
  private repository: EmailDrizzleRepository;

  constructor() {
    this.repository = new EmailDrizzleRepository();
  }

  /**
   * Retrieves a paginated list of email summaries with sender and recipient information
   * 
   * @param pagination - Pagination parameters
   * @returns Promise resolving to paginated email summaries with contact info
   */
  async getEmailsSummary(pagination?: PaginationStats): Promise<PaginatedResultset<EmailMessageSummary>> {
    try {
      // Get emails from repository (just the basic email data)
      const emailsResult = await this.repository.list(pagination);
      
      // For each email, we need to fetch the full sender and recipient information
      const enrichedEmails: EmailMessageSummary[] = [];
      
      for (const emailDomain of emailsResult.results) {
        if (!emailDomain.emailId || !emailDomain.senderId) {
          continue; // Skip incomplete records
        }

        // Fetch sender information
        const senderResult = await query(
          (sql) => sql`SELECT contact_id, name, email FROM contacts WHERE contact_id = ${emailDomain.senderId}`,
        );
        
        const sender: ContactSummary = senderResult.length > 0 ? {
          contactId: senderResult[0].contact_id as number,
          name: senderResult[0].name as string,
          email: senderResult[0].email as string,
        } : {
          contactId: emailDomain.senderId,
          name: 'Unknown',
          email: 'unknown@example.com',
        };

        // Fetch recipients information
        const recipientsResult = await query(
          (sql) => sql`
            SELECT 
              c.contact_id as recipient_id,
              c.name as recipient_name,
              c.email as recipient_email
            FROM email_recipients er
            LEFT JOIN contacts c ON er.recipient_id = c.contact_id
            WHERE er.email_id = ${emailDomain.emailId}
              AND c.contact_id IS NOT NULL
          `,
        );

        const recipients: ContactSummary[] = recipientsResult.map((rec) => ({
          contactId: rec.recipient_id as number,
          name: rec.recipient_name as string,
          email: rec.recipient_email as string,
        }));

        // Fetch count information (matching the original query structure)
        const countsResult = await query(
          (sql) => sql`
            SELECT 
              (SELECT COUNT(*) FROM email_attachments ea WHERE ea.email_id = ${emailDomain.emailId}) AS count_attachments,
              (
                SELECT COUNT(*) FROM document_property dp 
                JOIN document_units d2 ON d2.unit_id = dp.document_id
                WHERE d2.email_id = ${emailDomain.emailId}
                  AND document_property_type_id = 9
              ) AS count_kpi,
              (
                SELECT COUNT(*) FROM document_property dp 
                WHERE document_unit_email(dp.document_id) = ${emailDomain.emailId}
                  AND (document_property_type_id = 102 OR document_property_type_id = 1000)
              ) AS count_notes,
              (
                SELECT COUNT(*) FROM document_property dp 
                WHERE document_unit_email(dp.document_id) = ${emailDomain.emailId}
                  AND document_property_type_id = 4
              ) AS count_cta,
              (
                SELECT COUNT(*) FROM document_property dp 
                WHERE document_unit_email(dp.document_id) = ${emailDomain.emailId}
                  AND document_property_type_id = 5
              ) AS count_responsive_actions
          `,
        );

        const counts = countsResult[0] || {};

        // Build the final EmailMessageSummary
        const emailSummary: EmailMessageSummary = {
          emailId: emailDomain.emailId,
          sender,
          subject: emailDomain.subject || '',
          sentOn: emailDomain.sentTimestamp || new Date(),
          threadId: emailDomain.threadId || null,
          parentEmailId: emailDomain.parentId || null,
          importedFromId: emailDomain.importedFromId || null,
          globalMessageId: emailDomain.globalMessageId || null,
          recipients,
          count_attachments: Number(counts.count_attachments) || 0,
          count_kpi: Number(counts.count_kpi) || 0,
          count_notes: Number(counts.count_notes) || 0,
          count_cta: Number(counts.count_cta) || 0,
          count_responsive_actions: Number(counts.count_responsive_actions) || 0,
        };

        enrichedEmails.push(emailSummary);
      }

      log((l) =>
        l.verbose({
          message: '[[AUDIT]] - Email list via service:',
          resultset: enrichedEmails,
          pagination,
        }),
      );

      return {
        results: enrichedEmails,
        pageStats: emailsResult.pageStats,
      };
    } catch (error) {
      log((l) => l.error({ source: 'EmailService::getEmailsSummary', error }));
      throw error;
    }
  }

  /**
   * Retrieves a single email by ID with full details
   * 
   * @param emailId - The email ID to retrieve
   * @returns Promise resolving to email with full details or null
   */
  async getEmailById(emailId: string): Promise<EmailMessage | null> {
    try {
      const emailDomain = await this.repository.get(emailId);
      if (!emailDomain) {
        return null;
      }

      // Fetch sender information
      const senderResult = await query(
        (sql) => sql`SELECT contact_id, name, email FROM contacts WHERE contact_id = ${emailDomain.senderId}`,
      );
      
      const sender: ContactSummary = senderResult.length > 0 ? {
        contactId: senderResult[0].contact_id as number,
        name: senderResult[0].name as string,
        email: senderResult[0].email as string,
      } : {
        contactId: emailDomain.senderId,
        name: 'Unknown',
        email: 'unknown@example.com',
      };

      // Fetch recipients information
      const recipientsResult = await query(
        (sql) => sql`
          SELECT 
            c.contact_id as recipient_id,
            c.name as recipient_name,
            c.email as recipient_email
          FROM email_recipients er
          LEFT JOIN contacts c ON er.recipient_id = c.contact_id
          WHERE er.email_id = ${emailId}
            AND c.contact_id IS NOT NULL
        `,
      );

      const recipients: ContactSummary[] = recipientsResult.map((rec) => ({
        contactId: rec.recipient_id as number,
        name: rec.recipient_name as string,
        email: rec.recipient_email as string,
      }));

      return {
        emailId: emailDomain.emailId,
        sender,
        subject: emailDomain.subject,
        body: emailDomain.emailContents,
        sentOn: emailDomain.sentTimestamp,
        threadId: emailDomain.threadId || null,
        parentEmailId: emailDomain.parentId || null,
        importedFromId: emailDomain.importedFromId || null,
        globalMessageId: emailDomain.globalMessageId || null,
        recipients,
      };
    } catch (error) {
      log((l) => l.error({ source: 'EmailService::getEmailById', error }));
      throw error;
    }
  }

  /**
   * Creates a new email with recipients
   * 
   * @param request - Email creation request
   * @returns Promise resolving to created email with full details
   */
  async createEmail(request: CreateEmailRequest): Promise<EmailMessage> {
    try {
      // Support taking senderId from either the direct field or sender object
      const senderId = request.senderId ?? request.sender?.contactId;
      
      if (!senderId) {
        throw new Error('Sender ID is required');
      }

      // Create the email using the repository
      const emailDomain: Omit<EmailDomain, 'emailId'> = {
        senderId,
        subject: request.subject,
        emailContents: request.body,
        sentTimestamp: request.sentOn || new Date(),
        threadId: request.threadId || null,
        parentId: request.parentEmailId || null,
      };

      const createdEmail = await this.repository.create(emailDomain);

      // Insert recipients
      if (request.recipients && request.recipients.length > 0) {
        await this.insertRecipients(createdEmail.emailId, request.recipients);
      }

      // Create document unit for the email content
      const importDate = createdEmail.sentTimestamp ? new Date(createdEmail.sentTimestamp) : new Date();
      await query(
        (sql) => sql`
          INSERT INTO document_units (email_id, content, created_on, document_type)
          VALUES (${createdEmail.emailId}, ${createdEmail.emailContents}, ${importDate}, 'email')
        `,
      );

      // Return the full email details
      const fullEmail = await this.getEmailById(createdEmail.emailId);
      if (!fullEmail) {
        throw new Error('Failed to retrieve created email');
      }

      log((l) =>
        l.verbose({
          message: '[[AUDIT]] - Email created via service:',
          resultset: fullEmail,
        }),
      );

      return fullEmail;
    } catch (error) {
      log((l) => l.error({ source: 'EmailService::createEmail', error }));
      throw error;
    }
  }

  /**
   * Updates an existing email
   * 
   * @param request - Email update request
   * @returns Promise resolving to updated email with full details
   */
  async updateEmail(request: UpdateEmailRequest): Promise<EmailMessage> {
    try {
      // Support taking senderId from either the direct field or sender object
      const senderId = request.senderId ?? request.sender?.contactId;

      // Build update object
      const updateData: Partial<EmailDomain> &
        Required<Pick<EmailDomain, 'emailId'>> = {
        emailId: request.emailId,
      };

      if (senderId !== undefined) updateData.senderId = senderId;
      if (request.subject !== undefined) updateData.subject = request.subject;
      if (request.body !== undefined) updateData.emailContents = request.body;
      if (request.sentOn !== undefined) updateData.sentTimestamp = request.sentOn;
      if (request.threadId !== undefined) updateData.threadId = request.threadId;
      if (request.parentEmailId !== undefined) updateData.parentId = request.parentEmailId;

      const updatedEmail = await this.repository.update(updateData);

      // Update recipients if provided
      if (request.recipients && request.recipients.length > 0) {
        await this.insertRecipients(request.emailId, request.recipients, true);
      }

      // Return the full email details
      const fullEmail = await this.getEmailById(updatedEmail.emailId);
      if (!fullEmail) {
        throw new Error('Failed to retrieve updated email');
      }

      log((l) =>
        l.verbose({
          message: '[[AUDIT]] - Email updated via service:',
          resultset: fullEmail,
        }),
      );

      return fullEmail;
    } catch (error) {
      log((l) => l.error({ source: 'EmailService::updateEmail', error }));
      throw error;
    }
  }

  /**
   * Deletes an email by ID
   * 
   * @param emailId - The email ID to delete
   * @returns Promise resolving to true if deleted, false if not found
   */
  async deleteEmail(emailId: string): Promise<boolean> {
    try {
      const result = await this.repository.delete(emailId);
      
      log((l) =>
        l.verbose({
          message: '[[AUDIT]] - Email deleted via service:',
          emailId,
          success: result,
        }),
      );

      return result;
    } catch (error) {
      log((l) => l.error({ source: 'EmailService::deleteEmail', error }));
      throw error;
    }
  }

  /**
   * Finds an email by its global message ID
   * 
   * @param globalMessageId - The global message ID to search for
   * @returns Promise resolving to email ID or null if not found
   */
  async findEmailIdByGlobalMessageId(globalMessageId: string): Promise<string | null> {
    try {
      const email = await this.repository.findByGlobalMessageId(globalMessageId);
      return email?.emailId || null;
    } catch (error) {
      log((l) => l.error({ source: 'EmailService::findEmailIdByGlobalMessageId', error }));
      throw error;
    }
  }

  /**
   * Inserts or updates recipients for an email
   * 
   * @param emailId - The email ID
   * @param recipients - Array of recipient information
   * @param replaceExisting - Whether to delete existing recipients first
   */
  private async insertRecipients(
    emailId: string,
    recipients: Array<{ recipientId: number; recipientName?: string; recipientEmail?: string }>,
    replaceExisting = false,
  ): Promise<void> {
    try {
      if (replaceExisting) {
        // Delete existing recipients
        await query(
          (sql) => sql`DELETE FROM email_recipients WHERE email_id = ${emailId}`,
        );
      }

      // Insert new recipients
      for (const recipient of recipients) {
        await query(
          (sql) => sql`
            INSERT INTO email_recipients (email_id, recipient_id)
            VALUES (${emailId}, ${recipient.recipientId})
            ON CONFLICT (email_id, recipient_id) DO NOTHING
          `,
        );
      }
    } catch (error) {
      log((l) => l.error({ source: 'EmailService::insertRecipients', error }));
      throw error;
    }
  }
}