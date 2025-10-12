import { NextRequest } from 'next/server';
import {
  buildFallbackGrid,
  wrapRouteRequest,
} from '@/lib/nextjs-util/server/utils';
import { extractParams } from '@/lib/nextjs-util/utils';
import { ViolationDetails } from '@/data-models/api/email-properties/extended-properties';
import { eq, and } from 'drizzle-orm';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { schema } from '@/lib/drizzle-db/schema';
import { selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers';
import { DefaultDrizzleEmailColumnMap } from '@/lib/components/mui/data-grid/server';
import { PgColumn } from 'drizzle-orm/pg-core';

const columnMap = {
  ...DefaultDrizzleEmailColumnMap,
} as const;

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

        // From violation_details (vd)
        emailDocumentId: schema.violationDetails.emailDocumentId,
        violationType: schema.violationDetails.violationType,
        severityLevel: schema.violationDetails.severityLevel,
        detectedBy: schema.violationDetails.detectedBy,
        detectedOn: schema.violationDetails.detectedOn,
        violationReasons: schema.violationDetails.violationReasons,
        titleIxRelevancy: schema.violationDetails.titleIxRelevancy,
        chapt13Relevancy: schema.violationDetails.chapt13Relevancy,
        ferpaRelevancy: schema.violationDetails.ferpaRelevancy,
        otherRelevancy: schema.violationDetails.otherRelevancy,
        severityReasons: schema.violationDetails.severityReasons,
      })
      .from(schema.documentProperty)
      .innerJoin(
        schema.violationDetails,
        eq(
          schema.violationDetails.propertyId,
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
          eq(schema.emailPropertyType.emailPropertyCategoryId, 7),
        ),
      );

    // Column getter function for filtering and sorting
    const getColumn = (columnName: string): PgColumn | undefined => {
      switch (columnName) {
        case 'property_id':
          return schema.documentProperty.propertyId;
        case 'property_value':
          return schema.documentProperty.propertyValue;
        case 'document_property_type_id':
          return schema.documentProperty.documentPropertyTypeId;
        case 'document_id':
          return schema.documentProperty.documentId;
        case 'created_on':
          return schema.documentProperty.createdOn;
        case 'policy_basis':
          return schema.documentProperty.policyBasis;
        case 'tags':
          return schema.documentProperty.tags;
        case 'property_name':
          return schema.emailPropertyType.propertyName;
        case 'description':
          return schema.emailPropertyCategory.description;
        case 'email_property_category_id':
          return schema.emailPropertyCategory.emailPropertyCategoryId;
        case 'email_document_id':
          return schema.violationDetails.emailDocumentId;
        case 'violation_type':
          return schema.violationDetails.violationType;
        case 'severity_level':
          return schema.violationDetails.severityLevel;
        case 'detected_by':
          return schema.violationDetails.detectedBy;
        case 'detected_on':
          return schema.violationDetails.detectedOn;
        case 'violation_reasons':
          return schema.violationDetails.violationReasons;
        case 'title_ix_relevancy':
          return schema.violationDetails.titleIxRelevancy;
        case 'chapt_13_relevancy':
          return schema.violationDetails.chapt13Relevancy;
        case 'ferpa_relevancy':
          return schema.violationDetails.ferpaRelevancy;
        case 'other_relevancy':
          return schema.violationDetails.otherRelevancy;
        case 'severity_reasons':
          return schema.violationDetails.severityReasons;
        default:
          return undefined;
      }
    };

    // Record mapper to transform database records to ViolationDetails objects
    const recordMapper = (
      record: Record<string, unknown>,
    ): Partial<ViolationDetails> => {
      return {
        propertyId: record.propertyId as string,
        documentId: record.documentId as number,
        createdOn: new Date(Date.parse(record.createdOn as string)),
        policy_basis: record.policyBasis as string[],
        tags: record.tags as string[],
        attachmentId: null, // Not available in current schema
        keyPointPropertyId: null, // Not available in current schema
        actionPropertyId: null, // Not available in current schema
        violationType: record.violationType as string,
        severityLevel: record.severityLevel as number,
        detectedBy: record.detectedBy as string,
        detectedOn: new Date(Date.parse(record.detectedOn as string)),
        value: record.propertyValue as string, // Map propertyValue to value field
      };
    };

    // Use selectForGrid to apply filtering, sorting, and pagination
    const result = await selectForGrid<Partial<ViolationDetails>>({
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
