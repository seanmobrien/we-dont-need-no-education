import { NextRequest } from 'next/server';
import {
  wrapRouteRequest,
  extractParams,
} from '@compliance-theater/nextjs/server/utils';
import {
  checkCaseFileAuthorization,
  CaseFileScope,
} from '@compliance-theater/auth/lib/resources/case-file/index';
import { unauthorizedServiceResponse } from '@compliance-theater/nextjs/server/unauthorized-service-response';
import { drizDbWithInit } from '@compliance-theater/database/orm';
import { schema } from '@compliance-theater/database/orm';
import { eq, and } from '@compliance-theater/database/drizzle-orm';
import { env } from '@compliance-theater/env';
import { DocumentUnitRepository } from '@/lib/api/document-unit';

export const dynamic = 'force-dynamic';

export const GET = wrapRouteRequest(
  async (req: NextRequest, args: { params: Promise<{ emailId: string }> }) => {
    const { emailId } = await extractParams<{ emailId: string }>(args);

    // Check case file authorization
    const authCheck = await checkCaseFileAuthorization(req, emailId, {
      requiredScope: CaseFileScope.READ,
    });
    if (!authCheck.authorized) {
      return (
        authCheck.response ??
        unauthorizedServiceResponse({ req, scopes: ['case-file:read'] })
      );
    }

    const db = await drizDbWithInit();
    const repository = new DocumentUnitRepository({ generateDownloadKey: true });

    // Query document units for attachments related to this email
    const documentUnits = await db
      .select({
        unitId: schema.documentUnits.unitId,
        attachmentId: schema.documentUnits.attachmentId,
        emailId: schema.documentUnits.emailId,
        documentType: schema.documentUnits.documentType,
        fileName: schema.emailAttachments.fileName,
        filePath: schema.emailAttachments.filePath,
        mimeType: schema.emailAttachments.mimeType,
        size: schema.emailAttachments.size,
      })
      .from(schema.documentUnits)
      .innerJoin(
        schema.emailAttachments,
        eq(schema.emailAttachments.attachmentId, schema.documentUnits.attachmentId),
      )
      .where(
        and(
          eq(schema.documentUnits.emailId, emailId),
          eq(schema.documentUnits.documentType, 'attachment'),
        ),
      );

    // Map to the expected format with hrefDocument
    const attachments = documentUnits.map((record) => {
      const sasKey = repository['SasKey']; // Access private property via bracket notation
      return {
        unitId: record.unitId,
        attachmentId: record.attachmentId,
        fileName: record.fileName || undefined,
        hrefDocument: record.filePath
          ? `${record.filePath}${sasKey}`
          : undefined,
        hrefApi: `${env('NEXT_PUBLIC_HOSTNAME')}/api/attachment/${record.attachmentId}`,
      };
    });

    return Response.json(attachments);
  },
);
