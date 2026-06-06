import type { Toolset } from "./types";
export declare function optional(name: string): string | undefined;
export declare function configuredToolset(): Toolset;
export declare function required(name: string): string;
export declare function normalizeServerUrl(value: string): string;
export declare function serverUrl(): string;
export declare function logFilePath(): string;
export declare function log(message: string, details?: unknown): void;
export declare function cachePath(): string;
export declare function neo4jCredentialCachePath(): string;
export declare function credentialCachePaths(): Array<{
    path: string;
    label: string;
}>;
export declare function tokenSkewMs(): number;
export declare function httpTimeoutMs(): number;
export declare function httpRetryCount(): number;
export declare function httpRetryBaseMs(): number;
export declare function proxyRequestTimeoutMs(): number;
export declare function embeddingCacheMaxEntries(): number;
export declare function embeddingCacheTtlMs(): number;
export declare function metadataCandidates(): string[];
//# sourceMappingURL=config.d.ts.map