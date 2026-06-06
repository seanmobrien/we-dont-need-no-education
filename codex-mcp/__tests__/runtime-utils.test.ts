import {
  appSessionCookieHeader,
  backoffDelayMs,
  fetchWithPolicy,
  httpDispatcherOptionsFromEnv,
  isAuthenticatedSessionResult,
  isUsableCachedAppSession,
  isUsableCachedToken,
  parseNumber,
  resolveEndpoint,
  rpc,
  warnIfInsecureUrl,
} from "../src/scripts/runtime-utils";

describe("runtime utils", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("clamps numeric config with parseNumber", () => {
    expect(parseNumber(undefined, 15, 1)).toBe(15);
    expect(parseNumber("-5", 15, 0)).toBe(0);
    expect(parseNumber("25", 15, 0)).toBe(25);
  });

  it("calculates exponential backoff delays", () => {
    expect(backoffDelayMs(0, 250)).toBe(250);
    expect(backoffDelayMs(2, 250)).toBe(1000);
  });

  it("resolves relative SSE endpoints", () => {
    expect(resolveEndpoint("./messages", "https://example.com/api/ai/tools/sse"))
      .toBe("https://example.com/api/ai/tools/messages");
  });

  it("honors token and wrapped app-session expiry skew", () => {
    expect(isUsableCachedToken({ access_token: "token", expires_at: Date.now() + 120000 }, 60000))
      .toBe(true);
    expect(isUsableCachedToken({ access_token: "token", expires_at: Date.now() + 30000 }, 60000))
      .toBe(false);

    expect(isUsableCachedAppSession({
      app_session: {
        token: "wrapped",
        cookie_name: "authjs.session-token",
        expires_at: Date.now() + 120000
      }
    }, 60000)).toBe(true);
    expect(isUsableCachedAppSession({
      app_session: {
        token: "wrapped",
        cookie_name: "authjs.session-token",
        expires_at: Date.now() + 30000
      }
    }, 60000)).toBe(false);
  });

  it("warns for remote insecure HTTP URLs but ignores localhost", () => {
    const messages: string[] = [];
    warnIfInsecureUrl("http://example.com/service", (message) => messages.push(message), "OAuth issuer");
    warnIfInsecureUrl("http://localhost:3000/service", (message) => messages.push(message), "OAuth issuer");

    expect(messages).toEqual(["OAuth issuer is using insecure HTTP: http://example.com/service"]);
  });

  it("formats wrapped Auth.js cookies", () => {
    expect(appSessionCookieHeader({ token: "wrapped", cookie_name: "authjs.session-token" }))
      .toBe("authjs.session-token=wrapped");
    expect(appSessionCookieHeader({ token: "wrapped" })).toBeUndefined();
  });

  it("requires an authenticated app-session response body", () => {
    expect(isAuthenticatedSessionResult({ response: { ok: true }, body: { status: "authenticated" } }))
      .toBe(true);
    expect(isAuthenticatedSessionResult({ response: { ok: true }, body: { status: "unauthenticated" } }))
      .toBe(false);
    expect(isAuthenticatedSessionResult({ response: { ok: false }, body: { status: "authenticated" } }))
      .toBe(false);
  });

  it("retries retryable fetch responses", async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;

    globalThis.fetch = jest.fn(async () => {
      calls += 1;
      return new Response(calls === 1 ? "retry" : "ok", { status: calls === 1 ? 503 : 200 });
    });

    try {
      const response = await fetchWithPolicy("https://example.com/health", {
        retries: 1,
        retryBaseMs: 0,
        timeoutMs: 1000
      });

      expect(calls).toBe(2);
      expect(response.status).toBe(200);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("prefers wrapped session cookies over bearer tokens for RPC", async () => {
    const originalFetch = globalThis.fetch;
    let sentHeaders: Record<string, string> | undefined;

    globalThis.fetch = jest.fn(async (_url, options) => {
      sentHeaders = options?.headers as Record<string, string>;
      return new Response("{}", { status: 200 });
    });

    try {
      await rpc("https://example.com/messages", "keycloak-token", 1, "tools/list", {}, {
        sessionCookie: "authjs.session-token=wrapped-token",
        timeoutMs: 1000
      });

      expect(sentHeaders?.Cookie).toBe("authjs.session-token=wrapped-token");
      expect(sentHeaders?.Authorization).toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("builds pooled Undici dispatcher options from environment", () => {
    process.env.MCP_COMPLIANCE_THEATER_RESOURCE_HTTP_CONNECTIONS = "4";
    process.env.MCP_COMPLIANCE_THEATER_RESOURCE_HTTP_PIPELINING = "2";
    process.env.MCP_COMPLIANCE_THEATER_RESOURCE_HTTP_KEEPALIVE_TIMEOUT_MS = "30000";

    expect(httpDispatcherOptionsFromEnv()).toEqual({
      connections: 4,
      pipelining: 2,
      keepAliveTimeout: 30000,
      keepAliveMaxTimeout: 60000
    });
  });

  it("uses conservative defaults and minimums for pooled HTTP settings", () => {
    process.env.MCP_COMPLIANCE_THEATER_RESOURCE_HTTP_CONNECTIONS = "0";
    process.env.MCP_COMPLIANCE_THEATER_RESOURCE_HTTP_PIPELINING = "-3";
    process.env.MCP_COMPLIANCE_THEATER_RESOURCE_HTTP_KEEPALIVE_TIMEOUT_MS = "90000";

    expect(httpDispatcherOptionsFromEnv()).toEqual({
      connections: 1,
      pipelining: 1,
      keepAliveTimeout: 90000,
      keepAliveMaxTimeout: 90000
    });
  });
});
