import { RepositoryCrudController } from '@/lib/api/repository-crud-controller';
import { ComplianceScoresDetailsRepository } from '@/lib/api/email/properties/compliance-scores/compliance-scores-details-repository';
import type { NextRequest } from 'next/server';
import {
  buildFallbackGrid,
  wrapRouteRequest,
  extractParams,
} from '@/lib/nextjs-util/server/utils';
import { CaseFileScope } from '@/lib/auth/resources/case-file/case-file-resource';
import { checkEmailAuthorization } from '@/lib/auth/resources/case-file/case-file-middleware';

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
