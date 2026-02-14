import { MemoryClient } from './lib/client/mem0';
import { fromRequest } from '@/lib/auth/impersonation';
import { env } from '@compliance-theater/env';
import { log } from '@compliance-theater/logger';
class SchoolLawyerMemoryClient extends MemoryClient {
    defaultOptions;
    constructor({ defaults, projectId, orgId, ...ops }) {
        super({
            ...ops,
            projectId: (projectId ? projectId : env('MEM0_PROJECT_ID')) ?? undefined,
            organizationId: (orgId ? orgId : env('MEM0_ORG_ID')) ?? undefined,
            host: env('MEM0_API_HOST'),
        });
        this.defaultOptions = {
            ...(defaults ?? {}),
        };
    }
    _preparePayload(messages, options) {
        return super._preparePayload(messages, {
            ...this.defaultOptions,
            ...options,
        });
    }
    _prepareParams(options) {
        return super._prepareParams({
            ...this.defaultOptions,
            ...options,
        });
    }
    async healthCheck(params = {}) {
        const { strict = false, verbose = 1 } = params;
        const searchParams = new URLSearchParams({
            strict: strict.toString(),
            verbose: verbose.toString(),
        });
        const url = `stats/health-check?${searchParams.toString()}`;
        try {
            const response = await this._fetchWithErrorHandling(url, {
                method: 'GET',
                headers: this.headers,
            });
            return response;
        }
        catch (error) {
            log((l) => l.error('Memory health check failed', { error, url }));
            throw error;
        }
    }
}
export const memoryClientFactory = async (options) => {
    const clientOps = {
        ...options,
    };
    if (!options.impersonation) {
        const impersonateService = await fromRequest({});
        if (impersonateService) {
            clientOps.impersonation = impersonateService;
        }
    }
    const ret = new SchoolLawyerMemoryClient(clientOps);
    return ret;
};
//# sourceMappingURL=memoryclient-factory.js.map