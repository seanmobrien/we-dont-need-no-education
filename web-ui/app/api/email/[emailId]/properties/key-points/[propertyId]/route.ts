import { RepositoryCrudController } from '@/lib/api/repository-crud-controller';
import { KeyPointsDetailsRepository } from '@/lib/api/email/properties/key-points/key-points-details-repository';
import { NextRequest } from 'next/server';
import { wrapRouteRequest, extractParams } from '@/lib/nextjs-util/server/utils';
import {
  checkEmailAuthorization,
  CaseFileScope,
} from '@/lib/auth/resources/case-file';

export const dynamic = 'force-dynamic';

export const GET = wrapRouteRequest(
  async (
    req: NextRequest,
    args: { params: Promise<{ emailId: string; propertyId: string }> },
  ) => {
    const { emailId } = await extractParams(args);

    // Check case file authorization
    const authCheck = await checkEmailAuthorization(req, emailId, {
      requiredScope: CaseFileScope.READ,
    });
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const controller = new RepositoryCrudController(
      new KeyPointsDetailsRepository(),
    );
    return controller.get(req, args);
  },
);

export const PUT = wrapRouteRequest(
  async (
    req: NextRequest,
    args: { params: Promise<{ emailId: string; propertyId: string }> },
  ) => {
    const { emailId } = await extractParams(args);

    // Check case file authorization
    const authCheck = await checkEmailAuthorization(req, emailId, {
      requiredScope: CaseFileScope.WRITE,
    });
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const controller = new RepositoryCrudController(
      new KeyPointsDetailsRepository(),
    );
    return controller.update(req, args);
  },
);

export const DELETE = wrapRouteRequest(
  async (
    req: NextRequest,
    args: { params: Promise<{ emailId: string; propertyId: string }> },
  ) => {
    const { emailId } = await extractParams(args);

    // Check case file authorization
    const authCheck = await checkEmailAuthorization(req, emailId, {
      requiredScope: CaseFileScope.WRITE,
    });
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const controller = new RepositoryCrudController(
      new KeyPointsDetailsRepository(),
    );
    return controller.delete(req, args);
  },
);
export const POST = wrapRouteRequest(
  async (
    req: NextRequest,
    args: { params: Promise<{ emailId: string; propertyId: string }> },
  ) => {
    const { emailId } = await extractParams(args);

    // Check case file authorization
    const authCheck = await checkEmailAuthorization(req, emailId, {
      requiredScope: CaseFileScope.WRITE,
    });
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const controller = new RepositoryCrudController(
      new KeyPointsDetailsRepository(),
    );
    return controller.create(req, args);
  },
);
