export type DataIntegrityErrorOptions = ErrorOptions & {
    table?: string;
    id?: unknown;
    source?: string;
};
export declare class DataIntegrityError extends Error {
    #private;
    static isDataIntegrityError(e: unknown): e is DataIntegrityError;
    static buildMessage(options: DataIntegrityErrorOptions): string;
    [Symbol.toStringTag]: string;
    constructor(message: string | DataIntegrityErrorOptions, options?: DataIntegrityErrorOptions);
    get table(): string;
    get source(): string;
    get message(): string;
}
//# sourceMappingURL=data-integrity-error.d.ts.map