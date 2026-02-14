import { DrizzleCrudRepositoryController } from '@/lib/api/drizzle-crud-controller';
import { EmailAttachmentDrizzleRepository } from '@/lib/api/attachment/drizzle-repository';
import { wrapRouteRequest, extractParams } from '@/lib/nextjs-util/server/utils';
export const dynamic = 'force-dynamic';
export const GET = wrapRouteRequest(async (req, args) => {
    const controller = new DrizzleCrudRepositoryController(new EmailAttachmentDrizzleRepository());
    const { attachmentId } = await extractParams(args);
    return controller.get(req, {
        params: Promise.resolve({ attachmentId: Number(attachmentId) }),
    });
});
export const PUT = wrapRouteRequest(async (req, args) => {
    const controller = new DrizzleCrudRepositoryController(new EmailAttachmentDrizzleRepository());
    const { attachmentId } = await extractParams(args);
    return controller.update(req, {
        params: Promise.resolve({ attachmentId: Number(attachmentId) }),
    });
});
export const DELETE = wrapRouteRequest(async (req, args) => {
    const controller = new DrizzleCrudRepositoryController(new EmailAttachmentDrizzleRepository());
    const { attachmentId } = await extractParams(args);
    return controller.delete(req, {
        params: Promise.resolve({ attachmentId: Number(attachmentId) }),
    });
});
//# sourceMappingURL=route.js.map