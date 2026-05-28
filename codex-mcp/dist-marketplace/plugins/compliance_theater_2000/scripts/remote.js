"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remoteNotification = remoteNotification;
exports.remoteRequest = remoteRequest;
exports.clearRemoteState = clearRemoteState;
const node_crypto_1 = require("node:crypto");
const runtime_utils_1 = require("./runtime-utils");
const config_1 = require("./config");
const auth_1 = require("./auth");
const errors_1 = require("./errors");
let remote;
let remoteQueue = Promise.resolve({});
async function connectRemote(refreshToken) {
    if (remote) {
        return remote;
    }
    const token = await (0, auth_1.acquireToken)();
    try {
        return await establishRemoteConnection(token);
    }
    catch (error) {
        if (!(0, errors_1.isHttpBadRequest)(error)) {
            throw error;
        }
        const freshToken = await refreshToken("remote MCP connection returned HTTP 400");
        return establishRemoteConnection(freshToken);
    }
}
async function optionalAppSessionForMcpTransport(token) {
    let appSession;
    let sessionCookie;
    try {
        appSession = await (0, auth_1.acquireAppSession)(token);
        sessionCookie = (0, runtime_utils_1.appSessionCookieHeader)(appSession);
    }
    catch (error) {
        if ((0, errors_1.isHttpBadRequest)(error)) {
            throw error;
        }
        (0, config_1.log)(`wrapped app session unavailable for MCP transport; falling back to source bearer: ${(0, errors_1.asError)(error).message}`);
    }
    return { appSession, sessionCookie };
}
async function establishRemoteConnection(token) {
    const { appSession, sessionCookie } = await optionalAppSessionForMcpTransport(token);
    const sseUrl = (0, config_1.required)("SERVER_URL");
    (0, runtime_utils_1.warnIfInsecureUrl)(sseUrl, config_1.log, "Target server URL");
    (0, config_1.log)("connecting remote MCP SSE", { sseUrl });
    const connection = await (0, runtime_utils_1.connectSse)({
        sseUrl,
        accessToken: token.access_token,
        sessionCookie,
        timeoutMs: (0, config_1.proxyRequestTimeoutMs)(),
        httpTimeoutMs: (0, config_1.httpTimeoutMs)(),
        httpRetries: (0, config_1.httpRetryCount)(),
        httpRetryBaseMs: (0, config_1.httpRetryBaseMs)(),
        logger: config_1.log
    });
    remote = Object.assign(connection, {
        accessToken: token.access_token,
        appSession,
        sessionCookie,
        nextId: (0, node_crypto_1.randomInt)(100_000, 999_999)
    });
    await rawRemoteRequest(remote, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "compliance_theater_2000_codex_plugin", version: "0.1.0" }
    });
    await remoteNotification("notifications/initialized", {}, refreshTokenFallback);
    (0, config_1.log)("remote MCP initialized", { endpoint: remote.endpoint });
    return remote;
}
let refreshTokenFallback = async () => {
    throw new Error("Remote refresh callback was not configured.");
};
async function remoteNotification(method, params = {}, refreshToken) {
    refreshTokenFallback = refreshToken;
    const connection = remote || await connectRemote(refreshToken);
    await postRemoteJson(connection, { jsonrpc: "2.0", method, params });
}
async function postRemoteJson(connection, message) {
    const response = await (0, runtime_utils_1.fetchWithPolicy)(connection.endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(connection.sessionCookie
                ? { Cookie: connection.sessionCookie }
                : { Authorization: `Bearer ${connection.accessToken}` })
        },
        body: JSON.stringify(message),
        timeoutMs: (0, config_1.httpTimeoutMs)(),
        retries: (0, config_1.httpRetryCount)(),
        retryBaseMs: (0, config_1.httpRetryBaseMs)(),
        logger: config_1.log
    });
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`Remote MCP ${message.method} failed with HTTP ${response.status}: ${text.slice(0, 1000)}`);
    }
}
function remoteRequest(method, params = {}, refreshToken) {
    refreshTokenFallback = refreshToken;
    remoteQueue = remoteQueue.catch(() => ({})).then(async () => {
        const connection = remote || await connectRemote(refreshToken);
        try {
            return await rawRemoteRequest(connection, method, params);
        }
        catch (error) {
            if (!(0, errors_1.isHttpBadRequest)(error)) {
                throw error;
            }
            const freshToken = await refreshToken(`remote MCP request ${method} returned HTTP 400`);
            const retryConnection = await establishRemoteConnection(freshToken);
            return rawRemoteRequest(retryConnection, method, params);
        }
    });
    return remoteQueue;
}
async function rawRemoteRequest(connection, method, params = {}) {
    const id = connection.nextId++;
    (0, config_1.log)("remote request started", { id, method, paramKeys: Object.keys(params || {}) });
    await (0, runtime_utils_1.rpc)(connection.endpoint, connection.accessToken, id, method, params, {
        timeoutMs: (0, config_1.httpTimeoutMs)(),
        retries: (0, config_1.httpRetryCount)(),
        retryBaseMs: (0, config_1.httpRetryBaseMs)(),
        logger: config_1.log,
        sessionCookie: connection.sessionCookie
    });
    const result = await (0, runtime_utils_1.readRpcResult)(connection.reader, id, (0, config_1.proxyRequestTimeoutMs)());
    (0, config_1.log)("remote request completed", {
        id,
        method,
        resultKeys: result && typeof result === "object" ? Object.keys(result) : []
    });
    return result || {};
}
async function clearRemoteState() {
    const activeRemote = remote;
    remote = undefined;
    remoteQueue = Promise.resolve({});
    if (!activeRemote) {
        return undefined;
    }
    try {
        await activeRemote.reader.cancel();
        return "Closed in-memory MCP connection and cleared its wrapped session cookie.";
    }
    catch (error) {
        return `Cleared in-memory MCP connection state; reader close reported: ${(0, errors_1.asError)(error).message}`;
    }
}
//# sourceMappingURL=remote.js.map