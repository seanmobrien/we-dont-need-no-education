import { DrizzleCrudRepositoryController, EmailAttachmentDrizzleRepository } from '@/lib/api';
import { NextRequest } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';

export const dynamic = 'force-dynamic';

export const GET = wrapRouteRequest(async (
  req: NextRequest,
  args: { params: Promise<{ attachmentId: number }> },
) => {
  const controller = new DrizzleCrudRepositoryController(
    new EmailAttachmentDrizzleRepository(),
  );
  return controller.get(req, args);
});

export const PUT = wrapRouteRequest(async (
  req: NextRequest,
  args: { params: Promise<{ attachmentId: number }> },
) => {
  const controller = new DrizzleCrudRepositoryController(
    new EmailAttachmentDrizzleRepository(),
  );
  return controller.update(req, args);
});

export const DELETE = wrapRouteRequest(async (
  req: NextRequest,
  args: { params: Promise<{ attachmentId: number }> },
) => {
  const controller = new DrizzleCrudRepositoryController(
    new EmailAttachmentDrizzleRepository(),
  );
  return controller.delete(req, args);
});
