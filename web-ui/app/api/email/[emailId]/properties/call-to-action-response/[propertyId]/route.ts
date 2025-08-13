import { RepositoryCrudController } from '@/lib/api/repository-crud-controller';
import { CallToActionResponseDetailsRepository } from '@/lib/api/email/properties/call-to-action-response/call-to-action-response-details-repository';
import { NextRequest } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';

export const dynamic = 'force-dynamic';

export const GET = wrapRouteRequest(async (
  req: NextRequest,
  args: { params: Promise<{ emailId: string; propertyId: string }> },
) => {
  const controller = new RepositoryCrudController(
    new CallToActionResponseDetailsRepository(),
  );
  return controller.get(req, args);
});

export const PUT = wrapRouteRequest(async (
  req: NextRequest,
  args: { params: Promise<{ emailId: string; propertyId: string }> },
) => {
  const controller = new RepositoryCrudController(
    new CallToActionResponseDetailsRepository(),
  );
  return controller.update(req, args);
});

export const DELETE = wrapRouteRequest(async (
  req: NextRequest,
  args: { params: Promise<{ emailId: string; propertyId: string }> },
) => {
  const controller = new RepositoryCrudController(
    new CallToActionResponseDetailsRepository(),
  );
  return controller.delete(req, args);
});
