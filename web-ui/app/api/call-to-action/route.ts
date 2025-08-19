import { NextRequest } from 'next/server';
import { RepositoryCrudController } from '@/lib/api/repository-crud-controller';
import { CallToActionDetailsRepository } from '@/lib/api/email/properties/call-to-action/cta-details-repository';
import { extractParams } from '@/lib/nextjs-util/utils';
import { CallToActionDetails } from '@/data-models/api/email-properties/extended-properties';
import { buildFallbackGrid, wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { schema } from '@/lib/drizzle-db/schema';
import {
  DrizzleSelectQuery,
  getEmailColumn,
  selectForGrid,
} from '@/lib/components/mui/data-grid/queryHelpers';
import { buildDrizzleAttachmentOrEmailFilter } from '@/lib/components/mui/data-grid/queryHelpers';
import { PgColumn } from 'drizzle-orm/pg-core';

const repository = new CallToActionDetailsRepository();
const controller = new RepositoryCrudController(repository);

export const dynamic = 'force-dynamic';

export const GET = wrapRouteRequest(
  async (req: NextRequest, args: { params: Promise<{ emailId: string }> }) => {
    const { emailId } = await extractParams<{ emailId: string }>(args);

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
        // Aggregated fields from call_to_action_details_call_to_action_response
        compliance_average_chapter_13:
          sql`(SELECT AVG("call_to_action_details_call_to_action_response".compliance_chapter_13) FROM "call_to_action_details_call_to_action_response" WHERE "call_to_action_details_call_to_action_response".call_to_action_id = "call_to_action_details".property_id )`.as(
            'compliance_average_chapter_13',
          ),
        compliance_chapter_13_reasons:
          sql`(SELECT array_agg(reasons_raw_chapter_13) AS compliance_chapter_13_reasons FROM (
              SELECT UNNEST(car.compliance_chapter_13_reasons) AS reasons_raw_chapter_13
              FROM call_to_action_details_call_to_action_response car
              WHERE car.call_to_action_id=call_to_action_details.property_id
            ) sub)`.as('compliance_chapter_13_reasons'),
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

    // Column getter function for filtering and sorting
    const getColumn = (columnName: string): PgColumn | SQL | undefined => {
      const ret = getEmailColumn({
        columnName,
        table: schema.callToActionDetails,
      });
      return ret;
    };

    // Record mapper to transform database records to CallToActionDetails objects
    const recordMapper = (
      record: Record<string, unknown>,
    ): Partial<CallToActionDetails> => {
      return {
        propertyId: record.propertyId as string,
        // propertyValue: record.propertyValue as string,
        // documentPropertyTypeId: record.documentPropertyTypeId as number,
        documentId: record.documentId as number,
        createdOn: new Date(Date.parse(record.createdOn as string)),
        policy_basis: record.policyBasis as string[],
        tags: record.tags as string[],
        // propertyName: record.propertyName as string,
        // description: record.description as string,
        // emailPropertyCategoryId: record.emailPropertyCategoryId as number,
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
      getColumn,
      recordMapper,
    });

    return Response.json(result);
  },
  { buildFallback: buildFallbackGrid },
);

export const POST = wrapRouteRequest(async (
  req: NextRequest,
  args: { params: Promise<{ propertyId: string }> },
) => {
  return controller.create(req, args);
});
