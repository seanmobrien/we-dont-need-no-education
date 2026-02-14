import { OptionsInit } from 'got';
import type { RequestInfo, RequestInit, ServerFetchManager } from './fetch-types';
import { EnhancedFetchConfig } from '@compliance-theater/feature-flags/types';
export interface FetchManagerConfig {
    concurrency: number;
    cacheSize: number;
    streamDetectBuffer: number;
    streamBufferMax: number;
    maxResponseSize: number;
    timeout: EnhancedFetchConfig['timeout'];
}
type RequestInitWithTimeout = Omit<RequestInit, 'timeout'> & {
    timeout?: number | Partial<EnhancedFetchConfig['timeout']>;
};
export declare const normalizeRequestInit: ({ requestInfo, requestInit: { timeout: initTimeout, ...requestInit }, defaults: { timeout: defaultTimeouts, ...defaults }, }: {
    requestInfo: RequestInfo;
    requestInit?: RequestInitWithTimeout;
    defaults?: Partial<OptionsInit>;
}) => [string, OptionsInit];
export declare class FetchManager implements ServerFetchManager {
    #private;
    private cache;
    private inflight;
    private semManager;
    private lastObservedConcurrency;
    private streamDetectBuffer;
    private streamBufferMax;
    private config;
    private cacheStrategies;
    private streamingStrategy;
    private bufferingStrategy;
    private _pendingConfigRefresh;
    private dedupWriteRequests;
    constructor(config?: Partial<FetchManagerConfig>);
    private loadConfig;
    [Symbol.dispose](): void;
    private doGotFetch;
    fetchStream(input: RequestInfo, init?: RequestInitWithTimeout): Promise<Response | import("got").Request>;
    fetch(input: RequestInfo, init?: RequestInitWithTimeout): Promise<Response>;
}
export declare const getFetchManager: () => FetchManager;
export declare const configureFetchManager: (config: Partial<FetchManagerConfig>) => FetchManager;
export declare const resetFetchManager: () => void;
export declare const serverFetch: (input: RequestInfo, init?: RequestInitWithTimeout) => Promise<Response>;
export declare const fetchStream: (input: RequestInfo, init?: RequestInitWithTimeout) => Promise<Response | import("got").Request>;
export {};
//# sourceMappingURL=fetch-server.d.ts.map