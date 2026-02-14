import { buildFallbackGrid, wrapRouteRequest, extractParams, } from '@/lib/nextjs-util/server/utils';
import { getEmailColumn, selectForGrid, } from '@/lib/components/mui/data-grid/server';
import { drizDbWithInit, schema } from '@compliance-theater/database/orm';
import { and, eq } from 'drizzle-orm';
import { checkCaseFileAuthorization, CaseFileScope, } from '@/lib/auth/resources/case-file';
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
    })
        .from(schema.documentProperty)
        .innerJoin(schema.emailPropertyType, eq(schema.emailPropertyType.documentPropertyTypeId, schema.documentProperty.documentPropertyTypeId))
        .innerJoin(schema.emailPropertyCategory, eq(schema.emailPropertyCategory.emailPropertyCategoryId, schema.emailPropertyType.emailPropertyCategoryId))
        .innerJoin(schema.documentUnits, eq(schema.documentUnits.unitId, schema.documentProperty.documentId))
        .where(and(eq(schema.documentUnits.emailId, emailId), eq(schema.emailPropertyType.emailPropertyCategoryId, 1)));
    const getColumn = (columnName) => {
        if (columnName === 'typeName') {
            return schema.emailPropertyType.propertyName;
        }
        return getEmailColumn({ columnName, table: schema.documentProperty });
    };
    const recordMapper = (record) => {
        return {
            propertyId: record.propertyId,
            typeName: record.propertyName,
            documentId: record.documentId,
            createdOn: new Date(Date.parse(record.createdOn)),
            policy_basis: record.policyBasis,
            tags: record.tags,
            categoryName: record.description,
            value: record.propertyValue,
        };
    };
    const result = await selectForGrid({
        req,
        query: baseQuery,
        getColumn,
        recordMapper,
    });
    return Response.json(result);
}, { buildFallback: buildFallbackGrid });
//# sourceMappingURL=route.js.map