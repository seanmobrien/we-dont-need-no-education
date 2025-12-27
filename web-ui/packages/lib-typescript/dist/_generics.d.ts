export type OneOrMany<TInput, TOutput = TInput> = {
    (input: TInput): TOutput;
    (input: Array<TInput>): Array<TOutput>;
};
export declare const forOneOrMany: <TInput, TOutput>(forOne: (input: TInput) => TOutput, input: TInput | Array<TInput>) => TInput extends Array<TInput> ? Array<TOutput> : TOutput;
export interface ServiceInstanceOverloads<TService> {
    (): TService;
    <TResult>(callback: (service: TService) => TResult): TResult;
}
export declare const serviceInstanceOverloadsFactory: <TService>(serviceFactory: () => TService) => ServiceInstanceOverloads<TService>;
export declare const unwrapPromise: <T>(value: T | Promise<T>) => Promise<T>;
//# sourceMappingURL=_generics.d.ts.map