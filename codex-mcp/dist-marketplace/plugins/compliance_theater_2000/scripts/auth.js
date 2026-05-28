"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acquireToken = acquireToken;
exports.fetchSessionForAppSession = fetchSessionForAppSession;
exports.authStatusSummary = authStatusSummary;
exports.loginAndSummarizeStatus = loginAndSummarizeStatus;
exports.acquireAppSession = acquireAppSession;
exports.resetAuthState = resetAuthState;
exports.authCachePaths = authCachePaths;
const http_1 = require("./http");
const config_1 = require("./config");
const errors_1 = require("./errors");
const urls_1 = require("./urls");
const runtime_utils_1 = require("./runtime-utils");
let registeredClient;
async function readCachedToken() {
    const cached = await (0, runtime_utils_1.readCachedTokenFile)((0, config_1.cachePath)(), {
        skewMs: (0, config_1.tokenSkewMs)(),
        logger: config_1.log
    });
    return cached?.access_token ? cached : undefined;
}
async function writeCachedToken(token) {
    if ((0, config_1.optional)("DISABLE_TOKEN_CACHE") === "1") {
        return;
    }
    await (0, runtime_utils_1.writeCachedTokenFile)((0, config_1.cachePath)(), token, { logger: config_1.log });
}
async function discoverMetadata() {
    const errors = [];
    for (const url of (0, config_1.metadataCandidates)()) {
        try {
            const metadata = await (0, http_1.fetchJson)(url);
            if (!metadata.issuer || !metadata.token_endpoint) {
                throw new Error("metadata is missing issuer or token_endpoint");
            }
            (0, config_1.log)(`discovered OAuth metadata from ${url}`);
            return metadata;
        }
        catch (error) {
            errors.push(`${url}: ${(0, errors_1.asError)(error).message}`);
        }
    }
    throw new Error(`Unable to discover OAuth metadata. Tried: ${errors.join("; ")}`);
}
function hasGrant(metadata, grant) {
    const grants = metadata.grant_types_supported;
    return Array.isArray(grants) ? grants.includes(grant) : grant === "authorization_code";
}
function tokenAuthHeaders(metadata) {
    const clientId = (0, config_1.optional)("CLIENT_ID");
    const clientSecret = (0, config_1.optional)("CLIENT_SECRET");
    const methods = metadata.token_endpoint_auth_methods_supported || ["client_secret_basic"];
    if (clientId && clientSecret && methods.includes("client_secret_basic")) {
        return { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}` };
    }
    return {};
}
function addClientAuth(body, metadata) {
    const clientId = (0, config_1.optional)("CLIENT_ID") || registeredClient?.client_id;
    const clientSecret = (0, config_1.optional)("CLIENT_SECRET") || registeredClient?.client_secret;
    const methods = metadata.token_endpoint_auth_methods_supported || ["client_secret_basic"];
    if (clientId && !body.has("client_id")) {
        body.set("client_id", clientId);
    }
    if (clientSecret && methods.includes("client_secret_post")) {
        body.set("client_secret", clientSecret);
    }
}
async function tokenRequest(metadata, body) {
    addClientAuth(body, metadata);
    const token = await (0, http_1.fetchJson)(metadata.token_endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...tokenAuthHeaders(metadata)
        },
        body
    });
    if (!token.access_token) {
        throw new Error("token endpoint response did not include access_token");
    }
    return token;
}
async function refreshToken(metadata) {
    const refresh = (0, config_1.optional)("REFRESH_TOKEN");
    if (!refresh) {
        return undefined;
    }
    const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh });
    const scope = (0, config_1.optional)("OAUTH_SCOPE");
    if (scope) {
        body.set("scope", scope);
    }
    (0, config_1.log)("requesting access token with refresh_token grant");
    return tokenRequest(metadata, body);
}
async function clientCredentials(metadata) {
    if (!hasGrant(metadata, "client_credentials") || !(0, config_1.optional)("CLIENT_ID") || !(0, config_1.optional)("CLIENT_SECRET")) {
        return undefined;
    }
    const body = new URLSearchParams({ grant_type: "client_credentials" });
    const scope = (0, config_1.optional)("OAUTH_SCOPE");
    if (scope) {
        body.set("scope", scope);
    }
    (0, config_1.log)("requesting access token with client_credentials grant");
    return tokenRequest(metadata, body);
}
async function passwordGrant(metadata) {
    if (!hasGrant(metadata, "password") || !(0, config_1.optional)("USERNAME") || !(0, config_1.optional)("PASSWORD")) {
        return undefined;
    }
    const username = (0, config_1.required)("USERNAME");
    const password = (0, config_1.required)("PASSWORD");
    const body = new URLSearchParams({ grant_type: "password", username, password });
    const scope = (0, config_1.optional)("OAUTH_SCOPE");
    if (scope) {
        body.set("scope", scope);
    }
    (0, config_1.log)("requesting access token with password grant");
    return tokenRequest(metadata, body);
}
async function registerClient(metadata) {
    if ((0, config_1.optional)("CLIENT_ID")) {
        return { client_id: (0, config_1.optional)("CLIENT_ID"), client_secret: (0, config_1.optional)("CLIENT_SECRET") };
    }
    if (registeredClient) {
        return registeredClient;
    }
    if (!metadata.registration_endpoint) {
        return undefined;
    }
    const scope = (0, config_1.optional)("OAUTH_SCOPE");
    registeredClient = await (0, http_1.fetchJson)(metadata.registration_endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            client_name: "Compliance Theater 2000 Codex Plugin",
            grant_types: ["urn:ietf:params:oauth:grant-type:device_code"],
            token_endpoint_auth_method: "none",
            ...(scope ? { scope } : {})
        })
    });
    if (!registeredClient.client_id) {
        throw new Error("dynamic client registration response did not include client_id");
    }
    (0, config_1.log)("dynamically registered OAuth client");
    return registeredClient;
}
async function deviceAuthorization(metadata) {
    if (!metadata.device_authorization_endpoint) {
        return undefined;
    }
    const oauthClient = await registerClient(metadata);
    if (!oauthClient?.client_id) {
        return undefined;
    }
    const body = new URLSearchParams({ client_id: oauthClient.client_id });
    if (oauthClient.client_secret) {
        body.set("client_secret", oauthClient.client_secret);
    }
    const scope = (0, config_1.optional)("OAUTH_SCOPE");
    if (scope) {
        body.set("scope", scope);
    }
    const device = await (0, http_1.fetchJson)(metadata.device_authorization_endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
    });
    const verification = device.verification_uri_complete || device.verification_uri;
    (0, config_1.log)(`open ${verification}`);
    if (device.user_code) {
        (0, config_1.log)(`enter code ${device.user_code}`);
    }
    let intervalMs = Math.max(Number(device.interval || 5), 1) * 1000;
    const expiresAt = Date.now() + Math.max(Number(device.expires_in || 600), 60) * 1000;
    const timeout = Number((0, config_1.optional)("DEVICE_CODE_TIMEOUT_SECONDS") || "900") * 1000;
    const stopAt = Math.min(expiresAt, Date.now() + timeout);
    while (Date.now() < stopAt) {
        await (0, runtime_utils_1.sleep)(intervalMs);
        try {
            return await tokenRequest(metadata, new URLSearchParams({
                grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                device_code: device.device_code,
                client_id: oauthClient.client_id
            }));
        }
        catch (error) {
            const message = (0, errors_1.asError)(error).message.toLowerCase();
            if (message.includes("slow_down")) {
                intervalMs += 5000;
                (0, config_1.log)(`slowing device authorization polling to ${intervalMs}ms`);
            }
            else if (!message.includes("authorization_pending")) {
                throw error;
            }
        }
    }
    throw new Error("Timed out waiting for device authorization");
}
async function acquireToken(options = {}) {
    const existing = (0, config_1.optional)("ACCESS_TOKEN");
    if (existing) {
        (0, config_1.log)("using preconfigured access token");
        return { access_token: existing };
    }
    if (!options.ignoreCache) {
        const cached = await readCachedToken();
        if (cached) {
            return cached;
        }
    }
    else {
        (0, config_1.log)("ignoring cached token for fresh authentication");
    }
    const metadata = await discoverMetadata();
    const token = (await refreshToken(metadata)) ||
        (await clientCredentials(metadata)) ||
        (await passwordGrant(metadata)) ||
        (await deviceAuthorization(metadata));
    if (!token) {
        const grants = metadata.grant_types_supported || ["authorization_code"];
        throw new Error(`No supported OAuth flow could be selected. Server grants: ${grants.join(", ")}`);
    }
    const acquired = { ...token, metadata };
    await writeCachedToken(acquired);
    return acquired;
}
async function currentAccessToken() {
    const explicit = (0, config_1.optional)("ACCESS_TOKEN");
    if (explicit) {
        return { token: explicit, source: "env:ACCESS_TOKEN" };
    }
    const cached = await readCachedToken();
    return cached?.access_token ? { token: cached.access_token, source: "cached-token", cached } : undefined;
}
async function fetchSessionForAppSession(appSession) {
    const url = (0, urls_1.sessionEndpointUrl)();
    const startedAt = Date.now();
    const sessionCookie = (0, runtime_utils_1.appSessionCookieHeader)(appSession);
    if (!sessionCookie) {
        throw new Error("Wrapped app session did not include a cookie header.");
    }
    const response = await (0, runtime_utils_1.fetchWithPolicy)(url, {
        headers: {
            Accept: "application/json",
            Cookie: sessionCookie
        },
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
    (0, config_1.log)("session status request completed", { url, status: response.status, durationMs: Date.now() - startedAt });
    return { response, body, url };
}
async function metadataForToken(tokenInfo) {
    return tokenInfo?.cached?.metadata || discoverMetadata();
}
async function fetchUserInfoForToken(accessToken, metadata) {
    if (!metadata?.userinfo_endpoint) {
        return undefined;
    }
    return (0, http_1.fetchJsonResponse)(metadata.userinfo_endpoint, {
        headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` }
    });
}
function tokenExpiryLine(tokenInfo) {
    const cached = tokenInfo?.cached;
    if (!cached) {
        return "- expires: (not provided)";
    }
    const expiresAt = (0, runtime_utils_1.tokenExpiresAt)(cached, 0);
    return expiresAt > 0 ? `- expires: ${new Date(expiresAt).toISOString()}` : "- expires: (not provided)";
}
function formatSessionReadiness(sessionResult) {
    if (!sessionResult) {
        return ["App session:", "- status: not checked", "- detail: no session endpoint is configured"];
    }
    const { response, body, url } = sessionResult;
    if (response.ok) {
        return ["App session:", `- status: ${body?.status || "unknown"}`, `- endpoint: ${url}`];
    }
    return ["App session:", "- status: invalid", `- endpoint: ${url}`, `- HTTP: ${response.status}`, `- response: ${JSON.stringify(body)}`];
}
function roleSummary(resourceAccess) {
    if (!resourceAccess || typeof resourceAccess !== "object") {
        return "none";
    }
    const entries = Object.entries(resourceAccess).map(([resourceName, details]) => {
        const roles = Array.isArray(details) ? details : Array.isArray(details?.roles) ? details.roles : [];
        return `${resourceName}: ${roles.join(", ") || "(no roles)"}`;
    });
    return entries.length ? entries.join("\n") : "none";
}
function formatUserInfoStatus(userInfo, context, tokenInfo, sessionResult) {
    return [
        `Auth status: authenticated (${context})`,
        "OAuth userinfo endpoint: verified",
        "",
        "User:",
        `- name: ${userInfo.name || "(unknown)"}`,
        `- email: ${userInfo.email || "(unknown)"}`,
        `- id: ${userInfo.sub || userInfo.id || "(unknown)"}`,
        `- username: ${userInfo.preferred_username || "(not provided)"}`,
        tokenExpiryLine(tokenInfo),
        "",
        ...formatSessionReadiness(sessionResult),
        "",
        "Permissions:",
        roleSummary(userInfo.resource_access)
    ].join("\n");
}
function parseFutureExpiry(value, label) {
    const expiresAt = Date.parse(value);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        throw new Error(`Wrap response did not include a future ${label}.`);
    }
    return expiresAt;
}
function appSessionFromWrapResponse(body) {
    if (!body?.success || !body.token || !body.cookieName || !body.expiresAt) {
        throw new Error("Wrap response did not include a wrapped app session token.");
    }
    return {
        token: body.token,
        cookie_name: body.cookieName,
        expires_at: parseFutureExpiry(body.expiresAt, "session expiry"),
        expires_at_iso: body.expiresAt,
        source_token_expires_at: body.sourceTokenExpiresAt || undefined,
        session_expires_at: body.sessionExpiresAt || undefined,
        wrapped_at: Date.now()
    };
}
function shouldPersistDerivedSession(token) {
    return Boolean(token?.metadata || token?.cached_at);
}
function formatSessionStatus(sessionResult, context, tokenInfo, userInfoResult) {
    const session = sessionResult.body?.data || {};
    const user = session.user || {};
    const lines = [
        `Auth status: authenticated (${context})`,
        "App session endpoint: verified",
        "",
        "User:",
        `- name: ${user.name || "(unknown)"}`,
        `- email: ${user.email || "(unknown)"}`,
        `- id: ${user.id || user.subject || "(unknown)"}`,
        tokenExpiryLine(tokenInfo),
        "",
        ...formatSessionReadiness(sessionResult)
    ];
    if (userInfoResult?.response) {
        lines.push("", "OAuth userinfo:", `- endpoint: ${userInfoResult.url}`, `- HTTP: ${userInfoResult.response.status}`);
    }
    return lines.join("\n");
}
async function verifiedAuthStatus(accessToken, context, tokenInfo = {}) {
    let userInfoResult;
    try {
        userInfoResult = await fetchUserInfoForToken(accessToken, await metadataForToken(tokenInfo));
    }
    catch (error) {
        userInfoResult = { error: (0, errors_1.asError)(error) };
    }
    let appSession;
    try {
        appSession = await acquireAppSession(tokenInfo.cached || { access_token: accessToken });
    }
    catch (error) {
        appSession = { error: (0, errors_1.asError)(error) };
    }
    const sessionResult = "token" in appSession && appSession.token
        ? await fetchSessionForAppSession(appSession).catch((error) => ({ error: (0, errors_1.asError)(error) }))
        : { error: (0, errors_1.asError)(appSession.error) };
    if (userInfoResult && "response" in userInfoResult && userInfoResult.response.ok) {
        return formatUserInfoStatus(userInfoResult.body, context, tokenInfo, "response" in sessionResult ? sessionResult : undefined);
    }
    if ("response" in sessionResult && (0, runtime_utils_1.isAuthenticatedSessionResult)(sessionResult)) {
        return formatSessionStatus(sessionResult, context, tokenInfo, userInfoResult && "response" in userInfoResult ? userInfoResult : undefined);
    }
    const userInfoRejected = userInfoResult && "response" in userInfoResult && userInfoResult.response.status === 401;
    const sessionRejected = "response" in sessionResult &&
        (sessionResult.response.status === 401 || sessionResult.response.status === 403);
    const lines = [
        `${userInfoRejected || sessionRejected ? "Auth status: token unauthenticated" : "Auth status: unknown"} (${context})`
    ];
    if (userInfoResult && "response" in userInfoResult) {
        lines.push(`OAuth userinfo endpoint ${userInfoResult.url} returned HTTP ${userInfoResult.response.status}.`);
        lines.push(`Response: ${JSON.stringify(userInfoResult.body)}`);
    }
    else if (userInfoResult && "error" in userInfoResult) {
        lines.push(`OAuth userinfo verification failed: ${userInfoResult.error.message}`);
    }
    else {
        lines.push("OAuth metadata did not provide a userinfo endpoint.");
    }
    if ("response" in sessionResult) {
        lines.push(...formatSessionReadiness(sessionResult));
    }
    else if ("error" in sessionResult) {
        lines.push(`App session check failed: ${sessionResult.error.message}`);
    }
    return lines.join("\n");
}
async function authStatusSummary() {
    const tokenInfo = await currentAccessToken();
    if (!tokenInfo?.token) {
        return "Auth status: unauthenticated (no cached or configured access token).";
    }
    return verifiedAuthStatus(tokenInfo.token, tokenInfo.source || "unknown", tokenInfo);
}
async function loginAndSummarizeStatus() {
    const metadata = await discoverMetadata();
    const token = await deviceAuthorization(metadata);
    if (!token?.access_token) {
        throw new Error("Login flow did not return an access token.");
    }
    const acquired = { ...token, metadata };
    await writeCachedToken(acquired);
    return ["Login successful. Cached new access token.", "", await verifiedAuthStatus(acquired.access_token, "new-login", { cached: acquired })].join("\n");
}
async function acquireAppSession(token) {
    if ((0, runtime_utils_1.isUsableCachedAppSession)(token, (0, config_1.tokenSkewMs)())) {
        (0, config_1.log)("using cached wrapped app session");
        return token.app_session;
    }
    const url = (0, urls_1.wrapEndpointUrl)();
    (0, config_1.log)("requesting wrapped app session", { url });
    const body = await (0, http_1.fetchJson)(url, {
        method: "POST",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token.access_token}`
        }
    });
    const appSession = appSessionFromWrapResponse(body);
    const tokenWithAppSession = { ...token, app_session: appSession };
    if (shouldPersistDerivedSession(token)) {
        try {
            await writeCachedToken(tokenWithAppSession);
        }
        catch (error) {
            (0, config_1.log)("could not persist wrapped app session; continuing with in-memory session", {
                message: (0, errors_1.asError)(error).message
            });
        }
    }
    (0, config_1.log)("wrapped app session acquired", {
        url,
        cookieName: appSession.cookie_name,
        expiresAt: appSession.expires_at_iso
    });
    return appSession;
}
function resetAuthState() {
    registeredClient = undefined;
}
function authCachePaths() {
    return (0, config_1.credentialCachePaths)();
}
//# sourceMappingURL=auth.js.map