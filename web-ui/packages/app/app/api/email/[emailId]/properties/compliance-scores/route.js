import { buildFallbackGrid, wrapRouteRequest, extractParams, } from '@/lib/nextjs-util/server/utils';
import { eq, and } from 'drizzle-orm';
import { drizDbWithInit } from '@compliance-theater/database/orm';
import { schema } from '@compliance-theater/database/orm';
import { checkCaseFileAuthorization, CaseFileScope, } from '@/lib/auth/resources/case-file';
import { getEmailColumn, selectForGrid, } from '@/lib/components/mui/data-grid/queryHelpers';
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
        actionPropertyId: schema.complianceScoresDetails.actionPropertyId,
        complianceScore: schema.complianceScoresDetails.complianceScore,
        violationsFound: schema.complianceScoresDetails.violationsFound,
        responseDelayDays: schema.complianceScoresDetails.responseDelayDays,
        overallGrade: schema.complianceScoresDetails.overallGrade,
        evaluatedOn: schema.complianceScoresDetails.evaluatedOn,
    })
        .from(schema.documentProperty)
        .innerJoin(schema.complianceScoresDetails, eq(schema.complianceScoresDetails.propertyId, schema.documentProperty.propertyId))
        .innerJoin(schema.emailPropertyType, eq(schema.emailPropertyType.documentPropertyTypeId, schema.documentProperty.documentPropertyTypeId))
        .innerJoin(schema.emailPropertyCategory, eq(schema.emailPropertyCategory.emailPropertyCategoryId, schema.emailPropertyType.emailPropertyCategoryId))
        .innerJoin(schema.documentUnits, eq(schema.documentUnits.unitId, schema.documentProperty.documentId))
        .where(and(eq(schema.documentUnits.emailId, emailId), eq(schema.emailPropertyType.emailPropertyCategoryId, 6)));
    const getColumn = (columnName) => {
        return getEmailColumn({
            columnName,
            table: schema.complianceScoresDetails,
        });
    };
    const recordMapper = (record) => {
        return {
            propertyId: record.propertyId,
            documentId: record.documentId,
            createdOn: new Date(Date.parse(record.createdOn)),
            policy_basis: record.policyBasis,
            tags: record.tags,
            actionPropertyId: record.actionPropertyId,
            complianceScore: record.complianceScore,
            violationsFound: record.violationsFound,
            responseDelayDays: record.responseDelayDays,
            overallGrade: record.overallGrade,
            evaluatedOn: new Date(Date.parse(record.evaluatedOn)),
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