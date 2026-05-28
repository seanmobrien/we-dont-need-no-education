#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_readline_1 = require("node:readline");
const config_1 = require("./config");
const errors_1 = require("./errors");
const auth_1 = require("./auth");
const neo4j_1 = require("./neo4j");
const app_tools_1 = require("./app-tools");
const remote_1 = require("./remote");
const urls_1 = require("./urls");
const helper_tool_schemas_1 = require("./helper-tool-schemas");
const helper_tool_dispatch_1 = require("./helper-tool-dispatch");
const schema_utils_1 = require("./schema-utils");
const tool_catalog_1 = require("./tool-catalog");
function listTools() {
    return (0, tool_catalog_1.listToolsForToolset)((0, config_1.configuredToolset)());
}
async function freshTokenAfterBadRequest(reason) {
    (0, config_1.log)("HTTP 400 received from protected upstream; clearing cached auth and retrying once", { reason });
    try {
        await clearCachedToken();
    }
    catch (error) {
        (0, config_1.log)("could not clear cached token before retrying auth", { message: (0, errors_1.asError)(error).message });
    }
    return (0, auth_1.acquireToken)({ ignoreCache: true });
}
function sendToClient(message) {
    (0, config_1.log)("sending message to client", summarizeMessage(message));
    process.stdout.write(`${JSON.stringify(message)}\n`);
}
function errorResponse(id, code, message) {
    return { jsonrpc: "2.0", id, error: { code, message } };
}
function summarizeMessage(message) {
    if (!message || typeof message !== "object") {
        return { type: typeof message };
    }
    const params = message.params && typeof message.params === "object" ? message.params : {};
    return {
        id: message.id,
        method: message.method,
        hasError: Boolean(message.error),
        errorMessage: message.error?.message,
        toolName: params.name,
        action: params.arguments?.action,
        resultKeys: message.result && typeof message.result === "object" ? Object.keys(message.result) : undefined,
        paramKeys: Object.keys(params)
    };
}
async function remoteNotification(method, params = {}) {
    await (0, remote_1.remoteNotification)(method, params, freshTokenAfterBadRequest);
}
function remoteRequest(method, params = {}) {
    return (0, remote_1.remoteRequest)(method, params, freshTokenAfterBadRequest);
}
async function callNeo4jGraphTool(name, args = {}, retried = false) {
    const upstreamName = helper_tool_schemas_1.graphToolAliases[name];
    if (!upstreamName) {
        throw new Error(`Unknown Neo4j graph tool ${name}.`);
    }
    try {
        return await (0, neo4j_1.callNeo4jMcpTool)(upstreamName, args);
    }
    catch (error) {
        const message = (0, errors_1.asError)(error).message;
        if (!retried && /backend exited|failed to start|EPIPE|closed/i.test(message)) {
            (0, neo4j_1.clearNeo4jState)();
            return callNeo4jGraphTool(name, args, true);
        }
        throw error;
    }
}
function isUnsupportedMethod(error) {
    return String(error?.message || "").toLowerCase().includes("method not found");
}
async function collectPaginated(method, keyName) {
    const items = [];
    let cursor;
    do {
        let result;
        try {
            result = await remoteRequest(method, cursor ? { cursor } : {});
        }
        catch (error) {
            if (isUnsupportedMethod(error)) {
                return [];
            }
            throw error;
        }
        items.push(...(result[keyName] || []));
        cursor = result.nextCursor;
    } while (cursor);
    return items;
}
function toOpenAiFunctionTool(tool) {
    return {
        type: "function",
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema || (0, schema_utils_1.objectSchema)({})
    };
}
function listOpenAiTools() {
    return [
        { type: "tool_search" },
        ...(0, tool_catalog_1.namespaceNamesForToolset)((0, config_1.configuredToolset)()).map((serverName) => ({
            type: "namespace",
            name: serverName,
            description: tool_catalog_1.namespaceDescriptions[serverName],
            tools: (0, tool_catalog_1.namespaceTools)(serverName).map(toOpenAiFunctionTool)
        }))
    ];
}
function remoteToolIsCallable(name) {
    return (0, tool_catalog_1.remoteToolIsCallable)((0, config_1.configuredToolset)(), name);
}
function upstreamRemoteToolName(name) {
    return (0, tool_catalog_1.upstreamRemoteToolName)((0, config_1.configuredToolset)(), name);
}
function helperToolIsCallable(name) {
    return (0, tool_catalog_1.helperToolIsCallable)((0, config_1.configuredToolset)(), name);
}
async function listResources() {
    return collectPaginated("resources/list", "resources");
}
async function listResourceTemplates() {
    return collectPaginated("resources/templates/list", "resourceTemplates");
}
function formatSchema(schema) {
    return schema ? JSON.stringify(schema) : "{}";
}
function formatAbilities(tools, resources, templates) {
    const lines = ["Tools:"];
    for (const tool of tools) {
        lines.push(`- ${tool.name}: ${tool.description || "No description"}`);
        lines.push(`  inputSchema: ${formatSchema(tool.inputSchema)}`);
        if (tool.outputSchema) {
            lines.push(`  outputSchema: ${formatSchema(tool.outputSchema)}`);
        }
    }
    lines.push("");
    lines.push(`Resources: ${resources.length}`);
    lines.push(`Resource templates: ${templates.length}`);
    for (const template of templates) {
        lines.push(`- ${template.uriTemplate}: ${template.name || template.description || "Template"}`);
    }
    return lines.join("\n");
}
function resourcePath(resource) {
    try {
        const parsed = new URL(resource.uri);
        return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    }
    catch {
        return resource.uri;
    }
}
function formatResourceDirectory(resources, templates) {
    const lines = ["Resources:"];
    const sorted = [...resources].sort((a, b) => resourcePath(a).localeCompare(resourcePath(b)));
    if (!sorted.length) {
        lines.push("- No concrete resources exposed.");
    }
    for (const resource of sorted) {
        const name = resource.name ? ` (${resource.name})` : "";
        const mime = resource.mimeType ? ` [${resource.mimeType}]` : "";
        lines.push(`- ${resourcePath(resource)}${name}${mime}`);
        if (resource.description) {
            lines.push(`  ${resource.description}`);
        }
    }
    lines.push("");
    lines.push("Resource templates:");
    if (!templates.length) {
        lines.push("- No resource templates exposed.");
    }
    for (const template of templates) {
        const name = template.name ? ` (${template.name})` : "";
        lines.push(`- ${template.uriTemplate}${name}`);
        if (template.description) {
            lines.push(`  ${template.description}`);
        }
    }
    return lines.join("\n");
}
async function clearCachedToken() {
    const messages = [];
    const remoteMessage = await (0, remote_1.clearRemoteState)();
    const hadNeo4jRemote = (0, neo4j_1.clearNeo4jState)();
    (0, auth_1.resetAuthState)();
    (0, app_tools_1.clearAppToolCaches)();
    if (remoteMessage) {
        messages.push(remoteMessage);
    }
    else {
        messages.push("Cleared in-memory auth/session state.");
    }
    messages.push("Cleared in-memory query vector cache.");
    if (hadNeo4jRemote) {
        messages.push("Closed in-memory Neo4j MCP backend connection.");
    }
    if ((0, config_1.optional)("DISABLE_TOKEN_CACHE") === "1") {
        messages.push("Token cache is disabled by MCP_COMPLIANCE_THEATER_RESOURCE_DISABLE_TOKEN_CACHE=1.");
        return messages.join("\n");
    }
    for (const { path, label } of (0, config_1.credentialCachePaths)()) {
        try {
            await (0, promises_1.rm)(path);
            messages.push(`Removed ${label}: ${path}`);
        }
        catch (error) {
            if ((0, errors_1.asError)(error).code === "ENOENT") {
                messages.push(`No ${label} file found at: ${path}`);
                continue;
            }
            throw error;
        }
    }
    messages.push("Wrapper-managed OAuth tokens, refresh tokens, wrapped Auth.js session tokens, and cookies are cleared.");
    return messages.join("\n");
}
async function callHelperTool(id, name, args = {}) {
    try {
        const localName = (0, tool_catalog_1.unprefixedToolName)(name) || name;
        const outcome = await (0, helper_tool_dispatch_1.dispatchHelperTool)(localName, args, {
            callNeo4jGraphTool,
            clearCachedToken,
            formatAbilities,
            formatResourceDirectory,
            freshTokenAfterBadRequest,
            listResourceTemplates,
            listResources,
            listTools,
            remoteRequest,
            toolset: (0, config_1.configuredToolset)(),
        });
        if ("error" in outcome) {
            sendToClient(errorResponse(id, outcome.error.code, outcome.error.message));
            return;
        }
        sendToClient({ jsonrpc: "2.0", id, result: outcome.result });
    }
    catch (error) {
        sendToClient(errorResponse(id, -32000, (0, errors_1.asError)(error).message));
    }
}
function localInitializeResult(params = {}) {
    return {
        protocolVersion: params.protocolVersion || "2024-11-05",
        capabilities: {
            tools: {},
            resources: {},
            prompts: {}
        },
        serverInfo: {
            name: "compliance_theater_2000",
            version: "0.1.0"
        }
    };
}
async function handleClientRequest(message) {
    (0, config_1.log)("handling client request", summarizeMessage(message));
    if (message.method === "initialize") {
        sendToClient({ jsonrpc: "2.0", id: message.id, result: localInitializeResult(message.params) });
        return;
    }
    if (message.method === "notifications/initialized") {
        return;
    }
    if (message.method === "tools/list") {
        sendToClient({
            jsonrpc: "2.0",
            id: message.id,
            result: {
                tools: listTools(),
                openaiTools: listOpenAiTools()
            }
        });
        return;
    }
    if (message.method === "tools/list_openai" || message.method === "tools/list/openai") {
        sendToClient({ jsonrpc: "2.0", id: message.id, result: { tools: listOpenAiTools() } });
        return;
    }
    if (message.method === "tools/call") {
        const name = message.params?.name;
        if (helperToolIsCallable(name)) {
            await callHelperTool(message.id, name, message.params?.arguments || {});
            return;
        }
        if (!remoteToolIsCallable(name)) {
            sendToClient(errorResponse(message.id, -32601, `Tool ${name || "(missing)"} is not exposed by this plugin.`));
            return;
        }
    }
    if (message.id === undefined) {
        remoteNotification(message.method, message.params || {}).catch((error) => (0, config_1.log)(`remote notification failed: ${error.message}`));
        return;
    }
    try {
        const params = message.method === "tools/call"
            ? {
                ...(message.params || {}),
                name: upstreamRemoteToolName(message.params?.name)
            }
            : (message.params || {});
        const result = await remoteRequest(message.method, params);
        sendToClient({ jsonrpc: "2.0", id: message.id, result });
    }
    catch (error) {
        sendToClient(errorResponse(message.id, -32000, (0, errors_1.asError)(error).message));
    }
}
function bindJsonLines(stream, onMessage, source) {
    const reader = (0, node_readline_1.createInterface)({ input: stream });
    reader.on("line", (line) => {
        if (!line.trim()) {
            return;
        }
        try {
            const message = JSON.parse(line);
            (0, config_1.log)(`received ${source} message`, summarizeMessage(message));
            onMessage(message);
        }
        catch (error) {
            (0, config_1.log)(`could not parse ${source} JSON message: ${(0, errors_1.asError)(error).message}`);
        }
    });
}
async function main() {
    (0, config_1.log)("wrapper starting", { cwd: process.cwd(), node: process.version, argv: process.argv });
    (0, config_1.log)("resolved wrapper configuration", {
        serverUrl: (0, config_1.optional)("SERVER_URL"),
        authIssuer: (0, config_1.optional)("AUTH_ISSUER"),
        wrapUrl: (0, urls_1.wrapEndpointUrl)(),
        sessionStatusUrl: (0, urls_1.sessionEndpointUrl)(),
        tokenCachePath: (0, config_1.cachePath)(),
        logFile: (0, config_1.logFilePath)()
    });
    process.on("SIGINT", () => process.exit(0));
    process.on("SIGTERM", () => process.exit(0));
    bindJsonLines(process.stdin, (message) => {
        handleClientRequest(message).catch((error) => {
            if (message.id !== undefined) {
                sendToClient(errorResponse(message.id, -32000, (0, errors_1.asError)(error).message));
            }
            else {
                (0, config_1.log)((0, errors_1.asError)(error).message);
            }
        });
    }, "client");
}
main().catch((error) => {
    const startupError = (0, errors_1.asError)(error);
    (0, config_1.log)("wrapper startup failed", { message: startupError.message, stack: startupError.stack });
    process.exit(1);
});
//# sourceMappingURL=entrypoint.js.map