const brandDataIntegrityError = Symbol('DataIntegrityError');
export class DataIntegrityError extends Error {
    static isDataIntegrityError(e) {
        return (typeof e === 'object' &&
            e !== null &&
            'cause' in e &&
            e.cause === brandDataIntegrityError);
    }
    static buildMessage(options) {
        const { table, source } = options;
        return [
            table ? `Table '${table}'` : 'DataIntegrity error',
            source ? `Source: ${source}` : '',
        ]
            .filter(Boolean)
            .join(' ');
    }
    #table;
    #source;
    [Symbol.toStringTag] = 'DataIntegrityError';
    constructor(message, options) {
        super(typeof message === 'string'
            ? message
            : DataIntegrityError.buildMessage(message), { cause: brandDataIntegrityError });
        this.name = 'DataIntegrityError';
        this.#table = options?.table ?? '';
        this.#source = options?.source ?? '';
        this[Symbol.toStringTag] = this.message;
    }
    get table() {
        return this.#table;
    }
    get source() {
        return this.#source;
    }
    get message() {
        const ret = super.message;
        return ret ?? `Data Integrity issue detected on table ${this.#table}`;
    }
}
//# sourceMappingURL=data-integrity-error.js.map