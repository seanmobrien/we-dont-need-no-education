import { BaseDrizzleRepository } from '../_baseDrizzleRepository';
import { emailAttachments } from '@compliance-theater/database/schema';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
const mapRecordToEmailAttachment = (record) => ({
    attachmentId: record.attachmentId,
    fileName: record.fileName,
    filePath: record.filePath,
    extractedText: record.extractedText || null,
    extractedTextTsv: null,
    policyId: record.policyId || null,
    summary: record.summary || null,
    emailId: record.emailId,
    mimeType: record.mimeType,
    size: record.size,
});
const mapRecordToEmailAttachmentSummary = (record) => ({
    attachmentId: record.attachmentId,
    fileName: record.fileName,
    filePath: record.filePath,
    policyId: record.policyId || null,
    emailId: record.emailId,
    mimeType: record.mimeType,
    size: record.size,
});
export class EmailAttachmentDrizzleRepository extends BaseDrizzleRepository {
    constructor() {
        super({
            table: emailAttachments,
            recordMapper: mapRecordToEmailAttachment,
            summaryMapper: mapRecordToEmailAttachmentSummary,
        });
    }
    validate(method, obj) {
        super.validate(method, obj);
        const asModel = obj;
        switch (method) {
            case 'create':
                if (!asModel.fileName || !asModel.filePath || !asModel.emailId) {
                    throw new ValidationError({
                        field: 'fileName, filePath, or emailId',
                        source: 'EmailAttachmentDrizzleRepository',
                    });
                }
                if (!asModel.mimeType || typeof asModel.size !== 'number') {
                    throw new ValidationError({
                        field: 'mimeType or size',
                        source: 'EmailAttachmentDrizzleRepository',
                    });
                }
                break;
            case 'update':
                if (!asModel.attachmentId) {
                    throw new ValidationError({
                        field: 'attachmentId',
                        source: 'EmailAttachmentDrizzleRepository',
                    });
                }
                break;
            case 'get':
            case 'delete':
                if (!obj[this.idField]) {
                    throw new ValidationError({
                        field: String(this.idField),
                        source: 'EmailAttachmentDrizzleRepository',
                    });
                }
                break;
        }
    }
    prepareInsertData(model) {
        return {
            fileName: model.fileName,
            filePath: model.filePath,
            extractedText: model.extractedText || null,
            policyId: model.policyId || null,
            summary: model.summary || null,
            emailId: model.emailId,
            mimeType: model.mimeType,
            size: model.size,
        };
    }
    prepareUpdateData(model) {
        const { attachmentId, emailId, extractedTextTsv, ...updateFields } = model;
        const updateData = {};
        Object.entries(updateFields).forEach(([key, value]) => {
            if (value !== undefined) {
                updateData[key] = value;
            }
        });
        return updateData;
    }
}
//# sourceMappingURL=drizzle-repository.js.map