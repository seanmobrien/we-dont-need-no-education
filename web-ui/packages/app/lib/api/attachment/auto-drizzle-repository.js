import { BaseDrizzleRepository } from '../_baseDrizzleRepository';
import { emailAttachments } from '@compliance-theater/database/schema';
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
export class EmailAttachmentAutoDrizzleRepository extends BaseDrizzleRepository {
    constructor() {
        super({
            table: emailAttachments,
            recordMapper: mapRecordToEmailAttachment,
            summaryMapper: mapRecordToEmailAttachmentSummary,
            tableName: 'email_attachments',
        });
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
        const updateData = {};
        if (model.fileName !== undefined)
            updateData.fileName = model.fileName;
        if (model.filePath !== undefined)
            updateData.filePath = model.filePath;
        if (model.extractedText !== undefined)
            updateData.extractedText = model.extractedText;
        if (model.policyId !== undefined)
            updateData.policyId = model.policyId;
        if (model.summary !== undefined)
            updateData.summary = model.summary;
        if (model.mimeType !== undefined)
            updateData.mimeType = model.mimeType;
        if (model.size !== undefined)
            updateData.size = model.size;
        return updateData;
    }
}
//# sourceMappingURL=auto-drizzle-repository.js.map