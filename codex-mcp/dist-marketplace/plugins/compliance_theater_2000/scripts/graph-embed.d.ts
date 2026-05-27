import type { AnyRecord, ToolArgs } from "./types";
import type { QueryVectorFetcher } from "./vector-params";
export type GraphToolCaller = (name: "graph_read" | "graph_write", args: ToolArgs) => Promise<AnyRecord>;
export declare function graphEmbedTool(args: ToolArgs, callGraphTool: GraphToolCaller, generateQueryVectors: QueryVectorFetcher): Promise<AnyRecord>;
//# sourceMappingURL=graph-embed.d.ts.map