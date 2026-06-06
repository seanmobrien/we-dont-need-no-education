"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optional = optional;
exports.configuredToolset = configuredToolset;
exports.required = required;
exports.normalizeServerUrl = normalizeServerUrl;
exports.serverUrl = serverUrl;
exports.logFilePath = logFilePath;
exports.log = log;
exports.cachePath = cachePath;
exports.neo4jCredentialCachePath = neo4jCredentialCachePath;
exports.credentialCachePaths = credentialCachePaths;
exports.tokenSkewMs = tokenSkewMs;
exports.httpTimeoutMs = httpTimeoutMs;
exports.httpRetryCount = httpRetryCount;
exports.httpRetryBaseMs = httpRetryBaseMs;
exports.proxyRequestTimeoutMs = proxyRequestTimeoutMs;
exports.embeddingCacheMaxEntries = embeddingCacheMaxEntries;
exports.embeddingCacheTtlMs = embeddingCacheTtlMs;
exports.metadataCandidates = metadataCandidates;
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const errors_1 = require("./errors");
const runtime_utils_1 = require("./runtime-utils");
const PREFIX = "MCP_COMPLIANCE_THEATER_RESOURCE_";
const env = process.env;
let logWriteFailed = false;
const defaultEnvValues = {
    SERVER_URL: "https://full-ui.compliance-theater.obapps.net/api/ai/tools/sse",
    AUTH_ISSUER: "https://login.obapps.net/realms/compliance-theater",
    CLIENT_ID: "codex",
    OAUTH_SCOPE: "openid",
};
const DEFAULT_SSE_PATH = "/api/ai/tools/sse";
function key(name) {
    return `${PREFIX}${name}`;
}
function resolveValue(value) {
    const fallback = /^\$\{[A-Z0-9_]+:-(.*)\}$/.exec(value || "");
    if (fallback) {
        return fallback[1];
    }
    const passthrough = /^\$\{([A-Z0-9_]+)\}$/.exec(value || "");
    if (passthrough) {
        const resolved = env[passthrough[1]];
        return resolved && resolved !== value ? resolved : undefined;
    }
    return value;
}
function optional(name) {
    const resolved = resolveValue(env[key(name)]);
    const value = !resolved || resolved.startsWith("[TODO:")
        ? defaultEnvValues[name]
        : resolved;
    if (!value || value.startsWith("[TODO:")) {
        return undefined;
    }
    return value;
}
function configuredToolset() {
    const value = optional("TOOLSET")?.trim().toLowerCase();
    if (value === "all" ||
        value === "default" ||
        value === "memory" ||
        value === "utils" ||
        value === "todo" ||
        value === "case-workspace" ||
        value === "search" ||
        value === "case-files") {
        return value;
    }
    return "all";
}
function required(name) {
    const value = optional(name);
    if (!value) {
        throw new Error(`Missing required environment variable ${key(name)}`);
    }
    return value;
}
function normalizeServerUrl(value) {
    const parsed = new URL(value);
    if (parsed.pathname === "/" && !parsed.search && !parsed.hash) {
        parsed.pathname = DEFAULT_SSE_PATH;
    }
    return parsed.toString();
}
function serverUrl() {
    return normalizeServerUrl(required("SERVER_URL"));
}
function logFilePath() {
    return optional("LOG_FILE") ||
        (0, node_path_1.join)((0, node_os_1.homedir)(), ".codex", "compliance_theater", "compliance_theater_wrapper.log");
}
function redact(value) {
    if (Array.isArray(value)) {
        return value.map(redact);
    }
    if (!value || typeof value !== "object") {
        return value;
    }
    return Object.fromEntries(Object.entries(value).map(([name, item]) => [
        name,
        /token|secret|password|authorization|credential/i.test(name) ? "[redacted]" : redact(item)
    ]));
}
function log(message, details) {
    console.error(`[compliance_theater] ${message}`);
    const payload = {
        timestamp: new Date().toISOString(),
        pid: process.pid,
        message,
        ...(details ? { details: redact(details) } : {})
    };
    const path = logFilePath();
    try {
        (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(path), { recursive: true });
        (0, node_fs_1.appendFileSync)(path, `${JSON.stringify(payload)}\n`, "utf8");
    }
    catch (error) {
        if (!logWriteFailed) {
            logWriteFailed = true;
            console.error(`[compliance_theater] could not write log file ${path}: ${(0, errors_1.asError)(error).message}`);
        }
    }
}
function cachePath() {
    return optional("TOKEN_CACHE_PATH") ||
        (0, node_path_1.join)((0, node_os_1.homedir)(), ".codex", "compliance_theater", "compliance_theater_token_cache.json");
}
function legacyDeviceLoginPath() {
    return (0, node_path_1.join)((0, node_os_1.homedir)(), ".codex", "compliance_theater", "compliance_theater_device_login.json");
}
function neo4jCredentialCachePath() {
    return (0, node_path_1.join)((0, node_path_1.dirname)(cachePath()), "compliance_theater_neo4j_credentials.json");
}
function credentialCachePaths() {
    const paths = [
        { path: cachePath(), label: "cached OAuth token, refresh token, and wrapped Auth.js session cookie" },
        { path: legacyDeviceLoginPath(), label: "legacy device-login state" },
        { path: neo4jCredentialCachePath(), label: "cached Neo4j graph credentials" }
    ];
    const seen = new Set();
    return paths.filter(({ path }) => {
        if (seen.has(path)) {
            return false;
        }
        seen.add(path);
        return true;
    });
}
function tokenSkewMs() {
    return (0, runtime_utils_1.parseNumber)(optional("TOKEN_EXPIRY_SKEW_SECONDS"), 60, 0) * 1000;
}
function httpTimeoutMs() {
    return (0, runtime_utils_1.parseNumber)(optional("HTTP_TIMEOUT_MS"), 360000, 1000);
}
function httpRetryCount() {
    return (0, runtime_utils_1.parseNumber)(optional("HTTP_RETRY_COUNT"), 2, 0);
}
function httpRetryBaseMs() {
    return (0, runtime_utils_1.parseNumber)(optional("HTTP_RETRY_BASE_MS"), 500, 0);
}
function proxyRequestTimeoutMs() {
    return (0, runtime_utils_1.parseNumber)(optional("PROXY_REQUEST_TIMEOUT_MS"), 360000, 1000);
}
function embeddingCacheMaxEntries() {
    return (0, runtime_utils_1.parseNumber)(optional("EMBEDDING_CACHE_MAX_ENTRIES"), 256, 0);
}
function embeddingCacheTtlMs() {
    return (0, runtime_utils_1.parseNumber)(optional("EMBEDDING_CACHE_TTL_MS"), 10 * 60 * 1000, 0);
}
function normalizeIssuer(value) {
    return value.replace(/\/+$/, "");
}
function metadataCandidates() {
    const explicit = optional("AUTH_METADATA_URL");
    if (explicit) {
        (0, runtime_utils_1.warnIfInsecureUrl)(explicit, log, "OAuth metadata URL");
        return [explicit];
    }
    const issuer = normalizeIssuer(required("AUTH_ISSUER"));
    (0, runtime_utils_1.warnIfInsecureUrl)(issuer, log, "OAuth issuer");
    const url = new URL(issuer);
    const issuerPath = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
    return [
        `${url.origin}/.well-known/oauth-authorization-server${issuerPath}`,
        `${issuer}/.well-known/oauth-authorization-server`
    ];
}
//# sourceMappingURL=config.js.map