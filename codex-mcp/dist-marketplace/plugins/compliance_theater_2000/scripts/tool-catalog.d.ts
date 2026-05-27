import type { ServerName, ToolDefinition, Toolset } from "./types";
export declare const serverNames: ServerName[];
export declare function serverNameForToolset(toolset: Toolset): ServerName;
export declare function prefixedToolName(serverName: ServerName, toolName: string): string;
export declare function unprefixedToolName(toolName: string | undefined): string | undefined;
export declare function prefixToolDefinitions(tools: ToolDefinition[], serverName: ServerName): ToolDefinition[];
export declare const namespaceDescriptions: Record<ServerName, string>;
export declare function exposedHelperToolsForToolset(toolset: Toolset): ToolDefinition[];
export declare function listToolsForToolset(toolset: Toolset): ToolDefinition[];
export declare function namespaceTools(serverName: ServerName): ToolDefinition[];
export declare function namespaceNamesForToolset(toolset: Toolset): ServerName[];
export declare function remoteToolIsCallable(toolset: Toolset, name: string | undefined): boolean;
export declare function upstreamRemoteToolName(toolset: Toolset, name: string | undefined): string | undefined;
export declare function helperToolIsCallable(toolset: Toolset, name: string | undefined): boolean;
//# sourceMappingURL=tool-catalog.d.ts.map