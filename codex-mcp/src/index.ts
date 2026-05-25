import pluginManifestJson from './.codex-plugin/plugin.json';
import mcpConfigJson from './mcp/servers.mcp.json';

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

export const pluginManifest: PluginManifest = pluginManifestJson;
export const mcpConfig: McpConfig = mcpConfigJson;

export const packageName = '@compliance-theater/codex-mcp';
export const packageDescription =
	'Codex plugin for MCP authentication and resource access.';
