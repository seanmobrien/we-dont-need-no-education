export type AwaitedWithTimeout<T> = {
    value: Awaited<T>;
    timedOut?: false;
} | {
    timedOut: true;
    value?: undefined;
};
/**
   * Creates a timeout wrapper for async operations
   */
export declare const withTimeout: <T>(promise: Promise<T>, timeoutMs: number, operation?: string) => Promise<AwaitedWithTimeout<T>>;
/**
 * Creates a timeout wrapper for async operations that throws an error if the timeout is exceeded
 */
export declare const withTimeoutAsError: <T>(promise: Promise<T>, timeoutMs: number, operation?: string) => Promise<T>;
//# sourceMappingURL=with-timeout.d.ts.map