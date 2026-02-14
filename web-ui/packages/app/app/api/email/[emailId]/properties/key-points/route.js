import { buildFallbackGrid, wrapRouteRequest, extractParams, } from '@/lib/nextjs-util/server/utils';
import { drizDbWithInit } from '@compliance-theater/database/orm';
import { schema } from '@compliance-theater/database/orm';
import { selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers';
import { buildDrizzleAttachmentOrEmailFilter } from '@/lib/components/mui/data-grid/queryHelpers';
import { checkCaseFileAuthorization, CaseFileScope, } from '@/lib/auth/resources/case-file';
import { unauthorizedServiceResponse } from '@/lib/nextjs-util/server/unauthorized-service-response';
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
        .select()
        .from(schema.keyPoints)
        .where(buildDrizzleAttachmentOrEmailFilter({
        attachments: req,
        email_id: emailId,
        email_id_column: schema.keyPoints.emailId,
        document_id_column: schema.keyPoints.documentId,
    }));
    const getColumn = (columnName) => {
        switch (columnName) {
            case 'property_id':
                return schema.keyPoints.propertyId;
            case 'email_id':
                return schema.keyPoints.emailId;
            case 'document_id':
                return schema.keyPoints.documentId;
            case 'relevance':
                return schema.keyPoints.relevance;
            case 'compliance':
                return schema.keyPoints.compliance;
            case 'severity_ranking':
                return schema.keyPoints.severityRanking;
            case 'value':
                return schema.keyPoints.propertyValue;
            case 'created_on':
                return schema.keyPoints.sentTimestamp;
            case 'tags':
                return schema.keyPoints.tags;
            case 'policy_basis':
                return schema.keyPoints.policyBasis;
            default:
                return columnName in schema.keyPoints
                    ? schema.keyPoints[columnName]
                    : undefined;
        }
    };
    const recordMapper = (record) => {
        return {
            propertyId: record.propertyId,
            documentId: record.documentId,
            createdOn: record.createdOn
                ? new Date(Date.parse(record.createdOn))
                : new Date(),
            relevance: record.relevance,
            compliance: record.compliance,
            severity: record.severityRanking,
            inferred: record.inferred,
            value: record.propertyValue,
            policy_basis: record.policyBasis,
            tags: record.tags,
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