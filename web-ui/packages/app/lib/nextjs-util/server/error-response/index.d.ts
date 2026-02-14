export type ErrorResponseOptions = {
    cause?: unknown;
    status?: number;
    message?: string;
    source?: string;
};
export declare const parseResponseOptions: (first?: unknown, second?: unknown) => {
    status: number;
    message: string;
    cause?: string;
    source?: string;
};
export declare const errorResponseFactory: (statusOrError?: unknown, messageOrOptions?: unknown) => Response;
//# sourceMappingURL=index.d.ts.map