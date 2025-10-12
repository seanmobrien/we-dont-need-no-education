import { RepositoryCrudController } from '@/lib/api/repository-crud-controller';
import { CallToActionDetailsRepository } from '@/lib/api/email/properties/call-to-action/cta-details-repository';
import { NextRequest } from 'next/server';
import {
  buildFallbackGrid,
  wrapRouteRequest,
} from '@/lib/nextjs-util/server/utils';

export const dynamic = 'force-dynamic';

export const GET = wrapRouteRequest(
  async (
    req: NextRequest,
    args: { params: Promise<{ emailId: string; propertyId: string }> },
  ) => {
    const controller = new RepositoryCrudController(
      new CallToActionDetailsRepository(),
    );
    return controller.get(req, args);
  },
  { buildFallback: buildFallbackGrid },
);

export const PUT = wrapRouteRequest(
  async (
    req: NextRequest,
    args: { params: Promise<{ emailId: string; propertyId: string }> },
  ) => {
    const controller = new RepositoryCrudController(
      new CallToActionDetailsRepository(),
    );
    return controller.update(req, args);
  },
);

export const DELETE = wrapRouteRequest(
  async (
    req: NextRequest,
    args: { params: Promise<{ emailId: string; propertyId: string }> },
  ) => {
    const controller = new RepositoryCrudController(
      new CallToActionDetailsRepository(),
    );
    return controller.delete(req, args);
  },
);
export const POST = wrapRouteRequest(
  async (
    req: NextRequest,
    args: { params: Promise<{ emailId: string; propertyId: string }> },
  ) => {
    const controller = new RepositoryCrudController(
      new CallToActionDetailsRepository(),
    );
    return controller.create(req, args);
  },
);
