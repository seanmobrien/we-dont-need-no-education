import { log, LoggedError } from '@compliance-theater/logger';
import { TransactionalStateManagerBase } from '../default/transactional-statemanager';
import { Semaphore, SemaphoreManager, } from '@/lib/nextjs-util/semaphore-manager';
import { getQueuedAttachment } from './attachment-download';
import { StagedAttachmentRepository, } from '@/lib/api/email/import/staged-attachment';
import { EmailAttachmentRepository } from '@/lib/api/email/database';
class AttachmentStateManager extends TransactionalStateManagerBase {
    #stagedAttachmentRepository;
    #attachmentRepository = new EmailAttachmentRepository();
    semaphoreManager;
    constructor(stage, options) {
        super(stage, options);
        this.#stagedAttachmentRepository =
            options.stagedAttachmentRepository ?? new StagedAttachmentRepository();
        this.semaphoreManager = new SemaphoreManager(new Semaphore(5));
        log((l) => l.info({
            message: 'AttachmentStateManager initialized with concurrency control',
            source: 'AttachmentStateManager',
            maxConcurrentDownloads: 5,
        }));
    }
    async processAttachmentWithLimit(context, record) {
        const sem = this.semaphoreManager.sem;
        await sem.acquire();
        try {
            return await this.processAttachment(context, record);
        }
        finally {
            sem.release();
        }
    }
    async processAttachment(context, record) {
        return new Promise((resolve) => {
            getQueuedAttachment(`${record.stagedMessageId}:${record.partId}`)
                .then((job) => {
                if (job === null || job === undefined) {
                    resolve({
                        status: 'error',
                        partId: record.partId,
                        error: 'Job not found',
                    });
                }
                else {
                    log((l) => l.info({
                        message: 'Attachment download succeeded',
                        source: 'AttachmentStateManager',
                        partId: job.result.partId,
                        messageId: job.result.stagedMessageId,
                        download: job.result.storageId,
                        textLength: job.result.extractedText?.length ?? 0,
                        job,
                    }));
                    this.#attachmentRepository
                        .create({
                        emailId: context.target.targetId,
                        fileName: record.filename,
                        filePath: job.result.storageId,
                        size: record.size,
                        mimeType: record.mimeType ?? 'application/octet-stream',
                        extractedText: job.result.extractedText ?? null,
                        extractedTextVector: null,
                        policyId: null,
                        summary: null,
                    })
                        .then((finalRecord) => {
                        if (!finalRecord) {
                            resolve({
                                status: 'error',
                                partId: record.partId,
                                error: `Unknown Failure saving final record`,
                            });
                        }
                        else {
                            resolve({ status: 'success', partId: record.partId });
                        }
                    })
                        .catch((error) => {
                        const e = LoggedError.isTurtlesAllTheWayDownBaby(error, {
                            log: true,
                            source: 'email-import',
                            data: { record, partId: record.partId },
                        });
                        resolve({
                            status: 'error',
                            partId: record.partId,
                            error: `Failure saving final record: ${e.message}`,
                        });
                    });
                }
            })
                .catch((err) => {
                const e = LoggedError.isTurtlesAllTheWayDownBaby(err, {
                    log: true,
                    source: 'email-import',
                    data: { record, partId: record.partId },
                });
                resolve({
                    status: 'error',
                    partId: record.partId,
                    error: e.message,
                });
            });
        });
    }
    async run(context) {
        const { target } = context;
        if (typeof target !== 'object') {
            LoggedError.isTurtlesAllTheWayDownBaby(new Error('Invalid target stage'), { log: true });
            return context;
        }
        const attachments = await this.#stagedAttachmentRepository.getForMessage(target.id);
        const state = this.semaphoreManager.sem.getState();
        log((l) => l.info({
            message: 'Starting attachment processing with concurrency control',
            source: 'AttachmentStateManager',
            attachmentCount: attachments.length,
            maxConcurrent: state.maxConcurrency,
        }));
        const allPromises = attachments.map((attachment) => this.processAttachmentWithLimit(context, {
            ...attachment,
            stagedMessageId: attachment.stagedMessageId ?? target.id,
        }));
        const result = await Promise.all(allPromises);
        const finalState = this.semaphoreManager.sem.getState();
        log((l) => l.info({
            message: 'Attachment processing completed',
            source: 'AttachmentStateManager',
            totalAttachments: result.length,
            successCount: result.filter((r) => r.status === 'success').length,
            errorCount: result.filter((r) => r.status === 'error').length,
            finalSemaphoreState: finalState,
        }));
        if (result.some((r) => r.status === 'error')) {
            log((l) => l.error({
                message: 'Attachment processing failed',
                source: 'AttachmentStateManager',
                result,
            }));
            throw new Error('Attachment processing failed');
        }
        return context;
    }
    getProcessingStatus() {
        const state = this.semaphoreManager.sem.getState();
        return {
            activeDownloads: state.activeOperations,
            queuedDownloads: state.waitingCount,
            maxConcurrent: state.maxConcurrency,
            availableSlots: state.availableSlots,
        };
    }
}
const attachmentStateManagerFactory = (stage, options) => new AttachmentStateManager(stage, options);
export default attachmentStateManagerFactory;
//# sourceMappingURL=manager-attachments.js.map