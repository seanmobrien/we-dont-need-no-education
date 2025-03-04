import { EmailMessageSummary } from './email-message';

/**
 * Represents a summary of a thread.
 *
 * @property {number} threadId - The unique identifier of the thread.
 * @property {string} subject - The subject or title of the thread.
 * @property {Date} created - The date and time when the thread was created.
 */
export type ThreadSummary = {
  threadId: number;
  subject: string;
  createdOn: Date;
  externalId: string;
};

/**
 * Represents a detailed thread which includes a summary, total count, and a list of email message summaries.
 *
 * @extends ThreadSummary
 *
 * @property {number} total - The total count of items in the thread.
 * @property {EmailMessageSummary[]} emails - An array of email message summaries associated with the thread.
 */
export type Thread = ThreadSummary & {
  total: number;
  emails: EmailMessageSummary[];
};
