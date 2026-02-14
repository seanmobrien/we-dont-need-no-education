import { EmailDrizzleRepository, } from './email-drizzle-repository';
import { query } from '@compliance-theater/database/driver';
import { log } from '@compliance-theater/logger';
import { auth } from '@/auth';
export class EmailService {
    repository;
    constructor() {
        this.repository = new EmailDrizzleRepository();
    }
    async getEmailById(emailId) {
        try {
            const emailDomain = await this.repository.get(emailId);
            if (!emailDomain) {
                return null;
            }
            const senderResult = await query((sql) => sql `SELECT contact_id, name, email FROM contacts WHERE contact_id = ${emailDomain.senderId}`);
            const sender = senderResult.length > 0
                ? {
                    contactId: senderResult[0].contact_id,
                    name: senderResult[0].name,
                    email: senderResult[0].email,
                }
                : {
                    contactId: emailDomain.senderId,
                    name: 'Unknown',
                    email: 'unknown@example.com',
                };
            const recipientsResult = await query((sql) => sql `
          SELECT 
            c.contact_id as recipient_id,
            c.name as recipient_name,
            c.email as recipient_email
          FROM email_recipients er
          LEFT JOIN contacts c ON er.recipient_id = c.contact_id
          WHERE er.email_id = ${emailId}
            AND c.contact_id IS NOT NULL
        `);
            const recipients = recipientsResult.map((rec) => ({
                contactId: rec.recipient_id,
                name: rec.recipient_name,
                email: rec.recipient_email,
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
        }
        catch (error) {
            log((l) => l.error({ source: 'EmailService::getEmailById', error }));
            throw error;
        }
    }
    async createEmail(request) {
        try {
            const senderId = request.senderId ?? request.sender?.contactId;
            if (!senderId) {
                throw new Error('Sender ID is required');
            }
            let userId = request.userId;
            if (!userId) {
                const session = await auth();
                userId = session?.user?.id ? Number(session.user.id) : undefined;
                if (!userId) {
                    throw new Error('User ID is required');
                }
            }
            const emailDomain = {
                senderId,
                userId,
                subject: request.subject,
                emailContents: request.body,
                sentTimestamp: request.sentOn || new Date(),
                threadId: request.threadId || null,
                parentId: request.parentEmailId || null,
            };
            const createdEmail = await this.repository.create(emailDomain);
            if (request.recipients && request.recipients.length > 0) {
                await this.insertRecipients(createdEmail.emailId, request.recipients);
            }
            const importDate = createdEmail.sentTimestamp
                ? new Date(createdEmail.sentTimestamp)
                : new Date();
            await query((sql) => sql `
          INSERT INTO document_units (email_id, user_id, content, created_on, document_type)
          VALUES (${createdEmail.emailId}, ${userId}, ${createdEmail.emailContents}, ${importDate}, 'email')
        `);
            const fullEmail = await this.getEmailById(createdEmail.emailId);
            if (!fullEmail) {
                throw new Error('Failed to retrieve created email');
            }
            log((l) => l.verbose({
                message: '[[AUDIT]] - Email created via service:',
                resultset: fullEmail,
            }));
            return fullEmail;
        }
        catch (error) {
            log((l) => l.error({ source: 'EmailService::createEmail', error }));
            throw error;
        }
    }
    async updateEmail(request) {
        try {
            const senderId = request.senderId ?? request.sender?.contactId;
            const updateData = {
                emailId: request.emailId,
            };
            if (senderId !== undefined)
                updateData.senderId = senderId;
            if (request.subject !== undefined)
                updateData.subject = request.subject;
            if (request.body !== undefined)
                updateData.emailContents = request.body;
            if (request.sentOn !== undefined)
                updateData.sentTimestamp = request.sentOn;
            if (request.threadId !== undefined)
                updateData.threadId = request.threadId;
            if (request.parentEmailId !== undefined)
                updateData.parentId = request.parentEmailId;
            const updatedEmail = await this.repository.update(updateData);
            if (request.recipients && request.recipients.length > 0) {
                await this.insertRecipients(request.emailId, request.recipients, true);
            }
            const fullEmail = await this.getEmailById(updatedEmail.emailId);
            if (!fullEmail) {
                throw new Error('Failed to retrieve updated email');
            }
            log((l) => l.verbose({
                message: '[[AUDIT]] - Email updated via service:',
                resultset: fullEmail,
            }));
            return fullEmail;
        }
        catch (error) {
            log((l) => l.error({ source: 'EmailService::updateEmail', error }));
            throw error;
        }
    }
    async deleteEmail(emailId) {
        try {
            const result = await this.repository.delete(emailId);
            log((l) => l.verbose({
                message: '[[AUDIT]] - Email deleted via service:',
                emailId,
                success: result,
            }));
            return result;
        }
        catch (error) {
            log((l) => l.error({ source: 'EmailService::deleteEmail', error }));
            throw error;
        }
    }
    async findEmailIdByGlobalMessageId(globalMessageId) {
        try {
            const email = await this.repository.findByGlobalMessageId(globalMessageId);
            return email?.emailId || null;
        }
        catch (error) {
            log((l) => l.error({
                source: 'EmailService::findEmailIdByGlobalMessageId',
                error,
            }));
            throw error;
        }
    }
    async insertRecipients(emailId, recipients, replaceExisting = false) {
        try {
            if (replaceExisting) {
                await query((sql) => sql `DELETE FROM email_recipients WHERE email_id = ${emailId}`);
            }
            for (const recipient of recipients) {
                await query((sql) => sql `
            INSERT INTO email_recipients (email_id, recipient_id)
            VALUES (${emailId}, ${recipient.recipientId})
            ON CONFLICT (email_id, recipient_id) DO NOTHING
          `);
            }
        }
        catch (error) {
            log((l) => l.error({ source: 'EmailService::insertRecipients', error }));
            throw error;
        }
    }
}
//# sourceMappingURL=email-service.js.map