import {
  AdditionalStageOptions,
  ImportStageManagerFactory,
  StageProcessorContext,
} from '../types';
import { ImportStage } from '@/data-models/api/import/email-message';
import { log } from '@/lib/logger';
import { gmail_v1 } from 'googleapis';
import { mapContacts } from './utilities';
import { ContactRepository } from '@/lib/api/contacts/database';
import { EmailRepository } from '@/lib/api/email/database';
import { TransactionalStateManagerBase } from '../default/transactional-statemanager';
import { ThreadRepository } from '@/lib/api/thread/database';
import { DataIntegrityError } from '@/lib/react-util/errors/data-integrity-error';
import { ParsedHeaderMap } from './parsedHeaderMap';
import { query } from '@/lib/neondb';

class EmailStageManager extends TransactionalStateManagerBase {
  constructor(stage: ImportStage, options: AdditionalStageOptions) {
    super(stage, options);
    this.#threadRepository =
      options?.threadRepository ?? new ThreadRepository();
    this.#emailRepository = options?.emailRepository ?? new EmailRepository();
    this.#contactRepository =
      options?.contactRepository ?? new ContactRepository();
  }

  readonly #emailRepository: EmailRepository;
  readonly #contactRepository: ContactRepository;
  readonly #threadRepository: ThreadRepository;

  async run(context: StageProcessorContext): Promise<StageProcessorContext> {
    const { target, currentStage } = context;
    if (typeof target !== 'object') {
      throw new Error(`Expected source message: ${currentStage}`);
    }
    if (!target.raw?.payload) {
      throw new Error(`No valid payload found in the message: ${currentStage}`);
    }
    const emailContents = this.#extractEmailContent(target.raw.payload.parts);
    if (!emailContents) {
      throw new Error(
        `No valid email content found in the message: ${currentStage}`
      );
    }
    const parsedHeaders = ParsedHeaderMap.fromHeaders(
      target.raw.payload.headers
    );
    const rawSender = mapContacts(parsedHeaders, ['From']);
    const sender = Array.isArray(rawSender) ? rawSender[0] : rawSender;
    if (!sender || !sender.email) {
      throw new Error(`No valid sender found in the message: ${currentStage}`);
    }
    const savedSender = await this.#contactRepository.getContactsByEmails(
      sender.email
    );
    if (savedSender === null || !savedSender.length) {
      throw new Error(`Sender ID not found for the email: ${sender.email}`);
    }
    const subject = parsedHeaders.getFirstValue('Subject') ?? 'No Subject';
    let globalMessageId = parsedHeaders.getFirstValue('Message-ID') ?? null;
    if (globalMessageId) {
      globalMessageId = globalMessageId.replace(/^<|>$/g, '');
    }
    const dateInHeader = parsedHeaders.getFirstValue('Date') ?? null;

    const threadId = await this.getThreadIdFromDatabase(
      target.raw.threadId,
      subject
    );
    const parentEmailId = await this.getParentIdFromDatabase(globalMessageId);

    const emailData = {
      senderId: savedSender[0].contactId,
      threadId,
      parentEmailId,
      subject,
      importedFrom: target.raw.id ?? null,
      globalMessageId,
      emailContents,
      sentOn: dateInHeader ? new Date(dateInHeader) : new Date(0),
    };
    const emailId = await this.#insertEmailRecord(emailData);
    log((l) => l.info(`Inserted email record with ID: ${emailId}`));
    if (context.target) {
      context.target.targetId = emailId;
    }
    const globalMessageIdWithBrackets = `<${globalMessageId}>`;
    const records = await query(
      (sql) => sql`
      UPDATE emails SET parent_id=${emailId} WHERE emails.parent_id IS NULL AND
      emails.email_id IN (
        SELECT E.email_id 
        FROM emails E
        JOIN email_property EP ON EP.email_id=E.email_id
        JOIN email_property_type ET ON EP.email_property_type_id=ET.email_property_type_id
        WHERE ET.property_name='In-Reply-To' AND (EP.property_value=${emailId} OR EP.property_value=${globalMessageIdWithBrackets})
      ) RETURNING emails.email_id`
    );
    if (records.length) {
      log((l) =>
        l.info({
          message: `Updated parent id for ${records.length} emails`,
          parentEmailId,
          childEmailIds: records.map((r) => r.email_id),
        })
      );
    }
    log((l) =>
      l.info(
        `Processed email with ID: ${emailId}, thread ID: ${threadId}, subject: ${subject}`
      )
    );

