import assert from "node:assert/strict";
import test from "node:test";
import {
  backoffDelayMs,
  // fetchWithPolicy, // Not ported
  isUsableCachedToken,
  parseNumber,
  // resolveEndpoint, // Not ported
  // warnIfInsecureUrl // Not ported
} from "./runtime-utils";

test("parseNumber falls back and clamps to the minimum", () => {
  assert.equal(parseNumber(undefined, 15, 1), 15);
  assert.equal(parseNumber("-5", 15, 0), 0);
  assert.equal(parseNumber("25", 15, 0), 25);
});

test("backoffDelayMs grows exponentially", () => {
  assert.equal(backoffDelayMs(0, 250), 250);
  assert.equal(backoffDelayMs(2, 250), 1000);
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
