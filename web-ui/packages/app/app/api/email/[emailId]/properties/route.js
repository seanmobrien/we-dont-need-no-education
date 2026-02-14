import { parsePaginationStats } from '@/lib/components/mui/data-grid/queryHelpers/utility';
import { RepositoryCrudController } from '@/lib/api/repository-crud-controller';
import { EmailPropertyRepository, mapEmailPropertyRecordToObject, } from '@/lib/api/email/properties/email-property-repository';
import { buildOrderBy } from '@/lib/components/mui/data-grid/server';
import { db } from '@compliance-theater/database/driver';
import { extractParams } from '@/lib/nextjs-util/server/utils';
import { buildFallbackGrid, wrapRouteRequest, } from '@/lib/nextjs-util/server/utils';
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
    const controller = new RepositoryCrudController(new EmailPropertyRepository());
    return controller.listFromRepository(async (r) => {
        return r.innerQuery((q) => q.list((num, page, offset) => db((sql) => sql `SELECT ep.* ,ept.property_name,epc.description, epc.email_property_category_id
            FROM document_property ep
            JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
            JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
            JOIN document_units d ON d.unit_id = ep.document_id
            JOIN email e ON e.email_id = d.email_id
            WHERE e.email_id=${emailId} 
            ${buildOrderBy({ sql, source: req })}
            LIMIT ${num} OFFSET ${offset}`, { transform: mapEmailPropertyRecordToObject }), () => db((sql) => sql `SELECT COUNT(*) AS total FROM document_property WHERE document_property_email(document_property.property_id)=${emailId}`), parsePaginationStats(new URL(req.url))));
    });
}, { buildFallback: buildFallbackGrid });
//# sourceMappingURL=route.js.map