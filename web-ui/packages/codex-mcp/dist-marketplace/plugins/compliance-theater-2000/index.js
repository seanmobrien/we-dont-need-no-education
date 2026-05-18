"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.packageDescription = exports.packageName = exports.mcpConfig = exports.pluginManifest = void 0;
const plugin_json_1 = __importDefault(require("./.codex-plugin/plugin.json"));
const _mcp_json_1 = __importDefault(require("./.mcp.json"));
exports.pluginManifest = plugin_json_1.default;
exports.mcpConfig = _mcp_json_1.default;
exports.packageName = '@compliance-theater/codex-mcp';
exports.packageDescription = 'Codex plugin for MCP authentication and resource access.';
//# sourceMappingURL=index.js.map