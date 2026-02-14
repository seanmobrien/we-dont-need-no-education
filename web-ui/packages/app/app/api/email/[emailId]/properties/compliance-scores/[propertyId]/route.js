import { RepositoryCrudController } from '@/lib/api/repository-crud-controller';
import { ComplianceScoresDetailsRepository } from '@/lib/api/email/properties/compliance-scores/compliance-scores-details-repository';
import { buildFallbackGrid, wrapRouteRequest, extractParams, } from '@/lib/nextjs-util/server/utils';
import { CaseFileScope } from '@/lib/auth/resources/case-file/case-file-resource';
import { checkCaseFileAuthorization } from '@/lib/auth/resources/case-file/case-file-middleware';
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
    const controller = new RepositoryCrudController(new ComplianceScoresDetailsRepository());
    return controller.get(req, args);
}, { buildFallback: buildFallbackGrid });
export const PUT = wrapRouteRequest(async (req, args) => {
    const { emailId } = await extractParams(args);
    const authCheck = await checkCaseFileAuthorization(req, emailId, {
        requiredScope: CaseFileScope.WRITE,
    });
    if (!authCheck.authorized) {
        return (authCheck.response ??
            unauthorizedServiceResponse({ req, scopes: ['case-file:write'] }));
    }
    const controller = new RepositoryCrudController(new ComplianceScoresDetailsRepository());
    return controller.update(req, args);
});
export const DELETE = wrapRouteRequest(async (req, args) => {
    const { emailId } = await extractParams(args);
    const authCheck = await checkCaseFileAuthorization(req, emailId, {
        requiredScope: CaseFileScope.WRITE,
    });
    if (!authCheck.authorized) {
        return (authCheck.response ??
            unauthorizedServiceResponse({ req, scopes: ['case-file:write'] }));
    }
    const controller = new RepositoryCrudController(new ComplianceScoresDetailsRepository());
    return controller.delete(req, args);
});
//# sourceMappingURL=route.js.map