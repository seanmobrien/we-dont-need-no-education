import {
  CaseFileAmendment,
  getCaseFileDocument,
  toolCallbackResultSchemaFactory,
} from '@/lib/ai/tools';
import { RepositoryCrudController, DocumentUnitRepository } from '@/lib/api';
import { extractParams } from '@/lib/nextjs-util';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { NextRequest, NextResponse } from 'next/server';
import { isError } from '@/lib/react-util';
import { amendCaseRecord } from '@/lib/ai/tools/amendCaseRecord';
import { log } from '@/lib/logger';
import { CaseFileResponseShape } from '@/lib/ai/tools/schemas/case-file-request-props-shape';
export const dynamic = 'force-dynamic';
export const GET = wrapRouteRequest(async (
  req: NextRequest,
  args: { params: Promise<{ unitId: number }> },
) => {
  try {
    const { unitId } = await extractParams(args);
    const document = await getCaseFileDocument({ caseFileId: unitId });

    const valid = toolCallbackResultSchemaFactory(
      CaseFileResponseShape,
    ).result.safeParse(document.structuredContent.result);
    if (!valid.success) {
      log(l => l.error({
        message: 'Tool returned a failure message',
        error: valid.error,
        data: document.structuredContent.result,
      }));
      throw valid.error;
    }
    return NextResponse.json(document.structuredContent.result);
  } catch (error) {
    return NextResponse.json(
      { error: isError(error) ? error.message : error, data: error },
      { status: 500 },
    );
  }
});

export const PUT = wrapRouteRequest(async (
  req: NextRequest,
  args: { params: Promise<{ unitId: number }> },
) => {
  const { unitId } = await extractParams(args);
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
});

export const DELETE = wrapRouteRequest(async (
  req: NextRequest,
  args: { params: Promise<{ unitId: number }> },
) => {
  const controller = new RepositoryCrudController(new DocumentUnitRepository());
  return controller.delete(req, args);
});
