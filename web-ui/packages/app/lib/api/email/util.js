import { query } from '@compliance-theater/database/driver';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
export const mapRecordToSummary = (record) => ({
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
    count_attachments: record.count_attachments === undefined
        ? undefined
        : Number(record.count_attachments),
    count_kpi: record.count_kpi === undefined ? undefined : Number(record.count_kpi),
    count_notes: record.count_notes === undefined ? undefined : Number(record.count_notes),
    count_cta: record.count_cta === undefined ? undefined : Number(record.count_cta),
    count_responsive_actions: record.count_responsive_actions === undefined
        ? undefined
        : Number(record.count_responsive_actions),
    recipients: (record.recipients || []).map((r) => ({
        contactId: r.recipient_id,
        name: r.recipient_name,
        email: r.recipient_email,
    })),
});
export const mapRecordToObject = (record) => ({
    ...mapRecordToSummary(record),
    body: record.email_contents,
});
export const insertRecipients = async (emailId, recipients, clear = true, allowEmpty = false) => {
    if (!allowEmpty && !recipients?.length) {
        throw new ValidationError({
            field: 'recipients',
            value: !recipients ? '[null]' : '[empty]',
            reason: 'At least one recipient is required',
            source: 'insertRecipients',
        });
    }
    if (clear) {
        await query((sql) => sql `DELETE FROM email_recipients WHERE email_id = ${emailId}`);
    }
    if (!recipients.length) {
        return 0;
    }
    const insertSql = `INSERT INTO email_recipients (email_id, recipient_id)
    VALUES ${recipients
        .map((r) => `(${emailId}, ${r.contactId})`)
        .join(', ')}
    RETURNING email_id, recipient_id
  `.toString();
    const res = await query((sql) => sql(insertSql));
    if (res.length !== recipients.length) {
        throw new Error('Failed to insert all recipients');
    }
    return res.length;
};
export const mapRecordToThreadSummary = (record) => ({
    threadId: record.thread_id,
    subject: record.subject,
    createdOn: record.created_at,
});
//# sourceMappingURL=util.js.map