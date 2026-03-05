export type IFetchService = {
    fetch: (input: string | URL | RequestInfo, init?: RequestInit) => Promise<Response>;
};
