import type { AnyRecord, CachedToken, ToolArgs } from "./types";
export type RefreshRemoteToken = (reason: string) => Promise<CachedToken>;
export declare function remoteNotification(method: string, params: ToolArgs | undefined, refreshToken: RefreshRemoteToken): Promise<void>;
export declare function remoteRequest(method: string, params: ToolArgs | undefined, refreshToken: RefreshRemoteToken): Promise<AnyRecord>;
export declare function clearRemoteState(): Promise<string | undefined>;
//# sourceMappingURL=remote.d.ts.map