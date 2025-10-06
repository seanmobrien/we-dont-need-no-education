export const dynamic = 'force-dynamic'; // Never statically optimize

import { NextRequest } from 'next/server';
import {
  buildFallbackGrid,
  wrapRouteRequest,
} from '/lib/nextjs-util/server/utils';
import { DrizzleCrudRepositoryController } from '/lib/api/drizzle-crud-controller';
import { EmailAttachmentDrizzleRepository } from '/lib/api/attachment';

export const GET = wrapRouteRequest(
  async (req: NextRequest) => {
    const repository = new EmailAttachmentDrizzleRepository();
    const controller = new DrizzleCrudRepositoryController(repository);
    return controller.list(req);
  },
  { buildFallback: buildFallbackGrid },
);

export const POST = wrapRouteRequest(async (req: NextRequest) => {
  const repository = new EmailAttachmentDrizzleRepository();
  const controller = new DrizzleCrudRepositoryController(repository);
  return controller.create(req);
});
