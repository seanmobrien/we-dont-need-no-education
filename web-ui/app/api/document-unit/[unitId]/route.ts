import {
  CaseFileAmendment,
  getCaseFileDocument,
  toolCallbackResultSchemaFactory,
} from '@/lib/ai/tools';
import { RepositoryCrudController } from '@/lib/api/repository-crud-controller';
import { DocumentUnitRepository } from '@/lib/api/document-unit';
import { extractParams } from '@/lib/nextjs-util/utils';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { NextRequest, NextResponse } from 'next/server';
import { isError } from '@/lib/react-util/utility-methods';
import { amendCaseRecord } from '@/lib/ai/tools/amendCaseRecord';
import { log } from '@/lib/logger';
import { CaseFileResponseShape } from '@/lib/ai/tools/schemas/case-file-request-props-shape';
import {
  checkDocumentUnitAuthorization,
  CaseFileScope,
} from '@/lib/auth/resources/case-file';
export const dynamic = 'force-dynamic';
export const GET = wrapRouteRequest(
  async (
    req: NextRequest,
    args: { params: Promise<{ unitId: number | string }> },
  ) => {
    try {
      const { unitId } = await extractParams(args);

      // Check case file authorization
      const authCheck = await checkDocumentUnitAuthorization(
        req,
        Number(unitId),
        {
          requiredScope: CaseFileScope.READ,
        },
      );
      if (!authCheck.authorized) {
        return authCheck.response;
      }

      const document = await getCaseFileDocument({
        caseFileId: Number(unitId),
      });

      const valid = toolCallbackResultSchemaFactory(
        CaseFileResponseShape,
      ).result.safeParse(document.structuredContent.result);
      if (!valid.success) {
        log((l) =>
          l.error({
            message: 'Tool returned a failure message',
            error: valid.error,
            data: document.structuredContent.result,
          }),
        );
        throw valid.error;
      }
      return NextResponse.json(document.structuredContent.result);
    } catch (error) {
      return NextResponse.json(
        { error: isError(error) ? error.message : error, data: error },
        { status: 500 },
      );
    }
  },
);

export const PUT = wrapRouteRequest(
  async (
    req: NextRequest,
    args: { params: Promise<{ unitId: number | string }> },
  ) => {
    const { unitId } = await extractParams(args);

    // Check case file authorization (write scope required)
    const authCheck = await checkDocumentUnitAuthorization(
      req,
      Number(unitId),
      {
        requiredScope: CaseFileScope.WRITE,
      },
    );
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const data = (await req.json()) as CaseFileAmendment;
    if (data.targetCaseFileId !== Number(unitId)) {
      return NextResponse.json(
        { error: 'Target case file ID does not match the unit ID.' },
        { status: 400 },
      );
    }
    const response = await amendCaseRecord({ update: data });
    let status: number;
    if (response.structuredContent.result.isError) {
      status = 500;
    } else {
      if (response.structuredContent.result.value?.FailedRecords?.length) {
        status = 400;
      } else {
        status = 200;
      }
    }
    return NextResponse.json(response, {
      status,
    });
  },
);

export const DELETE = wrapRouteRequest(
  async (
    req: NextRequest,
    args: { params: Promise<{ unitId: number | string }> },
  ) => {
    const { unitId } = await extractParams(args);

    // Check case file authorization (write scope required)
    const authCheck = await checkDocumentUnitAuthorization(
      req,
      Number(unitId),
      {
        requiredScope: CaseFileScope.WRITE,
      },
    );
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const controller = new RepositoryCrudController(
      new DocumentUnitRepository(),
    );
    return controller.delete(req, { params: { unitId: Number(unitId) } });
  },
);

export const POST = wrapRouteRequest(
  async (
    req: NextRequest,
    data: { params: Promise<{ unitId: number | string }> },
  ) => {
    const { unitId } = await extractParams(data);

    // Check case file authorization (write scope required)
    const authCheck = await checkDocumentUnitAuthorization(
      req,
      Number(unitId),
      {
        requiredScope: CaseFileScope.WRITE,
      },
    );
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const controller = new RepositoryCrudController(
      new DocumentUnitRepository(),
    );
    return controller.create(req, { params: { unitId: Number(unitId) } });
  },
);
