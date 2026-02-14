import { wrapRouteRequest, buildFallbackGrid, } from '@/lib/nextjs-util/server/utils';
import { extractParams } from '@/lib/nextjs-util/server/utils';
import { eq, and, sql } from 'drizzle-orm';
import { drizDbWithInit, schema } from '@compliance-theater/database/orm';
import { checkCaseFileAuthorization, CaseFileScope, } from '@/lib/auth/resources/case-file';
import { buildDrizzleAttachmentOrEmailFilter, getEmailColumn, selectForGrid, } from '@/lib/components/mui/data-grid/queryHelpers';
import { unauthorizedServiceResponse } from '@/lib/nextjs-util/server/unauthorized-service-response';
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
        propertyName: schema.emailPropertyType.propertyName,
        description: schema.emailPropertyCategory.description,
        emailPropertyCategoryId: schema.emailPropertyCategory.emailPropertyCategoryId,
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
        compliance_average_chapter_13: sql `(
        SELECT AVG(${schema.callToActionDetailsCallToActionResponse.complianceChapter13}) 
        FROM ${schema.callToActionDetailsCallToActionResponse} 
        WHERE ${schema.callToActionDetailsCallToActionResponse.callToActionId} = ${schema.callToActionDetails.propertyId}
      )`.as('compliance_average_chapter_13'),
        compliance_chapter_13_reasons: sql `(
        SELECT array_agg(reasons_raw_chapter_13) AS compliance_chapter_13_reasons 
        FROM (
          SELECT UNNEST(${schema.callToActionDetailsCallToActionResponse.complianceChapter13Reasons}) AS reasons_raw_chapter_13
          FROM ${schema.callToActionDetailsCallToActionResponse}
          WHERE ${schema.callToActionDetailsCallToActionResponse.callToActionId} = ${schema.callToActionDetails.propertyId}
        ) sub
      )`.as('compliance_chapter_13_reasons'),
    })
        .from(schema.documentProperty)
        .innerJoin(schema.callToActionDetails, eq(schema.callToActionDetails.propertyId, schema.documentProperty.propertyId))
        .innerJoin(schema.emailPropertyType, eq(schema.emailPropertyType.documentPropertyTypeId, schema.documentProperty.documentPropertyTypeId))
        .innerJoin(schema.emailPropertyCategory, eq(schema.emailPropertyCategory.emailPropertyCategoryId, schema.emailPropertyType.emailPropertyCategoryId))
        .innerJoin(schema.documentUnits, eq(schema.documentUnits.unitId, schema.documentProperty.documentId))
        .where(and(eq(schema.documentProperty.documentPropertyTypeId, 4), buildDrizzleAttachmentOrEmailFilter({
        attachments: req,
        email_id: emailId,
        email_id_column: schema.documentUnits.emailId,
        document_id_column: schema.documentProperty.documentId,
    })));
    const recordMapper = (record) => {
        return {
            propertyId: record.propertyId,
            documentId: record.documentId,
            createdOn: new Date(Date.parse(record.createdOn)),
            policy_basis: record.policyBasis,
            tags: record.tags,
            opened_date: record.openedDate,
            closed_date: record.closedDate,
            compliancy_close_date: record.compliancyCloseDate,
            completion_percentage: Number(record.completionPercentage),
            compliance_rating: record.complianceRating,
            inferred: record.inferred,
            compliance_date_enforceable: record.complianceDateEnforceable,
            reasonable_request: record.reasonableRequest,
            reasonable_reasons: record.reasonableReasons,
            sentiment: record.sentiment,
            sentiment_reasons: record.sentimentReasons,
            compliance_rating_reasons: record.complianceRatingReasons,
            severity: record.severity,
            severity_reason: record.severityReason,
            title_ix_applicable: record.titleIxApplicable,
            title_ix_applicable_reasons: record.titleIxApplicableReasons,
            closure_actions: record.closureActions,
            value: record.propertyValue,
            compliance_average_chapter_13: record.compliance_average_chapter_13,
            compliance_chapter_13_reasons: record.compliance_chapter_13_reasons,
        };
    };
    const result = await selectForGrid({
        req,
        query: baseQuery,
        getColumn: (columnName) => getEmailColumn({ columnName, table: schema.callToActionDetails }),
        recordMapper,
    });
    return Response.json(result);
}, { buildFallback: buildFallbackGrid });
//# sourceMappingURL=route.js.map