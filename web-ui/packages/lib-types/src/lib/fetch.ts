export type IFetchService = {
    fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
};
