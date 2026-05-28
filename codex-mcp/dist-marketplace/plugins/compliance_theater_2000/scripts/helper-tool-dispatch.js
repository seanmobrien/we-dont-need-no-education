"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchHelperTool = dispatchHelperTool;
const app_tools_1 = require("./app-tools");
const auth_1 = require("./auth");
const graph_embed_1 = require("./graph-embed");
const helper_tool_schemas_1 = require("./helper-tool-schemas");
const memory_tool_schemas_1 = require("./memory-tool-schemas");
const vector_params_1 = require("./vector-params");
function textToolResult(text) {
    return { content: [{ type: "text", text }] };
}
function jsonToolResult(value) {
    return {
        content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
        structuredContent: { result: value }
    };
}
async function dispatchHelperTool(localName, args = {}, deps) {
    const { callNeo4jGraphTool, clearCachedToken, formatAbilities, formatResourceDirectory, freshTokenAfterBadRequest, listResourceTemplates, listResources, listTools, remoteRequest, toolset, } = deps;
    if (toolset === "memory" && memory_tool_schemas_1.memoryTools.some((tool) => tool.name === localName)) {
        return { result: jsonToolResult(await (0, app_tools_1.callMemoryTool)(localName, args, freshTokenAfterBadRequest)) };
    }
    if (localName === "read_case_file") {
        return { result: jsonToolResult(await (0, app_tools_1.readCaseFileTool)(args, freshTokenAfterBadRequest)) };
    }
    if (localName === "get") {
        return { result: jsonToolResult(await (0, app_tools_1.getCaseFileTool)(args, remoteRequest, freshTokenAfterBadRequest)) };
    }
    if (localName === "amend") {
        return { result: jsonToolResult(await (0, app_tools_1.amendCaseFileTool)(args, remoteRequest)) };
    }
    if (localName === "embed") {
        return { result: jsonToolResult(await (0, app_tools_1.manageCaseFileEmbeddingsTool)(args, freshTokenAfterBadRequest)) };
    }
    if (localName === "graph_embed") {
        const generateQueryVectors = (0, app_tools_1.createGenerateQueryVectors)(freshTokenAfterBadRequest);
        return {
            result: jsonToolResult(await (0, graph_embed_1.graphEmbedTool)(args, callNeo4jGraphTool, generateQueryVectors))
        };
    }
    if (localName in helper_tool_schemas_1.graphToolAliases) {
        const generateQueryVectors = (0, app_tools_1.createGenerateQueryVectors)(freshTokenAfterBadRequest);
        const graphArgs = localName === "graph_read" || localName === "graph_write"
            ? await (0, vector_params_1.materializeGraphVectorParams)(args, generateQueryVectors)
            : args;
        return { result: await callNeo4jGraphTool(localName, graphArgs) };
    }
    if (localName === "call_api") {
        return { result: jsonToolResult(await (0, app_tools_1.callApiTool)(args, freshTokenAfterBadRequest)) };
    }
    if (toolset !== "utils" && memory_tool_schemas_1.memoryTools.some((tool) => tool.name === localName)) {
        return { result: jsonToolResult(await (0, app_tools_1.callMemoryTool)(localName, args, freshTokenAfterBadRequest)) };
    }
    if (localName === "list") {
        const listType = args.type ?? "abilities";
        if (listType === "abilities") {
            const [tools, resources, templates] = await Promise.all([
                Promise.resolve(listTools()),
                listResources().catch(() => []),
                listResourceTemplates().catch(() => [])
            ]);
            return { result: textToolResult(formatAbilities(tools, resources, templates)) };
        }
        if (listType === "resources") {
            const [resources, templates] = await Promise.all([
                listResources().catch(() => []),
                listResourceTemplates().catch(() => [])
            ]);
            return { result: textToolResult(formatResourceDirectory(resources, templates)) };
        }
        return { error: { code: -32602, message: "type must be one of: abilities, resources" } };
    }
    if (localName === "auth") {
        if (args?.action === "clear-cache") {
            return { result: textToolResult(await clearCachedToken()) };
        }
        if (args?.action === "status") {
            return { result: textToolResult(await (0, auth_1.authStatusSummary)()) };
        }
        if (args?.action === "login") {
            return { result: textToolResult(await (0, auth_1.loginAndSummarizeStatus)()) };
        }
        return { error: { code: -32602, message: "action must be one of: status, clear-cache, login" } };
    }
    return { error: { code: -32601, message: `Unknown helper tool ${localName}` } };
}
//# sourceMappingURL=helper-tool-dispatch.js.map