    return context;
  }

  async getThreadIdFromDatabase(
    threadId?: string | null,
    subject?: string
  ): Promise<number | null> {
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
  async getParentIdFromDatabase(
    globalId: string | null
  ): Promise<string | null> {
    if (!globalId) {
      return Promise.resolve(null);
    }

    return Promise.resolve(null);
  }

  #getContentParts({
    part,
    expectedMimeType = 'text/plain',
  }: {
    part: gmail_v1.Schema$MessagePart;
    expectedMimeType?: string;
  }): Array<gmail_v1.Schema$MessagePart> {
    const items = [];
    if (
      part.mimeType === expectedMimeType ||
      part.headers?.findIndex(
        (h) =>
          h.name === 'Content-Type' && h.value?.startsWith(expectedMimeType)
      ) !== -1
    ) {
      if (part.body && part.body.data) {
        items.push(part);
      }
    }
    return [
      ...items,
      ...(part.parts ?? []).flatMap((p) =>
        this.#getContentParts({ part: p, expectedMimeType })
      ),
    ];
  }
  #decodeAndNormalize(part: gmail_v1.Schema$MessagePart): string {
    let foundReplyHeader = false; // Flag to stop processing when we hit a reply header
    // Decode
    return (
      Buffer.from(part!.body!.data!, 'base64')
        .toString('utf-8')
        // Strip out quoted text from previous emails
        .split('\n')
        .filter((line) => {
          // Stop processing once a reply header is found
          if (foundReplyHeader) {
            return false;
          }
          if (
            /^On\s(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s*(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2},?\s\d{4}\s(?:at\s\d{1,2}:\d{2}(?:\s?[APap][Mm])?)?\s.+?\s<[^>]+>\swrote:\s*$/i.test(
              line
            )
          ) {
            foundReplyHeader = true;
            return false; // Stop filtering; truncate everything below
          }
          return !line.startsWith('>'); // Remove quoted replies
        })
        .join('\n')
        // Normalize line breaks
        .trim()
        .replace(/([\r\n]{1,2}\s*)(?![\r\n])/g, ' ')
        .replace(/[\r\n]{2,}/g, '\n')
        .trim()
    );
  }

  #extractEmailContent(
    parts: gmail_v1.Schema$MessagePart[] | undefined
  ): string {
    const bodyText = (parts ?? [])
      .flatMap((part) => this.#getContentParts({ part }))
      .map((part) => this.#decodeAndNormalize(part))
      .join('\n')
      .trim();
    if (bodyText.length === 0) {
      throw new Error('Failure extracting and normalizing email content');
    }
    return bodyText;
  }

  async #insertEmailRecord({
    importedFrom,
    ...props
  }: {
    senderId: number;
    threadId: number | null;
    parentEmailId: string | null;
    sentOn: Date | string;
    importedFrom: string | null;
    globalMessageId: string | null;
    subject: string;
    emailContents: string;
  }) {
    const { emailId } = await this.#emailRepository.create({
      ...props,
      importedFromId: importedFrom,
    });

    // TODO: Use globalMessageId to

    return emailId;
  }
}

const managerFactory: ImportStageManagerFactory = (
  stage: ImportStage,
  addOps: AdditionalStageOptions
) => new EmailStageManager(stage, addOps);

export default managerFactory;
