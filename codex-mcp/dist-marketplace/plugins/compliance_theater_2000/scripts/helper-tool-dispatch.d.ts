import type { AnyRecord, CachedToken, JsonToolResult, ToolArgs, ToolDefinition, Toolset } from "./types";
export type HelperToolDispatchDeps = {
    callNeo4jGraphTool: (name: string, args?: ToolArgs) => Promise<AnyRecord>;
    clearCachedToken: () => Promise<string>;
    formatAbilities: (tools: ToolDefinition[], resources: AnyRecord[], templates: AnyRecord[]) => string;
    formatResourceDirectory: (resources: AnyRecord[], templates: AnyRecord[]) => string;
    freshTokenAfterBadRequest: (reason: string) => Promise<CachedToken>;
    listResourceTemplates: () => Promise<AnyRecord[]>;
    listResources: () => Promise<AnyRecord[]>;
    listTools: () => ToolDefinition[];
    remoteRequest: (method: string, params?: ToolArgs) => Promise<AnyRecord>;
    toolset: Toolset;
};
export type HelperToolDispatchResult = {
    result: JsonToolResult | AnyRecord;
} | {
    error: {
        code: number;
        message: string;
    };
};
export declare function dispatchHelperTool(localName: string, args: ToolArgs | undefined, deps: HelperToolDispatchDeps): Promise<HelperToolDispatchResult>;
//# sourceMappingURL=helper-tool-dispatch.d.ts.map