import { ContactSummary } from './contact';

/**
 * Represents a summary of an email message.
 *
 * @export
 * @type {EmailMessageSummary}
 * @public
 *
 * @property {string} emailId - The unique identifier of the email.
 * @property {ContactSummary} sender - The contact information of the sender.
 * @property {string} subject - The subject of the email.
 * @property {Date | string} sentOn - The date and time when the email was sent.
 * @property {number | null} [threadId] - The identifier of the email thread, if applicable.
 * @property {string | null} [parentEmailId] - The identifier of the parent email, if applicable.
 * @property {string | null} [importedFromId] - The identifier from which the email was imported, if applicable.
 * @property {string | null} [globalMessageId] - The global identifier of the email message, if applicable.
 * @property {ContactSummary[]} recipients - The list of recipients of the email.
 */
export type EmailMessageSummary = {
  emailId: string;
  sender: ContactSummary;
  subject: string;
  sentOn: Date | string;
  threadId?: number | null;
  parentEmailId?: string | null;
  importedFromId?: string | null;
  globalMessageId?: string | null;
  recipients: ContactSummary[];
};

/**
 * Represents an email message.
 *
 * @export
 * @type {EmailMessage}
 * @public
 *
 * @extends {EmailMessageSummary}
 *
 * @property {string} body - The body content of the email message.
 */
export type EmailMessage = EmailMessageSummary & {
  body: string;
};

/**
 * Represents the statistics of email messages.
 *
 * @type {EmailMessageStats}
 * @property {number} total - The total number of email messages.
 * @property {Date} lastUpdated - The date when the statistics were last updated.
 */
export type EmailMessageStats = {
  total: number;
  lastUpdated: Date;
};

/**
 * Represents a summary of an email message attachment.
 *
 * @type {EmailMessageAttachmentSummary}
 *
 * @property {number} attachmentId - The unique identifier for the attachment.
 * @property {string} emailId - The unique identifier for the email to which the attachment belongs.
 * @property {string} fileName - The name of the attachment file.
 * @property {string} filePath - The path to the attachment file.
 * @property {number} size - The size of the attachment file in bytes.
 * @property {string} mimeType - The MIME type of the attachment file.
 */
export type EmailMessageAttachmentSummary = {
  attachmentId: number;
  emailId: string;
  fileName: string;
  filePath: string;
  size: number;
  mimeType: string;
};

/**
 * Represents an email message attachment with additional details.
 *
 * @type {EmailMessageAttachment}
 *
 * @property {string | null} extractedText - The text extracted from the attachment, if any.
 * @property {string | null} extractedTextVector - The vector representation of the extracted text, if any.
 * @property {number | null} policyId - The policy identifier associated with the attachment, if any.
 * @property {string | null} summary - A summary of the attachment content, if any.
 */
export type EmailMessageAttachment = EmailMessageAttachmentSummary & {
  extractedText: string | null;
  extractedTextVector: string | null;
  policyId: number | null;
  summary: string | null;
};
