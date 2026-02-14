import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';
const LOCAL_FETCH = Symbol('@no-education/nextjs-util/dynamic-fetch/fetch');
const loadFetchFactory = () => {
    if (typeof window === 'undefined' && process.env.NEXT_RUNTIME === 'nodejs') {
        const serverFetchFactory = async () => {
            const serverFetch = await import('./server/fetch');
            return serverFetch.fetch;
        };
        return serverFetchFactory;
    }
    else {
        const clientFetchFactory = async () => {
            const clientFetch = await import('./fetch');
            return clientFetch.fetch;
        };
        return clientFetchFactory;
    }
};
export const localFetch = async (...args) => {
    const fetch = await SingletonProvider.Instance.getOrCreateAsync(LOCAL_FETCH, loadFetchFactory());
    if (!fetch) {
        throw new Error('Fetch not found');
    }
    return fetch(...args);
};
export { localFetch as fetch };
//# sourceMappingURL=dynamic-fetch.js.map