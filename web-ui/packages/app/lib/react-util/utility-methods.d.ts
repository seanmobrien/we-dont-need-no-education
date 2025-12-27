export declare const generateUniqueId: () => string;
export declare const isError: (value: unknown) => value is Error;
export type SafeProgressEvent<T extends EventTarget = EventTarget> = Event & {
    /**
     * The **`ProgressEvent.lengthComputable`** read-only property is a boolean flag indicating if the resource concerned by the length
     * of the operation.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ProgressEvent/lengthComputable)
     */
    readonly lengthComputable: boolean;
    /**
     * The **`ProgressEvent.loaded`** read-only property is a number indicating the size of the data already transmitted or processed.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ProgressEvent/loaded)
     */
    readonly loaded: number;
    readonly target: T | null;
    /**
     * The **`ProgressEvent.total`** read-only property is a number indicating the total size of the data being transmitted or processed.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ProgressEvent/total)
     */
    readonly total: number;
};
export declare const isXmlHttpRequest: (value: unknown) => value is XMLHttpRequest;
export declare const isProgressEvent: (value: unknown) => value is SafeProgressEvent<XMLHttpRequest>;
export declare const isAbortError: (value: unknown) => value is Error;
export declare const isTemplateStringsArray: (value: unknown) => value is TemplateStringsArray;
export declare const isTruthy: (value: unknown, defaultValue?: boolean) => boolean;
export declare const isRecord: (check: unknown) => check is Record<string, unknown>;
export declare const TypeBrandSymbol: unique symbol;
export declare const isTypeBranded: <TResult>(check: unknown, brand: symbol) => check is TResult;
type CategorizedPromiseResult<T> = {
    fulfilled: Array<T>;
    rejected: Array<unknown>;
    pending: Array<Promise<T>>;
};
export declare const getResolvedPromises: <T>(promises: Promise<T>[], timeoutMs?: number) => Promise<CategorizedPromiseResult<T>>;
export {};
//# sourceMappingURL=utility-methods.d.ts.map