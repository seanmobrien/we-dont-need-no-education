import { buildFallbackGrid, wrapRouteRequest, extractParams } from '@/lib/nextjs-util/server/utils';
import { eq, and } from 'drizzle-orm';
import { drizDbWithInit } from '@compliance-theater/database/orm';
import { schema } from '@compliance-theater/database/orm';
import { selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers';
import { DefaultDrizzleEmailColumnMap } from '@/lib/components/mui/data-grid/server';
import { checkCaseFileAuthorization, CaseFileScope, } from '@/lib/auth/resources/case-file';
const columnMap = {
    ...DefaultDrizzleEmailColumnMap,
};
export const dynamic = 'force-dynamic';
export const GET = wrapRouteRequest(async (req, args) => {
    const { emailId } = await extractParams(args);
    const authCheck = await checkCaseFileAuthorization(req, emailId, {
        requiredScope: CaseFileScope.READ,
    });
    if (!authCheck.authorized) {
        return authCheck.response;
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
        .innerJoin(schema.violationDetails, eq(schema.violationDetails.propertyId, schema.documentProperty.propertyId))
        .innerJoin(schema.emailPropertyType, eq(schema.emailPropertyType.documentPropertyTypeId, schema.documentProperty.documentPropertyTypeId))
        .innerJoin(schema.emailPropertyCategory, eq(schema.emailPropertyCategory.emailPropertyCategoryId, schema.emailPropertyType.emailPropertyCategoryId))
        .innerJoin(schema.documentUnits, eq(schema.documentUnits.unitId, schema.documentProperty.documentId))
        .where(and(eq(schema.documentUnits.emailId, emailId), eq(schema.emailPropertyType.emailPropertyCategoryId, 7)));
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
    const recordMapper = (record) => {
        return {
            propertyId: record.propertyId,
            documentId: record.documentId,
            createdOn: new Date(Date.parse(record.createdOn)),
            policy_basis: record.policyBasis,
            tags: record.tags,
            attachmentId: null,
            keyPointPropertyId: null,
            actionPropertyId: null,
            violationType: record.violationType,
            severityLevel: record.severityLevel,
            detectedBy: record.detectedBy,
            detectedOn: new Date(Date.parse(record.detectedOn)),
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