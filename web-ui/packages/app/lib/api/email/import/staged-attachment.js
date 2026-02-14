import { BaseObjectRepository } from '@/lib/api/_baseObjectRepository';
import { buildOrderBy } from '@/lib/components/mui/data-grid/server';
import { query } from '@compliance-theater/database/driver';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
const mapRecordToObject = (record) => ({
    stagedMessageId: record.staging_message_id,
    partId: record.partId,
    filename: record.filename,
    mimeType: record.mimeType,
    storageId: record.storageId,
    imported: record.imported,
    size: record.size,
    fileOid: record.file_oid,
    attachmentId: record.attachmentId,
    extractedText: record.extractedText,
});
export class StagedAttachmentRepository extends BaseObjectRepository {
    constructor() {
        super({
            tableName: 'staging_attachment',
            idField: 'partId',
            objectMap: mapRecordToObject,
            summaryMap: mapRecordToObject,
        });
    }
    async create(props) {
        return super.create(props);
    }
    async getForMessage(stagedMessageId) {
        const runQuery = (x, y, z, sort) => query((sql) => sql `
      SELECT * FROM staging_attachment WHERE staging_message_id = ${stagedMessageId} ${buildOrderBy({ source: sort, sql })}`);
        const runQueryCount = () => query((sql) => sql `SELECT COUNT(*) as records FROM staging_attachment WHERE staging_message_id = ${stagedMessageId}`);
        return this.innerList(runQuery, runQueryCount).then((x) => x.results);
    }
    validate(method, obj) {
        if (!obj) {
            throw new ValidationError('No object provided');
        }
        switch (method) {
            case 'create':
                break;
            case 'update':
                break;
            default:
                break;
        }
    }
    getListQueryProperties() {
        return [
            `SELECT * FROM staging_attachment ORDER BY staging_message_id, partId`,
            [],
            `SELECT COUNT(*) as records FROM staging_attachment`,
        ];
    }
    getQueryProperties(recordId) {
        return ['SELECT * FROM staging_attachment WHERE partId = $1', [recordId]];
    }
    getCreateQueryProperties({ stagedMessageId, partId, filename, mimeType, size, attachmentId, }) {
        return [
            `INSERT INTO staging_attachment (staging_message_id, "partId", filename, "mimeType", size, "attachmentId") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [stagedMessageId, partId, filename, mimeType, size, attachmentId],
        ];
    }
    getUpdateQueryProperties(obj) {
        return [
            {
                staged_message_id: obj.stagedMessageId,
                partId: obj.partId,
                filename: obj.filename,
                mimeType: obj.mimeType,
                size: obj.size,
                file_oid: obj.fileOid,
                attachmentId: obj.attachmentId,
            },
        ];
    }
}
//# sourceMappingURL=staged-attachment.js.map