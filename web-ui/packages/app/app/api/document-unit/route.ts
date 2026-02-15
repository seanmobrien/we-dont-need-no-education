import { NextRequest, NextResponse } from 'next/server';
import { RepositoryCrudController } from '@/lib/api/repository-crud-controller';
import { DocumentUnitRepository } from '@/lib/api/document-unit';
import { isTruthy } from '@compliance-theater/react/utility-methods';

import {
  getMultipleCaseFileDocuments,
  toolCallbackArrayResultSchemaFactory,
} from '@/lib/ai/tools';
import z from 'zod';
import { CaseFileResponseShape } from '@/lib/ai/tools/schemas/case-file-request-props-shape';
import { wrapRouteRequest } from '@compliance-theater/nextjs/server/utils';
import { checkCaseFileAuthorization } from '@/lib/auth/resources/case-file/case-file-middleware';
import { CaseFileScope } from '@/lib/auth/resources/case-file/case-file-resource';

export const dynamic = 'force-dynamic';

export const GET = wrapRouteRequest(async (req: NextRequest) => {
  const url = new URL(req.url);
  const { searchParams } = url;
  const generateDownloadKey = isTruthy(searchParams.get('downloadable'));
  const alwaysReturnContent = isTruthy(searchParams.get('content'));
  const pendingEmbed = isTruthy(searchParams.get('pending'));
  const id = searchParams.get('id');

  try {
    if (!!id) {
      const caseAccess = await checkCaseFileAuthorization(
        req,
        id,
        {
          requiredScope: CaseFileScope.READ,
        }
      );
      if (!caseAccess.authorized) {
        return caseAccess.response;
      }
      const parsedId = Array.isArray(id) ? id : String(id).split(',');
      const rawRecords = await getMultipleCaseFileDocuments({
        requests: parsedId.map((id) => ({
          caseFileId: id,
        })),
      });

      const parsedRecords = z
        .object(toolCallbackArrayResultSchemaFactory(CaseFileResponseShape))
        .safeParse(rawRecords.structuredContent);
      if (!parsedRecords.success) {
        throw { error: parsedRecords.error, data: rawRecords };
      }
      return NextResponse.json(parsedRecords.data);
    } else {
      const controller = new RepositoryCrudController(
        new DocumentUnitRepository({
          generateDownloadKey,
          alwaysReturnContent,
          pendingEmbed,
        }),
      );
      return controller.list(req);
    }
  } catch (error) {
    return NextResponse.json(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { error: (error as any)?.message ?? 'Unknown error', data: { error } },
      { status: 500 },
    );
  }
});
