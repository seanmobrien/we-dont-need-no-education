import { NextRequest } from 'next/server';
import {
  buildFallbackGrid,
  wrapRouteRequest,
  extractParams,
} from '@compliance-theater/nextjs/server/utils';
import { ComplianceScoresDetails } from '@/data-models/api/email-properties/extended-properties';
import { eq, and } from 'drizzle-orm';
import { drizDbWithInit } from '@compliance-theater/database/orm';
import { schema } from '@compliance-theater/database/orm';
import {
  checkCaseFileAuthorization,
  CaseFileScope,
} from '@compliance-theater/auth/lib/resources/case-file';
import {
  getEmailColumn,
  selectForGrid,
} from '@/lib/components/mui/data-grid/queryHelpers';
import { DefaultEmailColumnMap } from '@/lib/components/mui/data-grid/server';
import { PgColumn } from 'drizzle-orm/pg-core';
import { unauthorizedServiceResponse } from '@compliance-theater/nextjs/server/unauthorized-service-response';

const columnMap = {
  ...DefaultEmailColumnMap,
} as const;

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

    // Define the base query that matches the original SQL structure
    const baseQuery = db
      .select({
        // From document_property (ep)
        propertyId: schema.documentProperty.propertyId,
        propertyValue: schema.documentProperty.propertyValue,
        documentPropertyTypeId: schema.documentProperty.documentPropertyTypeId,
        documentId: schema.documentProperty.documentId,
        createdOn: schema.documentProperty.createdOn,
        policyBasis: schema.documentProperty.policyBasis,
        tags: schema.documentProperty.tags,

        // From email_property_type (ept)
        propertyName: schema.emailPropertyType.propertyName,

        // From email_property_category (epc)
        description: schema.emailPropertyCategory.description,
        emailPropertyCategoryId:
          schema.emailPropertyCategory.emailPropertyCategoryId,

        // From compliance_scores_details (csd)
        actionPropertyId: schema.complianceScoresDetails.actionPropertyId,
        complianceScore: schema.complianceScoresDetails.complianceScore,
        violationsFound: schema.complianceScoresDetails.violationsFound,
        responseDelayDays: schema.complianceScoresDetails.responseDelayDays,
        overallGrade: schema.complianceScoresDetails.overallGrade,
        evaluatedOn: schema.complianceScoresDetails.evaluatedOn,
      })
      .from(schema.documentProperty)
      .innerJoin(
        schema.complianceScoresDetails,
        eq(
          schema.complianceScoresDetails.propertyId,
          schema.documentProperty.propertyId,
        ),
      )
      .innerJoin(
        schema.emailPropertyType,
        eq(
          schema.emailPropertyType.documentPropertyTypeId,
          schema.documentProperty.documentPropertyTypeId,
        ),
      )
      .innerJoin(
        schema.emailPropertyCategory,
        eq(
          schema.emailPropertyCategory.emailPropertyCategoryId,
          schema.emailPropertyType.emailPropertyCategoryId,
        ),
      )
      .innerJoin(
        schema.documentUnits,
        eq(schema.documentUnits.unitId, schema.documentProperty.documentId),
      )
      .where(
        and(
          eq(schema.documentUnits.emailId, emailId),
          eq(schema.emailPropertyType.emailPropertyCategoryId, 6),
        ),
      );

    // Column getter function for filtering and sorting
    const getColumn = (columnName: string): PgColumn | undefined => {
      return getEmailColumn({
        columnName,
        table: schema.complianceScoresDetails,
      });
    };

    // Record mapper to transform database records to ComplianceScoresDetails objects
    const recordMapper = (
      record: Record<string, unknown>,
    ): Partial<ComplianceScoresDetails> => {
      return {
        propertyId: record.propertyId as string,
        documentId: record.documentId as number,
        createdOn: new Date(Date.parse(record.createdOn as string)),
        policy_basis: record.policyBasis as string[],
        tags: record.tags as string[],
        actionPropertyId: record.actionPropertyId as string | null,
        complianceScore: record.complianceScore as number | null,
        violationsFound: record.violationsFound as number,
        responseDelayDays: record.responseDelayDays as number,
        overallGrade: record.overallGrade as string | null,
        evaluatedOn: new Date(Date.parse(record.evaluatedOn as string)),
        value: record.propertyValue as string, // Map propertyValue to value field
      };
    };

    // Use selectForGrid to apply filtering, sorting, and pagination
    const result = await selectForGrid<Partial<ComplianceScoresDetails>>({
      req,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query: baseQuery as any,
      getColumn,
      columnMap,
      recordMapper,
    });

    return Response.json(result);
  },
  { buildFallback: buildFallbackGrid },
);
