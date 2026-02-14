import { LoggedError } from '@compliance-theater/logger';
import { queueAttachment } from './attachment-download';
import { StagedAttachmentRepository } from '@/lib/api/email/import/staged-attachment';
export const stageAttachment = async ({ req, stagedMessageId, part, }) => {
    const { partId = 'unknown', filename, mimeType, } = part;
    try {
        if (partId === 'unknown') {
            throw new Error('partId is required');
        }
        const repository = new StagedAttachmentRepository();
        const model = await repository.create({
            stagedMessageId,
            partId: Number(partId),
            filename: filename ?? `attachment-${partId}`,
            mimeType: mimeType ??
                part.headers?.find((h) => h.name === 'Content-Type')?.value ??
                null,
            storageId: null,
            imported: false,
            size: part.body.size ?? 0,
            fileOid: null,
            attachmentId: part.body.attachmentId,
        });
        await queueAttachment({
            id: `${stagedMessageId}:${model.partId}`,
            job: { model: { ...model, stagedMessageId: stagedMessageId } },
            req: req,
        });
        return {
            status: 'success',
            partId: partId,
        };
    }
    catch (error) {
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
export const queueStagedAttachments = ({ req, stagedMessageId, part: partFromProps, }) => {
    const partItems = [];
    if (partFromProps.filename && partFromProps.body?.attachmentId) {
        partItems.push(stageAttachment({ req, stagedMessageId, part: partFromProps }));
    }
    return partFromProps.parts
        ? [
            ...partItems,
            ...partFromProps.parts.flatMap((part) => queueStagedAttachments({ req, stagedMessageId, part })),
        ]
        : partItems;
};
//# sourceMappingURL=stage-attachment-utility.js.map