export declare class AggregateError extends Error {
    #private;
    static isAggregateError(e: unknown): e is AggregateError;
    private static buildMessage;
    static fromErrors(errors: Error[]): AggregateError;
    constructor(...[messageOrError, ...errors]: [string | Error, ...Error[]]);
    [index: number]: Error;
    get count(): number;
    get(index: number): Error;
    all(): Error[];
    toString(): string;
}
//# sourceMappingURL=aggregate-error.d.ts.map