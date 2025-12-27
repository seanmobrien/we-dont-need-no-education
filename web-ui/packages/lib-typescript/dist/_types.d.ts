export type UnionToTuple<T> = ((T extends any ? (t: T) => T : never) extends (t: infer U) => any ? U : never) extends {
    [K in any]: infer E;
} ? E[] : never;
export type TupleToUnion<T extends any[]> = T[number];
export type UnionToObject<T extends string | number | symbol> = {
    [K in T]: any;
};
export type ArrayElement<T extends readonly any[] | undefined | null> = T extends readonly (infer U)[] ? U : never;
export type PickField<T, K extends keyof T> = Pick<T, K>[K];
export type PartialExceptFor<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>;
export type KebabToCamelCase<S extends string> = S extends `${infer T}-${infer U}` ? `${T}${Capitalize<KebabToCamelCase<U>>}` : S;
export type KeyOf<T> = keyof T;
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
export type ICancellablePromise<T> = Pick<Promise<T>, 'then' | 'catch' | 'finally'> & {
    cancel: () => void;
    readonly awaitable: Promise<T>;
};
export type ICancellablePromiseExt<T> = Omit<ICancellablePromise<T>, 'catch' | 'then' | 'finally'> & {
    cancelled<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined): ICancellablePromiseExt<T | TResult>;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): ICancellablePromiseExt<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined): ICancellablePromiseExt<T | TResult>;
    finally(onfinally?: (() => void) | null | undefined): ICancellablePromiseExt<T>;
};
export type FirstParameter<T extends (...args: any) => any> = T extends (arg1: infer P, ...args: any) => any ? P : never;
export type FunctionArguments<T extends (...args: any) => any> = T extends (...args: infer A) => any ? A : never;
export type KeysOfMethods<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];
export type MethodsOf<T> = Pick<T, KeysOfMethods<T>>;
export type ReturnTypeOfMethods<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => infer R ? R : never;
}[keyof MethodsOf<T>];
export type ExcludeExactMatch<T, U> = T extends U ? never : T;
export type IsNotNull<K> = K extends null ? never : K extends undefined ? never : K;
//# sourceMappingURL=_types.d.ts.map