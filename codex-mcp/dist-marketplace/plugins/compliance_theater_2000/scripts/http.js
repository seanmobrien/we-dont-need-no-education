"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchJsonResponse = fetchJsonResponse;
exports.fetchJson = fetchJson;
const runtime_utils_1 = require("./runtime-utils");
const errors_1 = require("./errors");
const config_1 = require("./config");
async function fetchJsonResponse(url, options = {}) {
    const startedAt = Date.now();
    const response = await (0, runtime_utils_1.fetchWithPolicy)(url, {
        ...options,
        timeoutMs: (0, config_1.httpTimeoutMs)(),
        retries: (0, config_1.httpRetryCount)(),
        retryBaseMs: (0, config_1.httpRetryBaseMs)(),
        logger: config_1.log
    });
    const text = await response.text();
    let body;
    try {
        body = text ? JSON.parse(text) : {};
    }
    catch {
        body = {};
    }
    (0, config_1.log)("HTTP request completed", {
        url,
        method: options.method || "GET",
        status: response.status,
        durationMs: Date.now() - startedAt
    });
    return { response, body, url };
}
async function fetchJson(url, options = {}) {
    const { response, body } = await fetchJsonResponse(url, options);
    if (!response.ok) {
        throw (0, errors_1.httpStatusError)(String(body.error || body.error_description || `HTTP ${response.status}`), response.status);
    }
    return body;
}
//# sourceMappingURL=http.js.map