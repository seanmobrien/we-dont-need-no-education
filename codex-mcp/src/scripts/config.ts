import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { asError } from "./errors";
import { parseNumber, warnIfInsecureUrl } from "./runtime-utils";
import type { OAuthMetadata, Toolset } from "./types";

const PREFIX = "MCP_COMPLIANCE_THEATER_RESOURCE_";
const env = process.env;
let logWriteFailed = false;

const defaultEnvValues: Record<string, string> = {
  SERVER_URL: "https://full-ui.compliance-theater.obapps.net/api/ai/tools/sse",
  AUTH_ISSUER: "https://login.obapps.net/realms/compliance-theater",
  CLIENT_ID: "codex",
  OAUTH_SCOPE: "openid",
};

const DEFAULT_SSE_PATH = "/api/ai/tools/sse";

function key(name: string): string {
  return `${PREFIX}${name}`;
}

function resolveValue(value?: string): string | undefined {
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

export function optional(name: string): string | undefined {
  const resolved = resolveValue(env[key(name)]);
  const value = !resolved || resolved.startsWith("[TODO:")
    ? defaultEnvValues[name]
    : resolved;
  if (!value || value.startsWith("[TODO:")) {
    return undefined;
  }
  return value;
}

export function configuredToolset(): Toolset {
  const value = optional("TOOLSET")?.trim().toLowerCase();
  if (
    value === "all" ||
    value === "default" ||
    value === "memory" ||
    value === "utils" ||
    value === "todo" ||
    value === "case-workspace" ||
    value === "search" ||
    value === "case-files"
  ) {
    return value;
  }
  return "all";
}

export function required(name: string): string {
  const value = optional(name);
  if (!value) {
    throw new Error(`Missing required environment variable ${key(name)}`);
  }
  return value;
}

export function normalizeServerUrl(value: string): string {
  const parsed = new URL(value);
  if (parsed.pathname === "/" && !parsed.search && !parsed.hash) {
    parsed.pathname = DEFAULT_SSE_PATH;
  }
  return parsed.toString();
}

export function serverUrl(): string {
  return normalizeServerUrl(required("SERVER_URL"));
}

export function logFilePath(): string {
  return optional("LOG_FILE") ||
    join(homedir(), ".codex", "compliance_theater", "compliance_theater_wrapper.log");
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([name, item]) => [
      name,
      /token|secret|password|authorization|credential/i.test(name) ? "[redacted]" : redact(item)
    ])
  );
}

export function log(message: string, details?: unknown): void {
  console.error(`[compliance_theater] ${message}`);
  const payload = {
    timestamp: new Date().toISOString(),
    pid: process.pid,
    message,
    ...(details ? { details: redact(details) } : {})
  };

  const path = logFilePath();
  try {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${JSON.stringify(payload)}\n`, "utf8");
  } catch (error) {
    if (!logWriteFailed) {
      logWriteFailed = true;
      console.error(`[compliance_theater] could not write log file ${path}: ${asError(error).message}`);
    }
  }
}

export function cachePath(): string {
  return optional("TOKEN_CACHE_PATH") ||
    join(homedir(), ".codex", "compliance_theater", "compliance_theater_token_cache.json");
}

function legacyDeviceLoginPath(): string {
  return join(homedir(), ".codex", "compliance_theater", "compliance_theater_device_login.json");
}

export function neo4jCredentialCachePath(): string {
  return join(dirname(cachePath()), "compliance_theater_neo4j_credentials.json");
}

export function credentialCachePaths(): Array<{ path: string; label: string }> {
  const paths = [
    { path: cachePath(), label: "cached OAuth token, refresh token, and wrapped Auth.js session cookie" },
    { path: legacyDeviceLoginPath(), label: "legacy device-login state" },
    { path: neo4jCredentialCachePath(), label: "cached Neo4j graph credentials" }
  ];
  const seen = new Set<string>();
  return paths.filter(({ path }) => {
    if (seen.has(path)) {
      return false;
    }
    seen.add(path);
    return true;
  });
}

export function tokenSkewMs(): number {
  return parseNumber(optional("TOKEN_EXPIRY_SKEW_SECONDS"), 60, 0) * 1000;
}

export function httpTimeoutMs(): number {
  return parseNumber(optional("HTTP_TIMEOUT_MS"), 360000, 1000);
}

export function httpRetryCount(): number {
  return parseNumber(optional("HTTP_RETRY_COUNT"), 2, 0);
}

export function httpRetryBaseMs(): number {
  return parseNumber(optional("HTTP_RETRY_BASE_MS"), 500, 0);
}

export function proxyRequestTimeoutMs(): number {
  return parseNumber(optional("PROXY_REQUEST_TIMEOUT_MS"), 360000, 1000);
}

export function embeddingCacheMaxEntries(): number {
  return parseNumber(optional("EMBEDDING_CACHE_MAX_ENTRIES"), 256, 0);
}

export function embeddingCacheTtlMs(): number {
  return parseNumber(optional("EMBEDDING_CACHE_TTL_MS"), 10 * 60 * 1000, 0);
}

function normalizeIssuer(value: string): string {
  return value.replace(/\/+$/, "");
}

export function metadataCandidates(): string[] {
  const explicit = optional("AUTH_METADATA_URL");
  if (explicit) {
    warnIfInsecureUrl(explicit, log, "OAuth metadata URL");
    return [explicit];
  }

  const issuer = normalizeIssuer(required("AUTH_ISSUER"));
  warnIfInsecureUrl(issuer, log, "OAuth issuer");
  const url = new URL(issuer);
  const issuerPath = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
  return [
    `${url.origin}/.well-known/oauth-authorization-server${issuerPath}`,
    `${issuer}/.well-known/oauth-authorization-server`
  ];
}
