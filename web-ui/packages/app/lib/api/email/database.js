import { ValidationError } from '@/lib/react-util/errors';
import { newUuid } from '@compliance-theater/typescript';
import { BaseObjectRepository } from '../_baseObjectRepository';
import { query } from '@compliance-theater/database/driver';
import { AbstractObjectRepository } from '../abstractObjectRepository';
import { db } from '@compliance-theater/database/driver';
const mapRecordToSummary = (record) => ({
    emailId: record.email_id,
    subject: record.subject,
    sentOn: record.sent_timestamp,
    senderId: Number(record.sender_id),
    globalMessageId: record.global_message_id ?? undefined,
    parentEmailId: record.parent_email_id,
    importedFromId: record.imported_from_id
        ? record.imported_from_id
        : null,
    threadId: record.thread_id ? record.thread_id : undefined,
});
const mapRecordToObject = (record) => ({
    ...mapRecordToSummary(record),
    senderId: Number(record.sender_id),
    emailContents: record.email_contents,
});
export class EmailRepository extends BaseObjectRepository {
    constructor() {
        super({
            tableName: 'emails',
            idField: 'emailId',
            objectMap: mapRecordToObject,
            summaryMap: mapRecordToSummary,
        });
    }
    async create(props) {
        const ret = await super.create(props);
        if (ret && ret.emailId) {
            const importDate = props.sentOn ? new Date(props.sentOn) : new Date();
            const res = await db((sql) => sql `INSERT INTO document_units (email_id, content, created_on, document_type)
        VALUES (${ret.emailId}, ${props.emailContents}, ${importDate.toISOString()}, 'email')
        returning unit_id`);
            if (res.length < 1) {
                throw new Error('Failed to create document unit');
            }
            ret.documentId = res[0].unit_id;
        }
        return ret;
    }
    validate(method, obj) {
        const asModel = obj;
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
                if (!asModel.emailId ||
                    (!asModel.senderId &&
                        !asModel.subject &&
                        !asModel.globalMessageId &&
                        !asModel.importedFromId &&
                        !asModel.emailContents &&
                        !asModel.sentOn)) {
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
    getListQueryProperties() {
        return [
            `SELECT * FROM emails ORDER BY sent_timestamp`,
            [],
            `SELECT COUNT(*) as records FROM emails`,
        ];
    }
    getQueryProperties(emailId) {
        return ['SELECT * FROM emails WHERE email_id = $1', [emailId]];
    }
    getCreateQueryProperties(obj) {
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
                !obj.sentOn
                    ? null
                    : typeof obj.sentOn === 'string'
                        ? obj.sentOn
                        : obj.sentOn.toISOString(),
            ],
        ];
    }
    getUpdateQueryProperties(obj) {
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
    async getIdForUniqueMessageId(uniqueId) {
        if (!uniqueId)
            return null;
        try {
            const result = await query((sql) => sql `select email_id from emails where global_message_id = ${uniqueId}`);
            return result.length === 1 ? result[0].email_id : null;
        }
        catch (error) {
            AbstractObjectRepository.logDatabaseError(this.source, error);
        }
        return null;
    }
}
const mapAttachmentRecordToSummary = (record) => ({
    attachmentId: record.attachment_id,
    emailId: record.email_id,
    fileName: record.file_name,
    filePath: record.file_path,
    size: record.size,
    mimeType: record.mime_type,
});
const mapAttachmentRecordToObject = (record) => ({
    ...mapAttachmentRecordToSummary(record),
    extractedText: record.extracted_text,
    extractedTextVector: record.extracted_text_vector,
    policyId: record.policy_id,
    summary: record.summary,
});
export class EmailAttachmentRepository extends BaseObjectRepository {
    constructor() {
        super({
            tableName: 'email_attachments',
            idField: 'attachmentId',
            objectMap: mapAttachmentRecordToObject,
            summaryMap: mapAttachmentRecordToSummary,
        });
    }
    validate(method, obj) {
        const asModel = obj;
        switch (method) {
            case 'create':
                if (!asModel.fileName || !asModel.filePath || !asModel.emailId) {
                    throw new ValidationError({
                        field: 'fileName||filePath||emailId',
                        source: 'EmailAttachmentRepository',
                    });
                }
                break;
            case 'update':
                if (!asModel.attachmentId ||
                    (!asModel.fileName &&
                        !asModel.filePath &&
                        !asModel.emailId &&
                        !asModel.extractedText &&
                        !asModel.extractedTextVector &&
                        !asModel.size &&
                        !asModel.mimeType &&
                        !asModel.policyId &&
                        !asModel.summary)) {
                    throw new ValidationError({
                        field: 'attachmentId||At least one field is required for update',
                        source: 'EmailAttachmentRepository',
                    });
                }
                break;
            default:
                break;
        }
    }
    getQueryProperties(attachmentId) {
        return [
            'SELECT * FROM email_attachments WHERE attachment_id = $1',
            [attachmentId],
        ];
    }
    getCreateQueryProperties(obj) {
        return [
            'INSERT INTO email_attachments (file_name, file_path, extracted_text, extracted_text_tsv, policy_id, summary, email_id, size, mime_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING email_id',
            [
                obj.fileName,
                obj.filePath,
                obj.extractedText,
                obj.extractedTextVector,
                obj.policyId,
                obj.summary,
                obj.emailId,
                obj.size,
                obj.mimeType,
            ],
        ];
    }
    getUpdateQueryProperties(obj) {
        return [
            {
                file_name: obj.fileName,
                file_path: obj.filePath,
                extracted_text: obj.extractedText,
                extracted_text_tsv: obj.extractedTextVector,
                policy_id: obj.policyId,
                summary: obj.summary,
                email_id: obj.emailId,
                size: obj.size,
                mime_type: obj.mimeType,
            },
        ];
    }
}
//# sourceMappingURL=database.js.map