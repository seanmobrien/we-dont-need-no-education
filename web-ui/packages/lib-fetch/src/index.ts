import type { RequestInfo, RequestInit } from './server/fetch/fetch-types';
import type { IFetchService } from '@compliance-theater/types/lib/fetch';
import {
    asValue,
    registerServices,
} from '@compliance-theater/types/dependency-injection';

type RuntimeFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

let runtimeFetchPromise: Promise<RuntimeFetch> | undefined;

const isNodeRuntime = (): boolean => {
    return (
        typeof process !== 'undefined' &&
        typeof process.getBuiltinModule === 'function' &&
        typeof window === 'undefined'
    );
};

const loadRuntimeFetch = async (): Promise<RuntimeFetch> => {
    if (isNodeRuntime()) {
        const mod = await import('./server/fetch');
        return mod.fetch as RuntimeFetch;
    }

    const mod = await import('./fetch');
    return mod.fetch as RuntimeFetch;
};

const getRuntimeFetch = async (): Promise<RuntimeFetch> => {
    runtimeFetchPromise ??= loadRuntimeFetch();
    return runtimeFetchPromise;
};

export const fetch = async (
    input: RequestInfo,
    init?: RequestInit,
): Promise<Response> => {
    const impl = await getRuntimeFetch();
    return impl(input, init);
};

export const fetchService: IFetchService = {
    fetch: async (input, init) => fetch(input, init as RequestInit),
};

registerServices({
    'fetch-service': asValue(fetchService),
});

export type { RequestInfo, RequestInit, FetchConfig } from './server/fetch/fetch-types';
export {
    fetchConfig,
    fetchConfigSync,
    configureFetchConfig,
    resetFetchConfig,
} from './server/fetch/fetch-config';
