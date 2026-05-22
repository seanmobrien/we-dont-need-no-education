import assert from "node:assert/strict";
import test from "node:test";
import {
  backoffDelayMs,
  fetchWithPolicy,
  isAuthenticatedSessionResult,
  isUsableCachedToken,
  parseNumber,
  resolveEndpoint,
  warnIfInsecureUrl
} from "./runtime-utils.mjs";

test("parseNumber falls back and clamps to the minimum", () => {
  assert.equal(parseNumber(undefined, 15, 1), 15);
  assert.equal(parseNumber("-5", 15, 0), 0);
  assert.equal(parseNumber("25", 15, 0), 25);
});

test("backoffDelayMs grows exponentially", () => {
  assert.equal(backoffDelayMs(0, 250), 250);
  assert.equal(backoffDelayMs(2, 250), 1000);
});

test("resolveEndpoint resolves relative SSE endpoints", () => {
  assert.equal(
    resolveEndpoint("./messages", "https://example.com/api/ai/tools/sse"),
    "https://example.com/api/ai/tools/messages"
  );
});

test("isUsableCachedToken honors the expiry skew", () => {
  assert.equal(
    isUsableCachedToken({ access_token: "token", expires_at: Date.now() + 120000 }, 60000),
    true
  );
  assert.equal(
    isUsableCachedToken({ access_token: "token", expires_at: Date.now() + 30000 }, 60000),
    false
  );
});

test("warnIfInsecureUrl flags remote http URLs but ignores localhost", () => {
  const messages = [];
  warnIfInsecureUrl("http://example.com/service", (message) => messages.push(message), "OAuth issuer");
  warnIfInsecureUrl("http://localhost:3000/service", (message) => messages.push(message), "OAuth issuer");

  assert.deepEqual(messages, ["OAuth issuer is using insecure HTTP: http://example.com/service"]);
});

test("isAuthenticatedSessionResult requires an authenticated app session body", () => {
  assert.equal(
    isAuthenticatedSessionResult({ response: { ok: true }, body: { status: "authenticated" } }),
    true
  );
  assert.equal(
    isAuthenticatedSessionResult({ response: { ok: true }, body: { status: "unauthenticated" } }),
    false
  );
  assert.equal(
    isAuthenticatedSessionResult({ response: { ok: false }, body: { status: "authenticated" } }),
    false
  );
});

test("fetchWithPolicy retries retryable responses", async () => {
  const originalFetch = global.fetch;
  let calls = 0;

  global.fetch = async () => {
    calls += 1;
    return new Response(calls === 1 ? "retry" : "ok", { status: calls === 1 ? 503 : 200 });
  };

  try {
    const response = await fetchWithPolicy("https://example.com/health", {
      retries: 1,
      retryBaseMs: 0,
      timeoutMs: 1000
    });

    assert.equal(calls, 2);
    assert.equal(response.status, 200);
  } finally {
    global.fetch = originalFetch;
  }
});
