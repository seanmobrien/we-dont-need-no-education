/**
 * @module email-route-util
 *
 * This module provides utility functions shared by all email API routes.
 *
 * Functions:
 * - mapRecordToSummary: Maps a record to a summary object containing email details.
 * - mapRecordToObject: Maps a record to an object containing email details and body content.
 */

import type { ContactSummary } from '@/data-models';
import { query } from '@/lib/neondb';
import { ValidationError } from '@/lib/react-util';

/**
 * Maps a record to a summary object containing email details.
 *
 * @param {Record<string, unknown>} record - The record to map.
 * @returns {object} The mapped summary object.
 */
export const mapRecordToSummary = (record: Record<string, unknown>) => ({
  emailId: record.email_id,
  subject: record.subject,
  sentOn: record.sent_timestamp,
  threadId: record.thread_id,
  parentEmailId: record.parent_email_id,
  sender: {
    contactId: record.senderid,
    name: record.sendername,
    email: record.senderemail,
  },
  count_attachments:
    record.count_attachments === undefined
      ? undefined
      : Number(record.count_attachments),
  count_kpi:
    record.count_kpi === undefined ? undefined : Number(record.count_kpi),
  count_notes:
    record.count_notes === undefined ? undefined : Number(record.count_notes),
  count_cta:
    record.count_cta === undefined ? undefined : Number(record.count_cta),
  count_responsive_actions:
    record.count_responsive_actions === undefined
      ? undefined
      : Number(record.count_responsive_actions),
  recipients: ((record.recipients as Array<Record<string, unknown>>) || []).map(
    (r: Record<string, unknown>) => ({
      contactId: r.recipient_id,
      name: r.recipient_name,
      email: r.recipient_email,
    }),
  ),
});

/**
 * Maps a record to an object containing email details and body content.
 *
 * @param {Record<string, unknown>} record - The record to map.
 * @returns {object} The mapped object with email details and body content.
 */
export const mapRecordToObject = (record: Record<string, unknown>) => ({
  ...mapRecordToSummary(record),
  body: record.email_contents,
});

export const insertRecipients = async (
  emailId: number,
  recipients: ContactSummary[],
  clear: boolean = true,
  allowEmpty: boolean = false,
) => {
  if (!allowEmpty && !recipients?.length) {
    throw new ValidationError({
      field: 'recipients',
      value: !recipients ? '[null]' : '[empty]',
      reason: 'At least one recipient is required',
      source: 'insertRecipients',
    });
  }

  // Delete existing recipients if clear is true
  if (clear) {
    await query(
      (sql) => sql`DELETE FROM email_recipients WHERE email_id = ${emailId}`,
    );
  }
  if (!recipients.length) {
    return 0;
  }
  // Build bulk insert statement
  const insertSql = `INSERT INTO email_recipients (email_id, recipient_id)
    VALUES ${recipients
      .map((r: ContactSummary) => `(${emailId}, ${r.contactId})`)
      .join(', ')}
    RETURNING email_id, recipient_id
  `.toString();
  const res = await query((sql) => sql<false, false>(insertSql));
  if (res.length !== recipients.length) {
    throw new Error('Failed to insert all recipients');
  }
  return res.length;
};

/**
 * Maps a generic record object to a thread summary object.
 *
 * @param record - The record containing thread information, expected to have
 *   `thread_id`, `subject`, and `created_at` properties.
 * @returns An object with `threadId`, `subject`, and `createdOn` properties
 *   mapped from the input record.
 */
export const mapRecordToThreadSummary = (record: Record<string, unknown>) => ({
  threadId: record.thread_id,
  subject: record.subject,
  createdOn: record.created_at,
});
