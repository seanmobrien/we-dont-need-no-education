import type { ErrorWithCode } from "./types";

export function asError(error: unknown): ErrorWithCode {
  return error instanceof Error ? error as ErrorWithCode : new Error(String(error));
}

export function httpStatusError(message: string, status: number): ErrorWithCode & { status: number } {
  const error = new Error(message) as ErrorWithCode & { status: number };
  error.status = status;
  return error;
}

export function httpStatusFromError(error: unknown): number | undefined {
  const normalized = asError(error) as ErrorWithCode & { status?: number };
  if (typeof normalized.status === "number") {
    return normalized.status;
  }
  const match = /\bHTTP\s+(\d{3})\b/i.exec(normalized.message);
  return match ? Number(match[1]) : undefined;
}

export function isHttpBadRequest(error: unknown): boolean {
  return httpStatusFromError(error) === 400;
}