import type { FetchConfig } from './fetch-types';
export declare const FETCH_MANAGER_SINGLETON_KEY = "@noeducation/fetch-manager";
declare class FetchConfigManager {
    #private;
    constructor();
    get value(): Required<FetchConfig>;
    get isStale(): boolean;
    get lastError(): Error | null;
    get ttlRemaining(): number;
    get isInitialized(): boolean;
    forceRefresh(): Promise<Required<FetchConfig>>;
    initialize(): Promise<Required<FetchConfig>>;
}
export declare const fetchConfig: () => Promise<Required<FetchConfig>>;
export declare const fetchConfigSync: () => Required<FetchConfig>;
export declare const forceRefreshFetchConfig: () => Promise<Required<FetchConfig>>;
export declare const getFetchConfigStatus: () => FetchConfigManager;
export default fetchConfig;
//# sourceMappingURL=fetch-config.d.ts.map