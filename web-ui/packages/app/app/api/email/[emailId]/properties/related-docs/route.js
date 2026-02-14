export const dynamic = 'force-dynamic';
import { buildFallbackGrid, wrapRouteRequest, extractParams, } from '@/lib/nextjs-util/server/utils';
import { eq, and } from 'drizzle-orm';
import { drizDbWithInit } from '@compliance-theater/database/orm';
import { schema } from '@compliance-theater/database/orm';
import { checkCaseFileAuthorization, CaseFileScope, } from '@/lib/auth/resources/case-file';
import { selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers';
import { buildDrizzleAttachmentOrEmailFilter } from '@/lib/components/mui/data-grid/queryHelpers';
import { DefaultEmailColumnMap } from '@/lib/components/mui/data-grid/server';
import { unauthorizedServiceResponse } from '@/lib/nextjs-util/server/unauthorized-service-response';
const columnMap = {
    ...DefaultEmailColumnMap,
};
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
    const getColumn = (columnName) => {
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
            case 'opened_date':
                return schema.callToActionDetails.openedDate;
            case 'closed_date':
                return schema.callToActionDetails.closedDate;
            case 'compliancy_close_date':
                return schema.callToActionDetails.compliancyCloseDate;
            case 'completion_percentage':
                return schema.callToActionDetails.completionPercentage;
            case 'compliance_rating':
                return schema.callToActionDetails.complianceRating;
            case 'inferred':
                return schema.callToActionDetails.inferred;
            case 'compliance_date_enforceable':
                return schema.callToActionDetails.complianceDateEnforceable;
            case 'reasonable_request':
                return schema.callToActionDetails.reasonableRequest;
            case 'reasonable_reasons':
                return schema.callToActionDetails.reasonableReasons;
            case 'sentiment':
                return schema.callToActionDetails.sentiment;
            case 'sentiment_reasons':
                return schema.callToActionDetails.sentimentReasons;
            case 'compliance_rating_reasons':
                return schema.callToActionDetails.complianceRatingReasons;
            case 'severity':
                return schema.callToActionDetails.severity;
            case 'severity_reason':
                return schema.callToActionDetails.severityReason;
            case 'title_ix_applicable':
                return schema.callToActionDetails.titleIxApplicable;
            case 'title_ix_applicable_reasons':
                return schema.callToActionDetails.titleIxApplicableReasons;
            case 'closure_actions':
                return schema.callToActionDetails.closureActions;
            default:
                return undefined;
        }
    };
    const recordMapper = (record) => {
        const parseNullableDate = (dateString) => {
            return dateString ? new Date(Date.parse(dateString)) : null;
        };
        return {
            propertyId: record.propertyId,
            documentId: record.documentId,
            createdOn: new Date(Date.parse(record.createdOn)),
            policy_basis: record.policyBasis,
            tags: record.tags,
            opened_date: parseNullableDate(record.openedDate),
            closed_date: parseNullableDate(record.closedDate),
            compliancy_close_date: parseNullableDate(record.compliancyCloseDate),
            completion_percentage: record.completionPercentage,
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