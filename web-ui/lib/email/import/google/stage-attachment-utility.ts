import { LoggedError } from '@/lib/react-util';
import { AttachmentStagedResult, StageAttachmentProps } from './types';
import { queueAttachment } from './attachment-download';
import { StagedAttachmentRepository } from '@/lib/api/email/import/staged-attachment';
import { gmail_v1 } from '@googleapis/gmail';

/**
 * Stages an email attachment for further processing by creating a staged attachment record
 * and queuing it for import. Handles errors and returns the status of the operation.
 *
 * @param req - The request object, typically containing user/session context.
 * @param stagedMessageId - The identifier for the staged email message.
 * @param part - The message part representing the attachment, conforming to Gmail API schema.
 * @returns A promise that resolves to an object indicating the status of the staging operation,
 *          including the partId and error message if applicable.
 *
 * @example
 * ```typescript
 * const result = await stageAttachment({
 *   req,
 *   stagedMessageId: 'abc123',
 *   part: {
 *     partId: '2',
 *     filename: 'document.pdf',
 *     mimeType: 'application/pdf',
 *     body: { size: 1024, attachmentId: 'att456' },
 *     headers: [{ name: 'Content-Type', value: 'application/pdf' }]
 *   }
 * });
 * if (result.status === 'success') {
 *   console.log('Attachment staged:', result.partId);
 * } else {
 *   console.error('Failed to stage attachment:', result.error);
 * }
 * ```
 */
export const stageAttachment = async ({
  req,
  stagedMessageId,
  part,
}: StageAttachmentProps): Promise<AttachmentStagedResult> => {
  const {
    partId = 'unknown',
    filename,
    mimeType,
  } = part as gmail_v1.Schema$MessagePart;
  try {
    if (partId === 'unknown') {
      throw new Error('partId is required');
    }
    const repository = new StagedAttachmentRepository();
    const model = await repository.create({
      stagedMessageId,
      partId: Number(partId),
      filename: filename ?? `attachment-${partId}`,
      mimeType:
        mimeType ??
        part.headers?.find((h) => h.name === 'Content-Type')?.value ??
        null,
      storageId: null,
      imported: false,
      size: part.body!.size ?? 0,
      fileOid: null,
      attachmentId: part.body!.attachmentId!,
    });

    await queueAttachment({
      id: `${stagedMessageId}:${model.partId}`,
      job: { model: { ...model, stagedMessageId: stagedMessageId } },
      req: req,
    });

    return {
      status: 'success',
      partId: partId!,
    };
  } catch (error) {
    const e = LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'email-import',
      data: { stagedMessageId, partId, filename, mimeType },
    });
    return {
      status: 'error',
      error: e.message,
      partId: partId ?? 'unknown',
    };
  }
};

/**
 * Recursively queues staged attachments for processing.
 *
 * This function takes a staged message part and, if it contains an attachment,
 * stages it for processing. If the part contains nested parts, it recursively
 * processes each sub-part, collecting all resulting promises into a flat array.
 *
 * @param req - The request object used for staging attachments.
 * @param stagedMessageId - The identifier for the staged message.
 * @param part - The message part to process, which may contain attachments and/or nested parts.
 * @returns An array of promises, each resolving to an `AttachmentStagedResult` for a staged attachment.
 *
 * @example
 * ```typescript
 * const results = await Promise.all(
 *   queueStagedAttachments({
 *     req,
 *     stagedMessageId: 'abc123',
 *     part: emailPart,
 *   })
 * );
 * ```
 */
export const queueStagedAttachments = ({
  req,
  stagedMessageId,
  part: partFromProps,
}: StageAttachmentProps): Array<Promise<AttachmentStagedResult>> => {
  const partItems = [];
  if (partFromProps.filename && partFromProps.body?.attachmentId) {
    partItems.push(
      stageAttachment({ req, stagedMessageId, part: partFromProps }),
    );
  }
  return partFromProps.parts
    ? [
        ...partItems,
        ...partFromProps.parts.flatMap((part) =>
          queueStagedAttachments({ req, stagedMessageId, part }),
        ),
      ]
    : partItems;
};
