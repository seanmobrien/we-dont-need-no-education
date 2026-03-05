/* global URL, RequestInfo, RequestInit, Response */

export type IFetchService = {
    fetch: (input: string | URL | RequestInfo, init?: RequestInit) => Promise<Response>;
};
