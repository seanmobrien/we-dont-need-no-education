import {
  RepositoryCrudController,
  ComplianceScoresDetailsRepository,
} from '@/lib/api';
import { NextRequest } from 'next/server';
import { buildFallbackGrid, wrapRouteRequest } from '@/lib/nextjs-util/server/utils';

export const dynamic = 'force-dynamic';

export const GET = wrapRouteRequest(async (
  req: NextRequest,
  args: { params: Promise<{ emailId: string; propertyId: string }> },
) => {
  const controller = new RepositoryCrudController(
    new ComplianceScoresDetailsRepository(),
  );
  return controller.get(req, args);
}, { buildFallback: buildFallbackGrid });

export const PUT = wrapRouteRequest(async (
  req: NextRequest,
  args: { params: Promise<{ emailId: string; propertyId: string }> },
) => {
  const controller = new RepositoryCrudController(
    new ComplianceScoresDetailsRepository(),
  );
  return controller.update(req, args);
});

export const DELETE = wrapRouteRequest(async (
  req: NextRequest,
  args: { params: Promise<{ emailId: string; propertyId: string }> },
) => {
  const controller = new RepositoryCrudController(
    new ComplianceScoresDetailsRepository(),
  );
  return controller.delete(req, args);
});
