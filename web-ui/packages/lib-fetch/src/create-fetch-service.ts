import type { IFetchService } from '@compliance-theater/types/lib/fetch';
import {
    asFunction,
    registerServices,
    resolveService,
} from '@compliance-theater/types/dependency-injection';
import type { ISingletonProvider } from '@compliance-theater/types/lib/logger/singleton-provider';

export type RuntimeFetch = IFetchService['fetch'];

export type CreateFetchOptions = Readonly<{
    runtimeFetch: RuntimeFetch;
    singletonKey?: string;
}>;

const DEFAULT_SINGLETON_KEY = '@compliance-theater/fetch/runtime-fetch';

export const createFetch = ({
    runtimeFetch,
    singletonKey = DEFAULT_SINGLETON_KEY,
}: CreateFetchOptions): RuntimeFetch => (
    input,
    init,
) => {
        const impl = resolveService<ISingletonProvider>('singleton')
            .getOrCreate(singletonKey, () => runtimeFetch);

        if (!impl) {
            throw new Error('Unable to initialize fetch implementation for current runtime.');
        }

        return impl(input, init);
    };

export const createFetchServiceFactory = (
    runtimeFetch: RuntimeFetch,
): (() => IFetchService) => {
    const fetch = createFetch({ runtimeFetch });

    return () => ({
        fetch,
    });
};

export const registerFetchService = (runtimeFetch: RuntimeFetch): void => {
    registerServices({
        'fetch-service': asFunction(createFetchServiceFactory(runtimeFetch)),
    });
};
