import { RepositoryCrudController } from '@/lib/api/repository-crud-controller';
import { ComplianceScoresDetailsRepository } from '@/lib/api/email/properties/compliance-scores/compliance-scores-details-repository';
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
    const { emailId } = await extractParams(args);

    // Check case file authorization
    const authCheck = await checkEmailAuthorization(req, emailId, {
      requiredScope: CaseFileScope.READ,
    });
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const controller = new RepositoryCrudController(
      new ComplianceScoresDetailsRepository(),
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
    const { emailId } = await extractParams(args);

    // Check case file authorization
    const authCheck = await checkEmailAuthorization(req, emailId, {
      requiredScope: CaseFileScope.WRITE,
    });
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const controller = new RepositoryCrudController(
      new ComplianceScoresDetailsRepository(),
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
      new ComplianceScoresDetailsRepository(),
    );
    return controller.delete(req, args);
  },
);
