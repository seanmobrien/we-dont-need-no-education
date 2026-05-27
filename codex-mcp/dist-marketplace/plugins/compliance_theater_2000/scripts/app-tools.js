"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQueryVectorsForApp = void 0;
exports.clearAppToolCaches = clearAppToolCaches;
exports.callApiTool = callApiTool;
exports.readCaseFileTool = readCaseFileTool;
exports.getCaseFileTool = getCaseFileTool;
exports.amendCaseFileTool = amendCaseFileTool;
exports.createGenerateQueryVectors = createGenerateQueryVectors;
exports.manageCaseFileEmbeddingsTool = manageCaseFileEmbeddingsTool;
exports.callMemoryTool = callMemoryTool;
const auth_1 = require("./auth");
const config_1 = require("./config");
const errors_1 = require("./errors");
const http_1 = require("./http");
const urls_1 = require("./urls");
const vector_params_1 = require("./vector-params");
const runtime_utils_1 = require("./runtime-utils");
const queryVectorCache = (0, vector_params_1.createQueryVectorCache)((0, config_1.embeddingCacheMaxEntries)(), (0, config_1.embeddingCacheTtlMs)());
function clearAppToolCaches() {
    queryVectorCache.clear();
}
function requiredToolArgument(args, name) {
    const value = args?.[name];
    if (value === undefined || value === null || value === "") {
        throw new Error(`${name} is required.`);
    }
    return value;
}
async function memoryApiRequest(method, url, body, refreshToken) {
    const token = await (0, auth_1.acquireToken)();
    try {
        return await memoryApiRequestWithToken(token, method, url, body);
    }
    catch (error) {
        if (!(0, errors_1.isHttpBadRequest)(error)) {
            throw error;
        }
        const freshToken = await refreshToken(`Memory API ${method} ${url} returned HTTP 400`);
        return memoryApiRequestWithToken(freshToken, method, url, body);
    }
}
async function memoryApiRequestWithToken(token, method, url, body) {
    const appSession = await (0, auth_1.acquireAppSession)(token);
    const sessionCookie = (0, runtime_utils_1.appSessionCookieHeader)(appSession);
    if (!sessionCookie) {
        throw new Error("Wrapped app session did not include a cookie header.");
    }
    const responseResult = await (0, http_1.fetchJsonResponse)(url, {
        method,
        headers: {
            Accept: "application/json",
            Cookie: sessionCookie,
            ...(body === undefined ? {} : { "Content-Type": "application/json" })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    if (!responseResult.response.ok) {
        const detail = responseResult.body?.message || responseResult.body?.error || `HTTP ${responseResult.response.status}`;
        throw (0, errors_1.httpStatusError)(`Memory API ${method} ${url} failed: ${detail}`, responseResult.response.status);
    }
    return responseResult.body;
}
async function appSessionJsonRequest(method, url, body, refreshToken) {
    const token = await (0, auth_1.acquireToken)();
    try {
        return await appSessionJsonRequestWithToken(token, method, url, body);
    }
    catch (error) {
        if (!(0, errors_1.isHttpBadRequest)(error)) {
            throw error;
        }
        const freshToken = await refreshToken(`App API ${method} ${url} returned HTTP 400`);
        return appSessionJsonRequestWithToken(freshToken, method, url, body);
    }
}
async function appSessionJsonRequestWithToken(token, method, url, body) {
    const appSession = await (0, auth_1.acquireAppSession)(token);
    const sessionCookie = (0, runtime_utils_1.appSessionCookieHeader)(appSession);
    if (!sessionCookie) {
        throw new Error("Wrapped app session did not include a cookie header.");
    }
    const responseResult = await (0, http_1.fetchJsonResponse)(url, {
        method,
        headers: {
            Accept: "application/json",
            Cookie: sessionCookie,
            ...(body === undefined ? {} : { "Content-Type": "application/json" })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    if (!responseResult.response.ok) {
        const detail = responseResult.body?.message || responseResult.body?.error || `HTTP ${responseResult.response.status}`;
        throw (0, errors_1.httpStatusError)(`App API ${method} ${url} failed: ${detail}`, responseResult.response.status);
    }
    return responseResult.body;
}
function appApiEndpointUrl(relativeUrl) {
    const trimmed = relativeUrl.trim();
    if (!trimmed) {
        throw new Error("url is required.");
    }
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) || trimmed.startsWith("//")) {
        throw new Error("url must be relative to the Compliance Theater /api root.");
    }
    const withoutLeadingSlash = trimmed.replace(/^\/+/, "");
    const apiRelative = withoutLeadingSlash.replace(/^api(?:\/|$)/i, "");
    const server = new URL((0, config_1.required)("SERVER_URL"));
    const apiRoot = new URL("/api/", server.origin);
    const target = new URL(apiRelative, apiRoot);
    if (target.origin !== apiRoot.origin || !target.pathname.startsWith("/api/")) {
        throw new Error("url must resolve inside the Compliance Theater /api root.");
    }
    return target.toString();
}
function normalizeHttpMethod(value) {
    const method = String(value || "GET").trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9_-]*$/.test(method)) {
        throw new Error("method must be a valid HTTP method token.");
    }
    return method;
}
function hasToolData(args) {
    return Object.prototype.hasOwnProperty.call(args, "data") && args.data !== undefined;
}
async function appSessionApiResponse(method, url, body, refreshToken) {
    const token = await (0, auth_1.acquireToken)();
    const first = await appSessionApiResponseWithToken(token, method, url, body);
    if (first.status !== 400) {
        return first;
    }
    const freshToken = await refreshToken(`App API ${method} ${url} returned HTTP 400`);
    return appSessionApiResponseWithToken(freshToken, method, url, body);
}
async function appSessionApiResponseWithToken(token, method, url, body) {
    const appSession = await (0, auth_1.acquireAppSession)(token);
    const sessionCookie = (0, runtime_utils_1.appSessionCookieHeader)(appSession);
    if (!sessionCookie) {
        throw new Error("Wrapped app session did not include a cookie header.");
    }
    const startedAt = Date.now();
    const response = await (0, runtime_utils_1.fetchWithPolicy)(url, {
        method,
        headers: {
            Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
            Cookie: sessionCookie,
            ...(body === undefined ? {} : { "Content-Type": "application/json" })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        timeoutMs: (0, config_1.httpTimeoutMs)(),
        retries: (0, config_1.httpRetryCount)(),
        retryBaseMs: (0, config_1.httpRetryBaseMs)(),
        logger: config_1.log
    });
    const text = await response.text();
    let parsedBody = null;
    let parsedJson = false;
    try {
        parsedBody = text ? JSON.parse(text) : null;
        parsedJson = text.trim().length > 0;
    }
    catch {
        parsedBody = null;
    }
    (0, config_1.log)("App API call completed", {
        url,
        method,
        status: response.status,
        durationMs: Date.now() - startedAt
    });
    return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        method,
        url,
        body: parsedBody,
        text: parsedJson ? null : text
    };
}
async function callApiTool(args = {}, refreshToken) {
    const url = appApiEndpointUrl(String(requiredToolArgument(args, "url")));
    const method = normalizeHttpMethod(args.method);
    const includesBody = hasToolData(args);
    if (includesBody && (method === "GET" || method === "HEAD")) {
        throw new Error("data cannot be sent with GET or HEAD. Put query parameters in the url, or use POST/PUT/PATCH.");
    }
    return appSessionApiResponse(method, url, includesBody ? args.data : undefined, refreshToken);
}
async function readCaseFileTool(args = {}, refreshToken) {
    const caseFileId = args.caseFileId ?? args.case_file_id ?? args.id;
    if (caseFileId === undefined || caseFileId === null || caseFileId === "") {
        throw new Error("caseFileId is required.");
    }
    return appSessionJsonRequest("GET", (0, urls_1.documentUnitEndpointUrl)(caseFileId), undefined, refreshToken);
}
function caseFileIdsFromArgs(args) {
    const ids = [];
    if (args.caseFileId !== undefined && args.caseFileId !== null && args.caseFileId !== "") {
        ids.push(args.caseFileId);
    }
    if (args.id !== undefined && args.id !== null && args.id !== "") {
        ids.push(args.id);
    }
    if (Array.isArray(args.ids)) {
        ids.push(...args.ids.filter((id) => id !== undefined && id !== null && id !== ""));
    }
    if (Array.isArray(args.requests)) {
        ids.push(...args.requests
            .map((request) => request?.caseFileId)
            .filter((id) => id !== undefined && id !== null && id !== ""));
    }
    return ids;
}
function goalsRequestsFromArgs(args) {
    if (Array.isArray(args.requests) && args.requests.length > 0) {
        return args.requests;
    }
    const ids = caseFileIdsFromArgs(args);
    return ids.map((caseFileId) => ({ caseFileId }));
}
async function getCaseFileTool(args = {}, remoteRequest, refreshToken) {
    const mode = args.mode;
    if (mode !== "direct" && mode !== "goals") {
        throw new Error("mode is required and must be one of: direct, goals.");
    }
    if (mode === "direct") {
        if (args.goals !== undefined || args.verbatim_fidelity !== undefined) {
            throw new Error("direct mode does not accept goals or verbatim_fidelity. Use goals mode for preprocessing.");
        }
        const ids = caseFileIdsFromArgs(args);
        if (ids.length === 0) {
            throw new Error("direct mode requires caseFileId, id, ids, or requests.");
        }
        if (ids.length > 3) {
            throw new Error("direct mode supports at most 3 case-file IDs. Use goals mode for larger batches.");
        }
        return {
            mode,
            items: await Promise.all(ids.map(async (caseFileId) => ({
                caseFileId,
                result: await readCaseFileTool({ caseFileId }, refreshToken)
            })))
        };
    }
    const requests = goalsRequestsFromArgs(args);
    if (requests.length === 0) {
        throw new Error("goals mode requires requests, ids, caseFileId, or id.");
    }
    return {
        mode,
        result: await remoteRequest("tools/call", {
            name: "getMultipleCaseFileDocuments",
            arguments: {
                requests,
                ...(args.goals === undefined ? {} : { goals: args.goals }),
                ...(args.verbatim_fidelity === undefined ? {} : { verbatim_fidelity: args.verbatim_fidelity })
            }
        })
    };
}
async function amendCaseFileTool(args = {}, remoteRequest) {
    return remoteRequest("tools/call", {
        name: "amendCaseFileDocument",
        arguments: args
    });
}
function requiredModelSize(args) {
    const modelSize = args.modelSize ?? args.model_size ?? args.size;
    if (modelSize !== "large" && modelSize !== "small") {
        throw new Error("modelSize is required and must be one of: large, small.");
    }
    return modelSize;
}
function optionalModelSize(args) {
    const modelSize = args.modelSize ?? args.model_size ?? args.size ?? "large";
    if (modelSize !== "large" && modelSize !== "small") {
        throw new Error("modelSize must be one of: large, small.");
    }
    return modelSize;
}
function isMissingEmbeddingResult(value) {
    if (value === null || value === undefined) {
        return true;
    }
    if (typeof value === "string") {
        return value.trim().length === 0;
    }
    if (Array.isArray(value)) {
        return value.length === 0;
    }
    if (typeof value === "object") {
        const record = value;
        if (record.isError === true && !record.value && !record.items && !record.result) {
            return true;
        }
        if ("value" in record) {
            return isMissingEmbeddingResult(record.value);
        }
        if ("result" in record) {
            return isMissingEmbeddingResult(record.result);
        }
        if ("items" in record) {
            return isMissingEmbeddingResult(record.items);
        }
        if ("embeddings" in record && isMissingEmbeddingResult(record.embeddings)) {
            return true;
        }
        const meaningfulKeys = Object.keys(record).filter((key) => record[key] !== undefined && record[key] !== null);
        if (meaningfulKeys.length === 0) {
            return true;
        }
        if (meaningfulKeys.length === 1 && meaningfulKeys[0] === "isError" && record.isError === false) {
            return true;
        }
    }
    return false;
}
async function readEmbeddingsOrNull(caseFileId, modelSize, index, refreshToken) {
    try {
        const result = await appSessionJsonRequest("GET", (0, urls_1.documentUnitEmbeddingsEndpointUrl)(caseFileId, modelSize, index), undefined, refreshToken);
        return isMissingEmbeddingResult(result) ? null : result;
    }
    catch (error) {
        const status = (0, errors_1.httpStatusFromError)(error);
        if (status === 404 || status === 204) {
            return null;
        }
        throw error;
    }
}
async function generateEmbeddings(caseFileId, modelSize, refreshToken) {
    return appSessionJsonRequest("PUT", (0, urls_1.documentUnitEmbeddingsEndpointUrl)(caseFileId, modelSize), undefined, refreshToken);
}
exports.generateQueryVectorsForApp = (0, vector_params_1.createCachedQueryVectorGenerator)((text, modelSize) => {
    throw new Error(`generateQueryVectorsForApp is not configured: ${JSON.stringify({ textLength: text.length, modelSize })}`);
}, queryVectorCache, config_1.log);
function createGenerateQueryVectors(refreshToken) {
    return (0, vector_params_1.createCachedQueryVectorGenerator)((text, modelSize) => appSessionJsonRequest("POST", (0, urls_1.aiEmbedEndpointUrl)(), {
        text,
        size: modelSize
    }, refreshToken), queryVectorCache, config_1.log);
}
function embeddingAction(args) {
    const rawAction = args.action;
    const normalized = typeof rawAction === "string" ? rawAction.replace(/_/g, "-") : "";
    if (normalized === "read" ||
        normalized === "embed" ||
        normalized === "embed-if-missing" ||
        normalized === "query-vectors") {
        return normalized;
    }
    throw new Error("action is required and must be one of: read, embed, embed-if-missing, query-vectors.");
}
async function manageCaseFileEmbeddingsTool(args = {}, refreshToken) {
    const action = embeddingAction(args);
    const generateQueryVectors = createGenerateQueryVectors(refreshToken);
    if (action === "query-vectors") {
        const text = args.text ?? args.query ?? args.queryText ?? args.query_text;
        if (typeof text !== "string" || text.trim() === "") {
            throw new Error("text is required for query-vectors.");
        }
        const modelSize = optionalModelSize(args);
        return {
            action,
            caseFileId: null,
            modelSize,
            index: null,
            endpoint: (0, urls_1.aiEmbedEndpointPath)(),
            generated: true,
            result: await generateQueryVectors(text, modelSize)
        };
    }
    const caseFileId = args.caseFileId ?? args.case_file_id ?? args.documentId ?? args.docId ?? args.id;
    if (caseFileId === undefined || caseFileId === null || caseFileId === "") {
        throw new Error("caseFileId is required.");
    }
    const modelSize = requiredModelSize(args);
    const index = args.index;
    if (index !== undefined && index !== null && index !== "" && action !== "read" && action !== "embed-if-missing") {
        throw new Error("index can only be used with action read or embed-if-missing.");
    }
    if (action === "read") {
        return {
            action,
            caseFileId,
            modelSize,
            index: index ?? null,
            endpoint: (0, urls_1.documentUnitEmbeddingsEndpointPath)(caseFileId, index),
            generated: false,
            result: await readEmbeddingsOrNull(caseFileId, modelSize, index, refreshToken)
        };
    }
    if (action === "embed") {
        return {
            action,
            caseFileId,
            modelSize,
            index: null,
            endpoint: (0, urls_1.documentUnitEmbeddingsEndpointPath)(caseFileId),
            generated: true,
            result: await generateEmbeddings(caseFileId, modelSize, refreshToken)
        };
    }
    const existing = await readEmbeddingsOrNull(caseFileId, modelSize, index, refreshToken);
    if (existing !== null) {
        return {
            action,
            caseFileId,
            modelSize,
            index: index ?? null,
            endpoint: (0, urls_1.documentUnitEmbeddingsEndpointPath)(caseFileId, index),
            generated: false,
            result: existing
        };
    }
    return {
        action,
        caseFileId,
        modelSize,
        index: null,
        endpoint: (0, urls_1.documentUnitEmbeddingsEndpointPath)(caseFileId),
        generated: true,
        result: await generateEmbeddings(caseFileId, modelSize, refreshToken)
    };
}
async function callMemoryTool(name, args = {}, refreshToken) {
    switch (name) {
        case "list":
            return memoryApiRequest("GET", (0, urls_1.memoryEndpointUrl)("memories/", {
                app_id: args.app_id,
                from_date: args.from_date,
                to_date: args.to_date,
                categories: args.categories,
                search_query: args.search_query,
                sort_column: args.sort_column,
                sort_direction: args.sort_direction,
                page: args.page,
                size: args.size
            }), undefined, refreshToken);
        case "insert":
            return memoryApiRequest("POST", (0, urls_1.memoryEndpointUrl)("memories/"), {
                text: requiredToolArgument(args, "text"),
                ...(args.metadata === undefined ? {} : { metadata: args.metadata }),
                ...(args.infer === undefined ? {} : { infer: args.infer }),
                ...(args.app === undefined ? {} : { app: args.app })
            }, refreshToken);
        case "categories":
            return memoryApiRequest("GET", (0, urls_1.memoryEndpointUrl)("memories/categories"), undefined, refreshToken);
        case "get":
            return memoryApiRequest("GET", (0, urls_1.memoryEndpointUrl)(`memories/${encodeURIComponent(requiredToolArgument(args, "memory_id"))}`), undefined, refreshToken);
        case "update":
            return memoryApiRequest("PUT", (0, urls_1.memoryEndpointUrl)(`memories/${encodeURIComponent(requiredToolArgument(args, "memory_id"))}`), { memory_content: requiredToolArgument(args, "memory_content") }, refreshToken);
        case "search":
            return memoryApiRequest("POST", (0, urls_1.memoryEndpointUrl)("memories/search"), {
                query: requiredToolArgument(args, "query"),
                ...(args.numberOfHits === undefined ? {} : { numberOfHits: args.numberOfHits }),
                ...(args.page === undefined ? {} : { page: args.page }),
                ...(args.filters === undefined ? {} : { filters: args.filters })
            }, refreshToken);
        case "related":
            return memoryApiRequest("GET", (0, urls_1.memoryEndpointUrl)(`memories/${encodeURIComponent(requiredToolArgument(args, "memory_id"))}/related`, {
                page: args.page,
                size: args.size
            }), undefined, refreshToken);
        default:
            throw new Error(`Unknown memory tool ${name}`);
    }
}
//# sourceMappingURL=app-tools.js.map