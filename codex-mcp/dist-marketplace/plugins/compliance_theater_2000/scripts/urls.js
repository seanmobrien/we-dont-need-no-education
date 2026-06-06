"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionEndpointUrl = sessionEndpointUrl;
exports.wrapEndpointUrl = wrapEndpointUrl;
exports.appEndpointUrl = appEndpointUrl;
exports.memoryEndpointUrl = memoryEndpointUrl;
exports.documentUnitEndpointUrl = documentUnitEndpointUrl;
exports.documentUnitEmbeddingsEndpointUrl = documentUnitEmbeddingsEndpointUrl;
exports.documentUnitEmbeddingsEndpointPath = documentUnitEmbeddingsEndpointPath;
exports.aiEmbedEndpointUrl = aiEmbedEndpointUrl;
exports.aiEmbedEndpointPath = aiEmbedEndpointPath;
const runtime_utils_1 = require("./runtime-utils");
const config_1 = require("./config");
function sessionEndpointUrl() {
    const explicit = (0, config_1.optional)("SESSION_STATUS_URL");
    if (explicit) {
        (0, runtime_utils_1.warnIfInsecureUrl)(explicit, config_1.log, "Session status URL");
        return explicit;
    }
    const parsed = new URL((0, config_1.serverUrl)());
    parsed.pathname = "/api/auth/session";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
}
function wrapEndpointUrl() {
    const explicit = (0, config_1.optional)("WRAP_URL");
    if (explicit) {
        (0, runtime_utils_1.warnIfInsecureUrl)(explicit, config_1.log, "Session wrap URL");
        return explicit;
    }
    const parsed = new URL((0, config_1.serverUrl)());
    parsed.pathname = "/api/auth/wrap";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
}
function appEndpointUrl(pathname, query = {}) {
    const parsed = new URL((0, config_1.serverUrl)());
    parsed.pathname = pathname;
    parsed.search = "";
    parsed.hash = "";
    for (const [name, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== "") {
            parsed.searchParams.set(name, String(value));
        }
    }
    return parsed.toString();
}
function memoryEndpointUrl(pathname, query) {
    return appEndpointUrl(`/api/memory/${pathname.replace(/^\/+/, "")}`, query);
}
function documentUnitEndpointUrl(caseFileId) {
    return appEndpointUrl(`/api/document-unit/${encodeURIComponent(String(caseFileId))}`);
}
function documentUnitEmbeddingsEndpointUrl(caseFileId, modelSize, index) {
    const encodedId = encodeURIComponent(String(caseFileId));
    const encodedIndex = index === undefined || index === null || index === ""
        ? undefined
        : encodeURIComponent(String(index));
    return appEndpointUrl(`/api/document-unit/${encodedId}/embeddings${encodedIndex === undefined ? "" : `/${encodedIndex}`}`, { size: modelSize });
}
function documentUnitEmbeddingsEndpointPath(caseFileId, index) {
    const encodedId = encodeURIComponent(String(caseFileId));
    const encodedIndex = index === undefined || index === null || index === ""
        ? undefined
        : encodeURIComponent(String(index));
    return `/api/document-unit/${encodedId}/embeddings${encodedIndex === undefined ? "" : `/${encodedIndex}`}`;
}
function aiEmbedEndpointUrl() {
    return appEndpointUrl("/api/ai/embed");
}
function aiEmbedEndpointPath() {
    return "/api/ai/embed";
}
//# sourceMappingURL=urls.js.map