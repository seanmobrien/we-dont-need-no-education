import { ImportStage } from '@/data-models/api/import/email-message';
import { AdditionalStageOptions, StageProcessorContext } from '../types';
import { errorLogFactory, log } from '@/lib/logger';
import { TransactionalStateManagerBase } from '../default/transactional-statemanager';

import { getQueuedAttachment } from './attachment-download';
import {
  StagedAttachment,
  StagedAttachmentRepository,
} from '@/lib/api/email/import/staged-attachment';
import { EmailAttachmentRepository } from '@/lib/api/email/database';
import { LoggedError } from '@/lib/react-util';

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
  constructor(stage: ImportStage, options: AdditionalStageOptions) {
    super(stage, options);
    this.#stagedAttachmentRepository =
      options.stagedAttachmentRepository ?? new StagedAttachmentRepository();
  }

  readonly #stagedAttachmentRepository: StagedAttachmentRepository;
  readonly #attachmentRepository = new EmailAttachmentRepository();
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
                job,
              })
            );
            this.#attachmentRepository
              .create({
                emailId: context.target!.targetId!,
                fileName: record.filename,
                filePath: job.result.storageId!,
                extractedText: null,
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
      log((l) =>
        l.error(
          errorLogFactory({
            error: new Error('Invalid target stage'),
            source: 'DefaultImportManager::attachment',
            context,
          })
        )
      );
      return context;
    }

    const allPromises = (
      await this.#stagedAttachmentRepository.getForMessage(target.id!)
    ).map((attachment) =>
      this.processAttachment(context, {
        ...attachment,
        stagedMessageId: attachment.stagedMessageId ?? target.id!,
      })
    );

    const result = await Promise.all(allPromises);
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
}

const attachmentStateManagerFactory = (
  stage: ImportStage,
  options: AdditionalStageOptions
): TransactionalStateManagerBase => new AttachmentStateManager(stage, options);

export default attachmentStateManagerFactory;
