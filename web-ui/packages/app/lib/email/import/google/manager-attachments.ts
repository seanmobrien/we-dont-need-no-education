import { ImportStage } from '@/data-models/api/import/email-message';
import { AdditionalStageOptions, StageProcessorContext } from '../types';
import { log } from '@compliance-theater/logger';
import { TransactionalStateManagerBase } from '../default/transactional-statemanager';
import {
  Semaphore,
  SemaphoreManager,
} from '@/lib/nextjs-util/semaphore-manager';

import { getQueuedAttachment } from './attachment-download';
import {
  StagedAttachment,
  StagedAttachmentRepository,
} from '@/lib/api/email/import/staged-attachment';
import { EmailAttachmentRepository } from '@/lib/api/email/database';
import { LoggedError } from '@/lib/react-util/errors/logged-error';

type AttachmentImportResult =
  | {
      status: 'success';
      partId: number;
    }
  | {
      status: 'error';
      partId: number;
      error: string;
    };

class AttachmentStateManager extends TransactionalStateManagerBase {
  readonly #stagedAttachmentRepository: StagedAttachmentRepository;
  readonly #attachmentRepository = new EmailAttachmentRepository();
  private readonly semaphoreManager: SemaphoreManager;

  constructor(stage: ImportStage, options: AdditionalStageOptions) {
    super(stage, options);
    this.#stagedAttachmentRepository =
      options.stagedAttachmentRepository ?? new StagedAttachmentRepository();

    // Initialize semaphore with 5 concurrent downloads (conservative limit)
    // This prevents resource exhaustion with large emails containing many attachments
    this.semaphoreManager = new SemaphoreManager(new Semaphore(5));

    log((l) =>
      l.info({
        message: 'AttachmentStateManager initialized with concurrency control',
        source: 'AttachmentStateManager',
        maxConcurrentDownloads: 5,
      })
    );
  }
  /**
   * Process attachment with semaphore-controlled concurrency.
   * Wraps processAttachment with acquire/release to limit concurrent downloads.
   */
  private async processAttachmentWithLimit(
    context: StageProcessorContext,
    record: StagedAttachment
  ): Promise<AttachmentImportResult> {
    const sem = this.semaphoreManager.sem;
    await sem.acquire();

    try {
      return await this.processAttachment(context, record);
    } finally {
      sem.release();
    }
  }

  async processAttachment(
    context: StageProcessorContext,
    record: StagedAttachment
  ): Promise<AttachmentImportResult> {
    return new Promise<AttachmentImportResult>((resolve) => {
      getQueuedAttachment(`${record.stagedMessageId}:${record.partId}`)
        .then((job) => {
          if (job === null || job === undefined) {
            resolve({
              status: 'error',
              partId: record.partId,
              error: 'Job not found',
            });
          } else {
            log((l) =>
              l.info({
                message: 'Attachment download succeeded',
                source: 'AttachmentStateManager',
                partId: job.result.partId,
                messageId: job.result.stagedMessageId,
                download: job.result.storageId,
                textLength: job.result.extractedText?.length ?? 0,
                job,
              })
            );
            this.#attachmentRepository
              .create({
                emailId: context.target!.targetId!,
                fileName: record.filename,
                filePath: job.result.storageId!,
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
                } else {
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

  async run(context: StageProcessorContext): Promise<StageProcessorContext> {
    const { target } = context;
    if (typeof target !== 'object') {
      LoggedError.isTurtlesAllTheWayDownBaby(
        new Error('Invalid target stage'),
        { log: true }
      );
      return context;
    }

    const attachments = await this.#stagedAttachmentRepository.getForMessage(
      target.id!
    );

    // Log processing start with semaphore state
    const state = this.semaphoreManager.sem.getState();
    log((l) =>
      l.info({
        message: 'Starting attachment processing with concurrency control',
        source: 'AttachmentStateManager',
        attachmentCount: attachments.length,
        maxConcurrent: state.maxConcurrency,
      })
    );

    // Process with concurrency limit via semaphore
    const allPromises = attachments.map((attachment) =>
      this.processAttachmentWithLimit(context, {
        ...attachment,
        stagedMessageId: attachment.stagedMessageId ?? target.id!,
      })
    );

    const result = await Promise.all(allPromises);

    // Log completion with final state
    const finalState = this.semaphoreManager.sem.getState();
    log((l) =>
      l.info({
        message: 'Attachment processing completed',
        source: 'AttachmentStateManager',
        totalAttachments: result.length,
        successCount: result.filter((r) => r.status === 'success').length,
        errorCount: result.filter((r) => r.status === 'error').length,
        finalSemaphoreState: finalState,
      })
    );

    if (result.some((r) => r.status === 'error')) {
      log((l) =>
        l.error({
          message: 'Attachment processing failed',
          source: 'AttachmentStateManager',
          result,
        })
      );
      throw new Error('Attachment processing failed');
    }

    return context;
  }

  /**
   * Get current processing status for monitoring.
   * Returns semaphore state for observability.
   */
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

const attachmentStateManagerFactory = (
  stage: ImportStage,
  options: AdditionalStageOptions
): TransactionalStateManagerBase => new AttachmentStateManager(stage, options);

export default attachmentStateManagerFactory;
