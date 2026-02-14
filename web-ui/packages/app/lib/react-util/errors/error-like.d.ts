declare const isErrorLikeBrand: unique symbol;
export type ErrorLike = {
    message: string;
    name: string;
    stack?: string;
    cause?: unknown;
    source?: string;
    line?: number;
    column?: number;
    [isErrorLikeBrand]?: true;
};
export type AsErrorLikeOptions = Partial<Omit<ErrorLike, 'message'>> & {
    line?: number;
    col?: number;
    filename?: string;
};
export type StringOrErrorLike = string | ErrorLike;
export declare const isErrorLike: (value: unknown) => value is ErrorLike;
export declare const isStringOrErrorLike: (value: unknown) => value is StringOrErrorLike;
type ErrorLikeOptions = Partial<Omit<ErrorLike, 'message'> & Omit<ErrorEventInit, 'message' | 'error'>>;
export declare const asErrorLike: (value: unknown, options?: ErrorLikeOptions) => ErrorLike | undefined;
export {};
//# sourceMappingURL=error-like.d.ts.map