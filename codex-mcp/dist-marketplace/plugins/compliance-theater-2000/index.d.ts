export type PluginSetting = {
    name: string;
    label?: string;
    description?: string;
    type?: string;
    required?: boolean;
    default?: string;
    env?: string;
    secure?: boolean;
};
export type PluginManifest = {
    name: string;
    version: string;
    description?: string;
    author?: {
        name?: string;
        email?: string;
        url?: string;
    };
    homepage?: string;
    repository?: string;
    license?: string;
    keywords?: string[];
    skills?: string;
    mcpServers?: string;
    settings?: PluginSetting[];
};
export type McpConfig = {
    mcpServers?: Record<string, unknown>;
};
export declare const pluginManifest: PluginManifest;
export declare const mcpConfig: McpConfig;
export declare const packageName = "@compliance-theater/codex-mcp";
export declare const packageDescription = "Codex plugin for MCP authentication and resource access.";
//# sourceMappingURL=index.d.ts.map