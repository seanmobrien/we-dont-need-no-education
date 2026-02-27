import type { IFetchService } from '@compliance-theater/types';
import { resolveService } from '@compliance-theater/types/dependency-injection';

type FetchFn = IFetchService['fetch'];

export const resolveFetchService = (): FetchFn => {
    try {
        const service = resolveService('fetch-service');
        if (service && typeof service.fetch === 'function') {
            return service.fetch.bind(service);
        }
    } catch {
        // no-op
    }

    if (typeof globalThis.fetch === 'function') {
        return globalThis.fetch.bind(globalThis) as FetchFn;
    }

    throw new Error('fetch-service is not registered and global fetch is unavailable');
};
