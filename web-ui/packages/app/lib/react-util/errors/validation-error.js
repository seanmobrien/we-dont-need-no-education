const brandValidationError = Symbol('ValidationError');
export class ValidationError extends Error {
    static isValidationError(e) {
        return (typeof e === 'object' &&
            e !== null &&
            'cause' in e &&
            e.cause === brandValidationError);
    }
    static buildMessage(options) {
        const { field, value, expected, reason, source } = options;
        return [
            field ? `Field '${field}'` : 'Validation error',
            value ? `Value: ${JSON.stringify(value)}` : '',
            expected ? `Expected: ${JSON.stringify(expected)}` : '',
            reason ? `Reason: ${reason}` : '',
            source ? `Source: ${source}` : '',
        ]
            .filter(Boolean)
            .join(' ');
    }
    #field;
    #value;
    #expected;
    #reason;
    #source;
    [Symbol.toStringTag] = 'ValidationError';
    constructor(message, options) {
        super(typeof message === 'string'
            ? message
            : ValidationError.buildMessage(message), { cause: brandValidationError });
        this.name = 'ValidationError';
        this.#field = options?.field ?? '';
        this.#value = options?.value ?? '';
        this.#expected = options?.expected ?? '';
        this.#reason = options?.reason ?? '';
        this.#source = options?.source ?? '';
        this[Symbol.toStringTag] = this.message;
    }
    get field() {
        return this.#field;
    }
    get value() {
        return this.#value;
    }
    get expected() {
        return this.#expected;
    }
    get reason() {
        return this.#reason;
    }
    get source() {
        return this.#source;
    }
}
//# sourceMappingURL=validation-error.js.map