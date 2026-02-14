import { BaseDrizzleRepository } from '../_baseDrizzleRepository';
import { emails } from '@compliance-theater/database/schema';
import { drizDbWithInit } from '@compliance-theater/database/orm';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { CaseFileScope, checkCaseFileAccess, } from '@/lib/auth/resources/case-file';
import { checkCaseFileAuthorization } from '@/lib/auth/resources/case-file/case-file-middleware';
import { AccessDeniedError } from '@/lib/react-util/errors/access-denied-error';
import { unwrapPromise } from '@compliance-theater/typescript';
const mapRecordToEmailDomain = (record) => ({
    emailId: record.emailId,
    userId: record.userId,
    senderId: record.senderId,
    subject: record.subject,
    emailContents: record.emailContents,
    sentTimestamp: record.sentTimestamp,
    threadId: record.threadId,
    parentId: record.parentId,
    importedFromId: record.importedFromId,
    globalMessageId: record.globalMessageId,
});
const mapRecordToEmailDomainSummary = (record) => ({
    emailId: record.emailId,
    userId: record.userId,
    senderId: record.senderId,
    subject: record.subject,
    sentTimestamp: record.sentTimestamp,
    threadId: record.threadId,
    parentId: record.parentId,
    importedFromId: record.importedFromId,
    globalMessageId: record.globalMessageId,
});
export class EmailDrizzleRepository extends BaseDrizzleRepository {
    constructor() {
        super({
            table: emails,
            recordMapper: mapRecordToEmailDomain,
            summaryMapper: mapRecordToEmailDomainSummary,
            tableName: 'emails',
            idField: 'emailId',
        });
    }
    async validate(method, obj) {
        await unwrapPromise(super.validate(method, obj));
        const email = obj;
        switch (method) {
            case 'create':
                if (!email.senderId || !email.subject || !email.emailContents) {
                    throw new ValidationError({
                        field: 'senderId||subject||emailContents',
                        source: 'EmailDrizzleRepository::create',
                    });
                }
                break;
            case 'delete':
                if (!email.emailId) {
                    throw new ValidationError({
                        field: 'emailId',
                        source: 'EmailDrizzleRepository::delete',
                    });
                }
                if (!(await checkCaseFileAuthorization(undefined, email.emailId, {
                    requiredScope: CaseFileScope.WRITE,
                }))) {
                    throw new AccessDeniedError('Access denied');
                }
                break;
            case 'update':
                if (!email.emailId) {
                    throw new ValidationError({
                        field: 'emailId',
                        source: 'EmailDrizzleRepository::update',
                    });
                }
                if (!(await checkCaseFileAuthorization(undefined, email.emailId, {
                    requiredScope: CaseFileScope.WRITE,
                }))) {
                    throw new AccessDeniedError('Access denied');
                }
                const updateFields = [
                    'senderId',
                    'subject',
                    'emailContents',
                    'sentTimestamp',
                    'threadId',
                    'parentId',
                    'importedFromId',
                    'globalMessageId',
                ];
                if (!updateFields.some((field) => email[field] !== undefined)) {
                    throw new ValidationError({
                        field: 'At least one field is required for update',
                        source: 'EmailDrizzleRepository::update',
                    });
                }
                break;
            case 'get':
                if (!email.emailId) {
                    throw new ValidationError({
                        field: 'emailId',
                        source: 'EmailDrizzleRepository::get',
                    });
                }
                if (!(await checkCaseFileAuthorization(undefined, email.emailId, {
                    requiredScope: CaseFileScope.READ,
                }))) {
                    throw new AccessDeniedError('Access denied');
                }
                break;
            default:
                break;
        }
    }
    async prepareInsertData(model) {
        if (!model.userId) {
            const session = await auth();
            const checkUserId = session?.user?.id;
            if (!checkUserId) {
                throw new Error('User ID is required');
            }
            model.userId = parseInt(checkUserId, 10);
        }
        return {
            sender_id: model.senderId,
            user_id: model.userId,
            subject: model.subject,
            email_contents: model.emailContents,
            sent_timestamp: model.sentTimestamp || new Date(),
            thread_id: model.threadId || null,
            parent_id: model.parentId || null,
            imported_from_id: model.importedFromId || null,
            global_message_id: model.globalMessageId || null,
        };
    }
    prepareUpdateData(model) {
        const updateData = {};
        if (model.senderId !== undefined)
            updateData.sender_id = model.senderId;
        if (model.subject !== undefined)
            updateData.subject = model.subject;
        if (model.emailContents !== undefined)
            updateData.email_contents = model.emailContents;
        if (model.sentTimestamp !== undefined)
            updateData.sent_timestamp = model.sentTimestamp;
        if (model.threadId !== undefined)
            updateData.thread_id = model.threadId;
        if (model.parentId !== undefined)
            updateData.parent_id = model.parentId;
        if (model.importedFromId !== undefined)
            updateData.imported_from_id = model.importedFromId;
        if (model.globalMessageId !== undefined)
            updateData.global_message_id = model.globalMessageId;
        return updateData;
    }
    async findByGlobalMessageId(globalMessageId) {
        try {
            const record = await drizDbWithInit((db) => db
                .select()
                .from(this.config.table)
                .where(eq(emails.globalMessageId, globalMessageId))
                .limit(1)
                .execute()
                .then((x) => x.at(0)));
            if (record) {
                const hasAccess = await checkCaseFileAccess(undefined, record.userId, CaseFileScope.READ);
                if (hasAccess) {
                    return this.config.recordMapper(record);
                }
            }
            return null;
        }
        catch (error) {
            this.logDatabaseError('findByGlobalMessageId', error);
            throw error;
        }
    }
}
//# sourceMappingURL=email-drizzle-repository.js.map