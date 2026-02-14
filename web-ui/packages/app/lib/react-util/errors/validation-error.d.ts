export type ValidationErrorOptions = {
    field?: string;
    value?: unknown;
    expected?: unknown;
    reason?: string;
    source?: string;
};
export declare class ValidationError extends Error {
    #private;
    static isValidationError(e: unknown): e is ValidationError;
    static buildMessage(options: ValidationErrorOptions): string;
    [Symbol.toStringTag]: string;
    constructor(message: string | ValidationErrorOptions, options?: ValidationErrorOptions);
    get field(): string;
    get value(): unknown;
    get expected(): unknown;
    get reason(): string;
    get source(): string;
}
//# sourceMappingURL=validation-error.d.ts.map