import { buildFallbackGrid, wrapRouteRequest, } from '@/lib/nextjs-util/server/utils';
import { extractParams } from '@/lib/nextjs-util/server/utils';
import { eq, and, sql } from 'drizzle-orm';
import { drizDbWithInit } from '@compliance-theater/database/orm';
import { schema } from '@compliance-theater/database/orm';
import { checkCaseFileAuthorization, CaseFileScope, } from '@/lib/auth/resources/case-file';
import { getEmailColumn, selectForGrid, } from '@/lib/components/mui/data-grid/queryHelpers';
import { buildDrizzleAttachmentOrEmailFilter } from '@/lib/components/mui/data-grid/queryHelpers';
import { DefaultEmailColumnMap } from '@/lib/components/mui/data-grid/server';
import { unauthorizedServiceResponse } from '@/lib/nextjs-util/server/unauthorized-service-response';
const columnMap = {
    ...DefaultEmailColumnMap,
};
export const dynamic = 'force-dynamic';
export const GET = wrapRouteRequest(async (req, args) => {
    const { emailId } = await extractParams(args);
    const authCheck = await checkCaseFileAuthorization(req, emailId, {
        requiredScope: CaseFileScope.READ,
    });
    if (!authCheck.authorized) {
        return (authCheck.response ??
            unauthorizedServiceResponse({ req, scopes: ['case-file:read'] }));
    }
    const db = await drizDbWithInit();
    const baseQuery = db
        .select({
        propertyId: schema.documentProperty.propertyId,
        propertyValue: schema.documentProperty.propertyValue,
        documentPropertyTypeId: schema.documentProperty.documentPropertyTypeId,
        documentId: schema.documentProperty.documentId,
        createdOn: schema.documentProperty.createdOn,
        policyBasis: schema.documentProperty.policyBasis,
        tags: schema.documentProperty.tags,
        compliance_average_chapter_13: sql `(SELECT AVG("call_to_action_details_call_to_action_response".compliance_chapter_13) FROM "call_to_action_details_call_to_action_response" WHERE "call_to_action_details_call_to_action_response".call_to_action_response_id = "document_property".property_id )`.as('compliance_average_chapter_13'),
        compliance_chapter_13_reasons: sql `(SELECT array_agg(reasons_raw_chapter_13) AS compliance_chapter_13_reasons FROM (
              SELECT UNNEST(car.compliance_chapter_13_reasons) AS reasons_raw_chapter_13
              FROM call_to_action_details_call_to_action_response car
              WHERE car.call_to_action_response_id=document_property.property_id
            ) sub)`.as('compliance_chapter_13_reasons'),
        responseTimestamp: schema.callToActionResponseDetails.responseTimestamp,
        severity: schema.callToActionResponseDetails.severity,
        inferred: schema.callToActionResponseDetails.inferred,
        sentiment: schema.callToActionResponseDetails.sentiment,
        sentimentReasons: schema.callToActionResponseDetails.sentimentReasons,
        severityReasons: schema.callToActionResponseDetails.severityReasons,
    })
        .from(schema.documentProperty)
        .innerJoin(schema.callToActionResponseDetails, eq(schema.callToActionResponseDetails.propertyId, schema.documentProperty.propertyId))
        .innerJoin(schema.documentUnits, eq(schema.documentUnits.unitId, schema.documentProperty.documentId))
        .where(and(eq(schema.documentProperty.documentPropertyTypeId, 5), buildDrizzleAttachmentOrEmailFilter({
        attachments: req,
        email_id: emailId,
        email_id_column: schema.documentUnits.emailId,
        document_id_column: schema.documentProperty.documentId,
    })))
        .groupBy(schema.documentProperty.propertyId, schema.documentProperty.propertyValue, schema.documentProperty.documentPropertyTypeId, schema.documentProperty.documentId, schema.documentProperty.createdOn, schema.documentProperty.policyBasis, schema.documentProperty.tags, schema.callToActionResponseDetails.responseTimestamp, schema.callToActionResponseDetails.severity, schema.callToActionResponseDetails.inferred, schema.callToActionResponseDetails.sentiment, schema.callToActionResponseDetails.sentimentReasons, schema.callToActionResponseDetails.severityReasons);
    const getColumn = (columnName) => getEmailColumn({ columnName, table: schema.callToActionResponseDetails });
    const recordMapper = (record) => {
        return {
            propertyId: record.propertyId,
            documentId: record.documentId,
            createdOn: new Date(Date.parse(record.createdOn)),
            policy_basis: record.policyBasis,
            tags: record.tags,
            responseTimestamp: record.responseTimestamp
                ? new Date(Date.parse(record.responseTimestamp))
                : undefined,
            severity: record.severity,
            inferred: record.inferred,
            sentiment: record.sentiment,
            sentiment_reasons: record.sentimentReasons,
            severity_reasons: record.severityReasons,
            compliance_average_chapter_13: record.compliance_average_chapter_13,
            compliance_chapter_13_reasons: record.compliance_chapter_13_reasons,
            value: record.propertyValue,
        };
    };
    const result = await selectForGrid({
        req,
        query: baseQuery,
        getColumn,
        columnMap,
        recordMapper,
    });
    return Response.json(result);
}, { buildFallback: buildFallbackGrid });
//# sourceMappingURL=route.js.map