import { buildFallbackGrid, wrapRouteRequest, extractParams, } from '@/lib/nextjs-util/server/utils';
import { eq, and } from 'drizzle-orm';
import { drizDbWithInit } from '@compliance-theater/database/orm';
import { schema } from '@compliance-theater/database/orm';
import { checkCaseFileAuthorization, CaseFileScope, } from '@/lib/auth/resources/case-file';
import { selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers';
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
        propertyName: schema.emailPropertyType.propertyName,
        description: schema.emailPropertyCategory.description,
        emailPropertyCategoryId: schema.emailPropertyCategory.emailPropertyCategoryId,
        sentimentScore: schema.emailSentimentAnalysisDetails.sentimentScore,
        detectedHostility: schema.emailSentimentAnalysisDetails.detectedHostility,
        flaggedPhrases: schema.emailSentimentAnalysisDetails.flaggedPhrases,
        detectedOn: schema.emailSentimentAnalysisDetails.detectedOn,
    })
        .from(schema.documentProperty)
        .innerJoin(schema.emailSentimentAnalysisDetails, eq(schema.emailSentimentAnalysisDetails.propertyId, schema.documentProperty.propertyId))
        .innerJoin(schema.emailPropertyType, eq(schema.emailPropertyType.documentPropertyTypeId, schema.documentProperty.documentPropertyTypeId))
        .innerJoin(schema.emailPropertyCategory, eq(schema.emailPropertyCategory.emailPropertyCategoryId, schema.emailPropertyType.emailPropertyCategoryId))
        .innerJoin(schema.documentUnits, eq(schema.documentUnits.unitId, schema.documentProperty.documentId))
        .where(and(eq(schema.documentUnits.emailId, emailId), eq(schema.emailPropertyType.emailPropertyCategoryId, 8)));
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
            case 'sentiment_score':
                return schema.emailSentimentAnalysisDetails.sentimentScore;
            case 'detected_hostility':
                return schema.emailSentimentAnalysisDetails.detectedHostility;
            case 'flagged_phrases':
                return schema.emailSentimentAnalysisDetails.flaggedPhrases;
            case 'detected_on':
                return schema.emailSentimentAnalysisDetails.detectedOn;
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
            sentimentScore: record.sentimentScore,
            detectedHostility: record.detectedHostility,
            flaggedPhrases: record.flaggedPhrases,
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