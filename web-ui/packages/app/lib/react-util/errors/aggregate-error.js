export class AggregateError extends Error {
    static isAggregateError(e) {
        return e instanceof AggregateError;
    }
    static buildMessage(messageOrError, errors) {
        return messageOrError instanceof Error
            ? `An aggregate error has occurred:\n${[
                messageOrError,
                ...(errors ?? []),
            ].join('\n')}`
            : `${messageOrError}\n${errors.map((e) => e.message).join('\n')}`;
    }
    static fromErrors(errors) {
        return new AggregateError(...[errors[0], ...(errors.slice(1) ?? [])]);
    }
    constructor(...[messageOrError, ...errors]) {
        super(AggregateError.buildMessage(messageOrError, errors));
        this.name = 'AggregateError';
        this.#errors =
            typeof messageOrError == 'object'
                ? [messageOrError, ...errors]
                : [...errors];
    }
    #errors;
    get count() {
        return this.#errors.length;
    }
    get(index) {
        return this.#errors[index];
    }
    all() {
        return [...this.#errors];
    }
    toString() {
        return this.message;
    }
}
//# sourceMappingURL=aggregate-error.js.map