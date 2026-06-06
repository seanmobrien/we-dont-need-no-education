import { LRUCache } from "lru-cache";
import type { AnyRecord, ToolArgs } from "./types";
export type QueryVectorModelSize = "large" | "small";
export type QueryVectorFetcher = (text: string, modelSize: QueryVectorModelSize) => Promise<AnyRecord>;
export type QueryVectorLogger = (message: string, details?: unknown) => void;
export declare function createQueryVectorCache(maxEntries: number, ttlMs: number): LRUCache<string, Promise<AnyRecord>>;
export declare function createCachedQueryVectorGenerator(fetchQueryVectors: QueryVectorFetcher, cache: LRUCache<string, Promise<AnyRecord>>, log?: QueryVectorLogger): QueryVectorFetcher;
export declare function queryVectorFromEmbeddingResult(result: AnyRecord, source: string): number[];
export declare function materializeGraphVectorParams(args: ToolArgs | undefined, generateQueryVectors: QueryVectorFetcher): Promise<ToolArgs>;
//# sourceMappingURL=vector-params.d.ts.map