import { ICancellablePromiseExt } from './_types';
export declare const abortablePromise: unique symbol;
export type OperationCancelledError = Error & {
    [abortablePromise]: true;
};
export declare class AbortablePromise<T> implements ICancellablePromiseExt<T> {
    #private;
    static isOperationCancelledError(e: unknown): e is OperationCancelledError;
    static isAbortablePromise<T = unknown>(e: unknown): e is AbortablePromise<T>;
    [Symbol.toStringTag]: string;
    [abortablePromise]: boolean;
    constructor(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void, signal: AbortSignal) => void);
    isMyAbortError(e: unknown): e is OperationCancelledError;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): ICancellablePromiseExt<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined): ICancellablePromiseExt<T | TResult>;
    finally(onfinally?: (() => void) | null | undefined): ICancellablePromiseExt<T>;
    cancel(): void;
    cancelled<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined): ICancellablePromiseExt<T | TResult>;
    get awaitable(): Promise<T>;
}
//# sourceMappingURL=abortable-promise.d.ts.map