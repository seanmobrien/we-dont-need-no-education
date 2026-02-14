import HTMLParser from 'node-html-parser';
import { log, LoggedError } from '@compliance-theater/logger';
import { mapContacts } from './utilities';
import { ContactRepository } from '@/lib/api/contacts/database';
import { EmailRepository } from '@/lib/api/email/database';
import { TransactionalStateManagerBase } from '../default/transactional-statemanager';
import { ThreadRepository } from '@/lib/api/thread/database';
import { DataIntegrityError } from '@/lib/react-util/errors/data-integrity-error';
import { ParsedHeaderMap } from '../../parsedHeaderMap';
import { query } from '@compliance-theater/database/driver';
class EmailStageManager extends TransactionalStateManagerBase {
    constructor(stage, options) {
        super(stage, options);
        this.#threadRepository =
            options?.threadRepository ?? new ThreadRepository();
        this.#emailRepository = options?.emailRepository ?? new EmailRepository();
        this.#contactRepository =
            options?.contactRepository ?? new ContactRepository();
    }
    #emailRepository;
    #contactRepository;
    #threadRepository;
    async run(context) {
        const { target, currentStage } = context;
        if (typeof target !== 'object') {
            throw new Error(`Expected source message: ${currentStage}`);
        }
        if (!target.raw?.payload) {
            throw new Error(`No valid payload found in the message: ${currentStage}`);
        }
        const emailContents = this.#extractEmailContent(target.raw.payload);
        if (!emailContents) {
            throw new Error(`No valid email content found in the message: ${currentStage}`);
        }
        const { savedSender, subject, globalMessageId, dateInHeader, threadId, parentEmailId, recipients, } = await this.#parseEmailProperties({ target });
        const emailData = {
            senderId: savedSender.contactId,
            threadId,
            parentEmailId,
            subject,
            importedFrom: target.raw.id ?? null,
            globalMessageId,
            emailContents,
            sentOn: dateInHeader ? new Date(dateInHeader) : new Date(0),
        };
        const { emailId, documentId } = await this.#insertEmailRecord(emailData);
        log((l) => l.info(`Inserted email record with ID: ${emailId}`));
        if (context.target) {
            context.target.targetId = emailId;
            context.target.documentId = documentId;
        }
        try {
            await this.#addRecipientsToEmail({ emailId, recipients });
            await this.#updateChildEmailParentIds({ globalMessageId, emailId });
        }
        catch (e) {
            const error = LoggedError.isTurtlesAllTheWayDownBaby(e, {
                log: true,
                source: 'email-import',
            });
            try {
                await query((sql) => sql `DELETE FROM emails WHERE email_id=${emailId}`);
            }
            catch (suppress) {
                LoggedError.isTurtlesAllTheWayDownBaby(suppress, {
                    log: true,
                    source: 'email-import-cleanup',
                });
            }
            throw error;
        }
        log((l) => l.info(`Processed email with ID: ${emailId}, thread ID: ${threadId}, subject: ${subject}`));
        return context;
    }
    async getThreadIdFromDatabase(threadId, subject) {
        if (!threadId) {
            return null;
        }
        const thread = await this.#threadRepository.get(threadId);
        if (thread) {
            return thread.threadId;
        }
        const newThread = await this.#threadRepository.create({
            externalId: threadId,
            subject,
            createdOn: new Date(),
        });
        if (!newThread) {
            throw new DataIntegrityError('Failed to create new thread.');
        }
        return newThread.threadId;
    }
    async getParentIdFromDatabase(globalId) {
        if (!globalId) {
            return Promise.resolve(null);
        }
        return Promise.resolve(null);
    }
    async #parseEmailProperties({ target, }) {
        const parsedHeaders = ParsedHeaderMap.fromHeaders(target.raw.payload.headers);
        const { sender, recipients } = mapContacts(parsedHeaders).reduce((acc, cur) => {
            if (cur.recipientType === 'from') {
                if (!acc.sender) {
                    acc.sender = cur;
                }
            }
            else {
                acc.recipients.push(cur);
            }
            return acc;
        }, {
            recipients: [],
            sender: undefined,
        });
        if (!sender || !sender.email) {
            throw new Error(`No valid sender found in the message: ${target.stage}`);
        }
        const savedSender = await this.#contactRepository.getContactsByEmails(sender.email);
        if (savedSender === null || !savedSender.length) {
            throw new Error(`Sender ID not found for the email: ${sender.email}`);
        }
        const savedRecipients = await this.#contactRepository.getContactsByEmails(recipients.map((r) => r.email));
        if (savedRecipients.length !== recipients.length) {
            throw new DataIntegrityError('Not all recipients were found in the database');
        }
        const subject = parsedHeaders.getFirstStringValue('Subject') ?? 'No Subject';
        let globalMessageId = parsedHeaders.getFirstStringValue('Message-ID') ?? null;
        if (globalMessageId) {
            globalMessageId = globalMessageId.replace(/^<|>$/g, '');
        }
        const dateInHeader = parsedHeaders.getFirstStringValue('Date') ?? null;
        const threadId = await this.getThreadIdFromDatabase(target.raw.threadId, subject);
        const parentEmailId = await this.getParentIdFromDatabase(globalMessageId);
        return {
            savedSender: savedSender[0],
            recipients: savedRecipients,
            subject,
            globalMessageId,
            dateInHeader,
            threadId,
            parentEmailId,
        };
    }
    #getContentParts({ part, expectedMimeType = 'text/plain', }) {
        const items = [];
        if (part.mimeType === expectedMimeType ||
            part.headers?.findIndex((h) => h.name === 'Content-Type' && h.value?.startsWith(expectedMimeType)) !== -1) {
            if (part.body && part.body.data) {
                items.push(part);
            }
        }
        return [
            ...items,
            ...(part.parts ?? []).flatMap((p) => this.#getContentParts({ part: p, expectedMimeType })),
        ];
    }
    #decodeAndNormalize(part) {
        if (!part.body?.data) {
            return '';
        }
        let foundReplyHeader = false;
        return (Buffer.from(part.body.data, 'base64')
            .toString('utf-8')
            .split('\n')
            .filter((line) => {
            if (foundReplyHeader) {
                return false;
            }
            if (/^On\s(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s*(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2},?\s\d{4}\s(?:at\s\d{1,2}:\d{2}(?:\s?[APap][Mm])?)?\s.+?\s<[^>]+>\swrote:\s*$/i.test(line)) {
                foundReplyHeader = true;
                return false;
            }
            return !line.startsWith('>');
        })
            .join('\n')
            .trim()
            .replace(/([\r\n]{1,2}\s*)(?![\r\n])/g, ' ')
            .replace(/[\r\n]{2,}/g, '\n')
            .trim());
    }
    async #addRecipientsToEmail({ emailId, recipients, }) {
        const uniqueRecipients = Array.from(new Map(recipients.map((r) => [r.contactId, r])).values());
        const operations = uniqueRecipients.map((recipient) => this.#contactRepository
            .addEmailRecipient(recipient.contactId, emailId, 'to')
            .then(() => ({ status: 'success' }), () => ({ status: 'error' })));
        const results = await Promise.all(operations);
        if (results.some((r) => r.status === 'error')) {
            throw new Error('Failure adding recipients to the email.');
        }
    }
    #extractEmailContent(payload) {
        const parts = payload.parts ?? [];
        const bodyText = parts
            .flatMap((part) => this.#getContentParts({ part }))
            .map((part) => this.#decodeAndNormalize(part))
            .join('\n')
            .trim();
        if (bodyText.length === 0) {
            if (payload.body?.data) {
                const result = this.#decodeAndNormalize(payload);
                if (result.length > 0) {
                    if (payload?.mimeType === 'text/html') {
                        try {
                            const root = HTMLParser.parse(result);
                            const textContent = root.text;
                            if (textContent) {
                                return textContent;
                            }
                        }
                        catch (supress) {
                        }
                    }
                    return result;
                }
            }
            return 'No text available for extraction';
        }
        return bodyText;
    }
    async #updateChildEmailParentIds({ globalMessageId, emailId, }) {
        if (!globalMessageId) {
            return;
        }
        const globalMessageIdWithBrackets = `<${globalMessageId}>`;
        const records = await query((sql) => sql `
  UPDATE emails SET parent_id=${emailId} WHERE emails.parent_id IS NULL AND
  emails.email_id IN (
    SELECT E.email_id 
    FROM emails E
    JOIN document_units D ON D.email_id=E.email_id
    JOIN document_property EP ON D.unit_id=EP.document_id    
    JOIN email_property_type ET ON EP.document_property_type_id=ET.document_property_type_id
    WHERE ET.property_name='In-Reply-To' AND (EP.property_value=${emailId} OR EP.property_value=${globalMessageIdWithBrackets})
  ) RETURNING emails.email_id`);
        if (records.length) {
            log((l) => l.info({
                message: `Updated parent id for ${records.length} emails`,
                emailId,
                childEmailIds: records.map((r) => r.email_id),
            }));
        }
    }
    async #insertEmailRecord({ importedFrom, ...props }) {
        const { emailId, documentId } = await this.#emailRepository.create({
            ...props,
            importedFromId: importedFrom,
        });
        return { emailId, documentId };
    }
}
const managerFactory = (stage, addOps) => new EmailStageManager(stage, addOps);
export default managerFactory;
//# sourceMappingURL=manager-body.js.map