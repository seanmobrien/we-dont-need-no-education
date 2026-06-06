import { warnIfInsecureUrl } from "./runtime-utils";
import { log, optional, serverUrl } from "./config";

export function sessionEndpointUrl(): string {
  const explicit = optional("SESSION_STATUS_URL");
  if (explicit) {
    warnIfInsecureUrl(explicit, log, "Session status URL");
    return explicit;
  }
  const parsed = new URL(serverUrl());
  parsed.pathname = "/api/auth/session";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

export function wrapEndpointUrl(): string {
  const explicit = optional("WRAP_URL");
  if (explicit) {
    warnIfInsecureUrl(explicit, log, "Session wrap URL");
    return explicit;
  }
  const parsed = new URL(serverUrl());
  parsed.pathname = "/api/auth/wrap";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

export function appEndpointUrl(pathname: string, query: Record<string, unknown> = {}): string {
  const parsed = new URL(serverUrl());
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

export function memoryEndpointUrl(pathname: string, query?: Record<string, unknown>): string {
  return appEndpointUrl(`/api/memory/${pathname.replace(/^\/+/, "")}`, query);
}

export function documentUnitEndpointUrl(caseFileId: string | number): string {
  return appEndpointUrl(`/api/document-unit/${encodeURIComponent(String(caseFileId))}`);
}

export function documentUnitEmbeddingsEndpointUrl(
  caseFileId: string | number,
  modelSize: string,
  index?: string | number
): string {
  const encodedId = encodeURIComponent(String(caseFileId));
  const encodedIndex = index === undefined || index === null || index === ""
    ? undefined
    : encodeURIComponent(String(index));
  return appEndpointUrl(
    `/api/document-unit/${encodedId}/embeddings${encodedIndex === undefined ? "" : `/${encodedIndex}`}`,
    { size: modelSize }
  );
}

export function documentUnitEmbeddingsEndpointPath(caseFileId: string | number, index?: string | number): string {
  const encodedId = encodeURIComponent(String(caseFileId));
  const encodedIndex = index === undefined || index === null || index === ""
    ? undefined
    : encodeURIComponent(String(index));
  return `/api/document-unit/${encodedId}/embeddings${encodedIndex === undefined ? "" : `/${encodedIndex}`}`;
}

export function aiEmbedEndpointUrl(): string {
  return appEndpointUrl("/api/ai/embed");
}

export function aiEmbedEndpointPath(): string {
  return "/api/ai/embed";
}
