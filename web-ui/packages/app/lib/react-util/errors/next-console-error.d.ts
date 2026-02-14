declare const nextDigestSymbol: unique symbol;
declare const nextConsoleErrorType: unique symbol;
export type NextConsoleErrorType = 'error' | 'warning' | 'info' | 'log';
export type NextConsoleError = Error & {
    [nextDigestSymbol]: string;
    [nextConsoleErrorType]?: NextConsoleErrorType;
    environmentName?: string;
};
export declare const isConsoleError: (error: unknown) => error is NextConsoleError;
export {};
//# sourceMappingURL=next-console-error.d.ts.map