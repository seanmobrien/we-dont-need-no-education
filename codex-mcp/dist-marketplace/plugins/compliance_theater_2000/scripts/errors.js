"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asError = asError;
exports.httpStatusError = httpStatusError;
exports.httpStatusFromError = httpStatusFromError;
exports.isHttpBadRequest = isHttpBadRequest;
function asError(error) {
    return error instanceof Error ? error : new Error(String(error));
}
function httpStatusError(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
}
function httpStatusFromError(error) {
    const normalized = asError(error);
    if (typeof normalized.status === "number") {
        return normalized.status;
    }
    const match = /\bHTTP\s+(\d{3})\b/i.exec(normalized.message);
    return match ? Number(match[1]) : undefined;
}
function isHttpBadRequest(error) {
    return httpStatusFromError(error) === 400;
}
//# sourceMappingURL=errors.js.map