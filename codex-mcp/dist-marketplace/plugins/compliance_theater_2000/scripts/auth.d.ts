import { type AppSession } from "./runtime-utils";
import type { CachedToken, JsonResponse } from "./types";
export declare function acquireToken(options?: {
    ignoreCache?: boolean;
}): Promise<CachedToken>;
export declare function fetchSessionForAppSession(appSession: AppSession): Promise<JsonResponse>;
export declare function authStatusSummary(): Promise<string>;
export declare function loginAndSummarizeStatus(): Promise<string>;
export declare function acquireAppSession(token: CachedToken): Promise<AppSession>;
export declare function resetAuthState(): void;
export declare function authCachePaths(): Array<{
    path: string;
    label: string;
}>;
//# sourceMappingURL=auth.d.ts.map