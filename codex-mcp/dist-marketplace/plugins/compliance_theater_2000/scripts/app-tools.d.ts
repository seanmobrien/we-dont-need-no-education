import { type QueryVectorFetcher } from "./vector-params";
import type { AnyRecord, CachedToken, ToolArgs } from "./types";
export type RefreshTokenCallback = (reason: string) => Promise<CachedToken>;
export type RemoteRequestCallback = (method: string, params?: ToolArgs) => Promise<AnyRecord>;
export declare function clearAppToolCaches(): void;
export declare function callApiTool(args: ToolArgs | undefined, refreshToken: RefreshTokenCallback): Promise<AnyRecord>;
export declare function readCaseFileTool(args: ToolArgs | undefined, refreshToken: RefreshTokenCallback): Promise<AnyRecord>;
export declare function getCaseFileTool(args: ToolArgs | undefined, remoteRequest: RemoteRequestCallback, refreshToken: RefreshTokenCallback): Promise<AnyRecord>;
export declare function amendCaseFileTool(args: ToolArgs | undefined, remoteRequest: RemoteRequestCallback): Promise<AnyRecord>;
export declare const generateQueryVectorsForApp: QueryVectorFetcher;
export declare function createGenerateQueryVectors(refreshToken: RefreshTokenCallback): QueryVectorFetcher;
export declare function manageCaseFileEmbeddingsTool(args: ToolArgs | undefined, refreshToken: RefreshTokenCallback): Promise<AnyRecord>;
export declare function callMemoryTool(name: string, args: ToolArgs | undefined, refreshToken: RefreshTokenCallback): Promise<AnyRecord>;
//# sourceMappingURL=app-tools.d.ts.map