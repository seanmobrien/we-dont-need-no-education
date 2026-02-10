export declare const isError: (value: unknown) => value is Error;
export type SafeProgressEvent<T extends EventTarget = EventTarget> = Event & {
    readonly lengthComputable: boolean;
    readonly loaded: number;
    readonly target: T | null;
    readonly total: number;
};
export declare const isXmlHttpRequest: (value: unknown) => value is XMLHttpRequest;
export declare const isProgressEvent: (value: unknown) => value is SafeProgressEvent<XMLHttpRequest>;
export declare const isAbortError: (value: unknown) => value is Error;
export declare const getStackTrace: ({ skip, max, myCodeOnly, }?: {
    skip?: number;
    max?: number;
    myCodeOnly?: boolean;
}) => string;
//# sourceMappingURL=error-guards.d.ts.map