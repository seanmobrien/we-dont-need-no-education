export type AwaitedWithTimeout<T> = {
    value: Awaited<T>;
    timedOut?: false;
} | {
    timedOut: true;
    value?: undefined;
};
export declare const withTimeout: <T>(promise: Promise<T>, timeoutMs: number, operation?: string) => Promise<AwaitedWithTimeout<T>>;
export declare const withTimeoutAsError: <T>(promise: Promise<T>, timeoutMs: number, operation?: string) => Promise<T>;
//# sourceMappingURL=with-timeout.d.ts.map