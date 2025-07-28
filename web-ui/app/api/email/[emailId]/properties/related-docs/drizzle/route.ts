import { NextRequest } from 'next/server';
import { extractParams } from '@/lib/nextjs-util';
import { CallToActionDetails } from '@/data-models';
import { eq, and } from 'drizzle-orm';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { schema } from '@/lib/drizzle-db/schema';
import { selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers';
import { buildDrizzleAttachmentOrEmailFilter } from '@/lib/components/mui/data-grid/queryHelpers';
import { DefaultEmailColumnMap } from '@/lib/components/mui/data-grid/server';
import { PgColumn } from 'drizzle-orm/pg-core';

const columnMap = {
  ...DefaultEmailColumnMap,
} as const;

export async function GET(
  req: NextRequest,
  args: { params: Promise<{ emailId: string }> },
) {
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
      emailPropertyCategoryId: schema.emailPropertyCategory.emailPropertyCategoryId,
      
      // From call_to_action_details (cta)
      openedDate: schema.callToActionDetails.openedDate,
      closedDate: schema.callToActionDetails.closedDate,
      compliancyCloseDate: schema.callToActionDetails.compliancyCloseDate,
      completionPercentage: schema.callToActionDetails.completionPercentage,
      complianceRating: schema.callToActionDetails.complianceRating,
      inferred: schema.callToActionDetails.inferred,
      complianceDateEnforceable: schema.callToActionDetails.complianceDateEnforceable,
      reasonableRequest: schema.callToActionDetails.reasonableRequest,
      reasonableReasons: schema.callToActionDetails.reasonableReasons,
      sentiment: schema.callToActionDetails.sentiment,
      sentimentReasons: schema.callToActionDetails.sentimentReasons,
      complianceRatingReasons: schema.callToActionDetails.complianceRatingReasons,
      severity: schema.callToActionDetails.severity,
      severityReason: schema.callToActionDetails.severityReason,
      titleIxApplicable: schema.callToActionDetails.titleIxApplicable,
      titleIxApplicableReasons: schema.callToActionDetails.titleIxApplicableReasons,
      closureActions: schema.callToActionDetails.closureActions,
    })
    .from(schema.documentProperty)
    .innerJoin(
      schema.callToActionDetails,
      eq(schema.callToActionDetails.propertyId, schema.documentProperty.propertyId)
    )
    .innerJoin(
      schema.emailPropertyType,
      eq(schema.emailPropertyType.documentPropertyTypeId, schema.documentProperty.documentPropertyTypeId)
    )
    .innerJoin(
      schema.emailPropertyCategory,
      eq(schema.emailPropertyCategory.emailPropertyCategoryId, schema.emailPropertyType.emailPropertyCategoryId)
    )
    .innerJoin(
      schema.documentUnits,
      eq(schema.documentUnits.unitId, schema.documentProperty.documentId)
    )
    .where(
      and(
        eq(schema.documentProperty.documentPropertyTypeId, 4),
        buildDrizzleAttachmentOrEmailFilter({
          attachments: req,
          email_id: emailId,
          email_id_column: schema.documentUnits.emailId,
          document_id_column: schema.documentProperty.documentId,
        })
      )
    );

  // Column getter function for filtering and sorting
  const getColumn = (columnName: string): PgColumn | undefined => {
    switch (columnName) {
      case 'property_id': return schema.documentProperty.propertyId;
      case 'property_value': return schema.documentProperty.propertyValue;
      case 'document_property_type_id': return schema.documentProperty.documentPropertyTypeId;
      case 'document_id': return schema.documentProperty.documentId;
      case 'created_on': return schema.documentProperty.createdOn;
      case 'policy_basis': return schema.documentProperty.policyBasis;
      case 'tags': return schema.documentProperty.tags;
      case 'property_name': return schema.emailPropertyType.propertyName;
      case 'description': return schema.emailPropertyCategory.description;
      case 'email_property_category_id': return schema.emailPropertyCategory.emailPropertyCategoryId;
      case 'opened_date': return schema.callToActionDetails.openedDate;
      case 'closed_date': return schema.callToActionDetails.closedDate;
      case 'compliancy_close_date': return schema.callToActionDetails.compliancyCloseDate;
      case 'completion_percentage': return schema.callToActionDetails.completionPercentage;
      case 'compliance_rating': return schema.callToActionDetails.complianceRating;
      case 'inferred': return schema.callToActionDetails.inferred;
      case 'compliance_date_enforceable': return schema.callToActionDetails.complianceDateEnforceable;
      case 'reasonable_request': return schema.callToActionDetails.reasonableRequest;
      case 'reasonable_reasons': return schema.callToActionDetails.reasonableReasons;
      case 'sentiment': return schema.callToActionDetails.sentiment;
      case 'sentiment_reasons': return schema.callToActionDetails.sentimentReasons;
      case 'compliance_rating_reasons': return schema.callToActionDetails.complianceRatingReasons;
      case 'severity': return schema.callToActionDetails.severity;
      case 'severity_reason': return schema.callToActionDetails.severityReason;
      case 'title_ix_applicable': return schema.callToActionDetails.titleIxApplicable;
      case 'title_ix_applicable_reasons': return schema.callToActionDetails.titleIxApplicableReasons;
      case 'closure_actions': return schema.callToActionDetails.closureActions;
      default: return undefined;
    }
  };

  // Record mapper to transform database records to CallToActionDetails objects
  const recordMapper = (record: Record<string, unknown>): Partial<CallToActionDetails> => {
    const parseNullableDate = (dateString: unknown): Date | null => {
      return dateString ? new Date(Date.parse(dateString as string)) : null;
    };

    return {
      propertyId: record.propertyId as string,
      documentId: record.documentId as number,
      createdOn: new Date(Date.parse(record.createdOn as string)),
      policy_basis: record.policyBasis as string[],
      tags: record.tags as string[],
      opened_date: parseNullableDate(record.openedDate),
      closed_date: parseNullableDate(record.closedDate),
      compliancy_close_date: parseNullableDate(record.compliancyCloseDate),
      completion_percentage: record.completionPercentage as number | undefined,
      complianceRating: record.complianceRating as number | null,
      inferred: record.inferred as boolean,
      complianceDateEnforceable: parseNullableDate(record.complianceDateEnforceable),
      reasonableRequest: record.reasonableRequest as boolean | null,
      reasonableReasons: record.reasonableReasons as string[],
      sentiment: record.sentiment as number | null,
      sentimentReasons: record.sentimentReasons as string[],
      complianceRatingReasons: record.complianceRatingReasons as string[],
      severity: record.severity as number | null,
      severityReason: record.severityReason as string | null,
      titleIxApplicable: record.titleIxApplicable as boolean | null,
      titleIxApplicableReasons: record.titleIxApplicableReasons as string[],
      closureActions: record.closureActions as string[],
      value: record.propertyValue as string, // Map propertyValue to value field
    };
  };

  // Use selectForGrid to apply filtering, sorting, and pagination
  const result = await selectForGrid<Partial<CallToActionDetails>>({
    req,
    emailId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: baseQuery as any,
    getColumn,
    columnMap,
    recordMapper,
  });

  return Response.json(result);
}