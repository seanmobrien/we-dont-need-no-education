import type { ErrorWithCode } from "./types";
export declare function asError(error: unknown): ErrorWithCode;
export declare function httpStatusError(message: string, status: number): ErrorWithCode & {
    status: number;
};
export declare function httpStatusFromError(error: unknown): number | undefined;
export declare function isHttpBadRequest(error: unknown): boolean;
//# sourceMappingURL=errors.d.ts.map