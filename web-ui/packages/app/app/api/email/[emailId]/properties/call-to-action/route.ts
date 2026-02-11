import { NextRequest } from 'next/server';
import {
  wrapRouteRequest,
  buildFallbackGrid,
} from '@/lib/nextjs-util/server/utils';
import { extractParams } from '@/lib/nextjs-util/server/utils';

import { eq, and, sql } from 'drizzle-orm';
import { drizDbWithInit, schema } from '@compliance-theater/database';
import {
  checkCaseFileAuthorization,
  CaseFileScope,
} from '@/lib/auth/resources/case-file';
import {
  DrizzleSelectQuery,
  buildDrizzleAttachmentOrEmailFilter,
  getEmailColumn,
  selectForGrid,
} from '@/lib/components/mui/data-grid/queryHelpers';
import { CallToActionDetails } from '@/data-models/api/email-properties/extended-properties';
import { unauthorizedServiceResponse } from '@/lib/nextjs-util/server/unauthorized-service-response';

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

        // From call_to_action_details (cta)
        openedDate: schema.callToActionDetails.openedDate,
        closedDate: schema.callToActionDetails.closedDate,
        compliancyCloseDate: schema.callToActionDetails.compliancyCloseDate,
        completionPercentage: schema.callToActionDetails.completionPercentage,
        complianceRating: schema.callToActionDetails.complianceRating,
        inferred: schema.callToActionDetails.inferred,
        complianceDateEnforceable:
          schema.callToActionDetails.complianceDateEnforceable,
        reasonableRequest: schema.callToActionDetails.reasonableRequest,
        reasonableReasons: schema.callToActionDetails.reasonableReasons,
        sentiment: schema.callToActionDetails.sentiment,
        sentimentReasons: schema.callToActionDetails.sentimentReasons,
        complianceRatingReasons:
          schema.callToActionDetails.complianceRatingReasons,
        severity: schema.callToActionDetails.severity,
        severityReason: schema.callToActionDetails.severityReason,
        titleIxApplicable: schema.callToActionDetails.titleIxApplicable,
        titleIxApplicableReasons:
          schema.callToActionDetails.titleIxApplicableReasons,
        closureActions: schema.callToActionDetails.closureActions,

        // Subqueries for compliance averages and reasons
        compliance_average_chapter_13: sql<number | null>`(
        SELECT AVG(${schema.callToActionDetailsCallToActionResponse.complianceChapter13}) 
        FROM ${schema.callToActionDetailsCallToActionResponse} 
        WHERE ${schema.callToActionDetailsCallToActionResponse.callToActionId} = ${schema.callToActionDetails.propertyId}
      )`.as('compliance_average_chapter_13'),

        compliance_chapter_13_reasons: sql<string[] | null>`(
        SELECT array_agg(reasons_raw_chapter_13) AS compliance_chapter_13_reasons 
        FROM (
          SELECT UNNEST(${schema.callToActionDetailsCallToActionResponse.complianceChapter13Reasons}) AS reasons_raw_chapter_13
          FROM ${schema.callToActionDetailsCallToActionResponse}
          WHERE ${schema.callToActionDetailsCallToActionResponse.callToActionId} = ${schema.callToActionDetails.propertyId}
        ) sub
      )`.as('compliance_chapter_13_reasons'),
      })
      .from(schema.documentProperty)
      .innerJoin(
        schema.callToActionDetails,
        eq(
          schema.callToActionDetails.propertyId,
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
          eq(schema.documentProperty.documentPropertyTypeId, 4),
          buildDrizzleAttachmentOrEmailFilter({
            attachments: req,
            email_id: emailId,
            email_id_column: schema.documentUnits.emailId,
            document_id_column: schema.documentProperty.documentId,
          }),
        ),
      );

    // Record mapper to transform database records to CallToActionDetails objects
    const recordMapper = (
      record: Record<string, unknown>,
    ): Partial<CallToActionDetails> => {
      return {
        propertyId: record.propertyId as string,
        documentId: record.documentId as number,
        createdOn: new Date(Date.parse(record.createdOn as string)),
        policy_basis: record.policyBasis as string[],
        tags: record.tags as string[],
        opened_date: record.openedDate as Date | null,
        closed_date: record.closedDate as Date | null,
        compliancy_close_date: record.compliancyCloseDate as Date | null,
        completion_percentage: Number(record.completionPercentage),
        compliance_rating: record.complianceRating as number | null,
        inferred: record.inferred as boolean,
        compliance_date_enforceable:
          record.complianceDateEnforceable as boolean,
        reasonable_request: record.reasonableRequest as number | null,
        reasonable_reasons: record.reasonableReasons as string[] | null,
        sentiment: record.sentiment as number | null,
        sentiment_reasons: record.sentimentReasons as string[] | null,
        compliance_rating_reasons: record.complianceRatingReasons as
          | string[]
          | null,
        severity: record.severity as number | null,
        severity_reason: record.severityReason as string[] | null,
        title_ix_applicable: record.titleIxApplicable as number | null,
        title_ix_applicable_reasons: record.titleIxApplicableReasons as
          | string[]
          | null,
        closure_actions: record.closureActions as string[] | null,
        value: record.propertyValue as string, // Map propertyValue to value field
        compliance_average_chapter_13: record.compliance_average_chapter_13 as
          | number
          | null,
        compliance_chapter_13_reasons: record.compliance_chapter_13_reasons as
          | string[]
          | null,
      };
    };

    // Use selectForGrid to apply filtering, sorting, and pagination
    const result = await selectForGrid<Partial<CallToActionDetails>>({
      req,
      query: baseQuery as unknown as DrizzleSelectQuery,
      getColumn: (columnName: string) =>
        getEmailColumn({ columnName, table: schema.callToActionDetails }),
      recordMapper,
    });

    return Response.json(result);
  },
  { buildFallback: buildFallbackGrid },
);
