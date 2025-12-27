import { IsNotNull, UnionToTuple } from './_types';
import { AbortablePromise } from './abortable-promise';
export declare const isOperationCancelledError: typeof AbortablePromise.isOperationCancelledError;
export declare const isAbortablePromise: typeof AbortablePromise.isAbortablePromise;
interface IsKeyOfGuard {
    <T extends readonly (string | number | symbol)[]>(key: unknown, check: T): key is T[number];
    <T extends object>(key: unknown, check?: undefined | null): key is keyof T;
    <T extends object>(key: unknown): key is keyof T;
    <T extends object>(key: unknown, check: T): key is keyof T;
}
export declare const isKeyOf: IsKeyOfGuard;
export declare const isMemberOfUnion: <T extends string | number | symbol, TCheck extends UnionToTuple<T> = UnionToTuple<T>>(check: unknown, union: TCheck) => check is T;
export declare const isPromise: <T = void>(check: unknown) => check is Promise<T>;
export declare const isNotNull: <T>(value: T | null | undefined) => value is IsNotNull<T>;
export type BrandedUuid = `${string}-${string}-${string}-${string}-${string}`;
export declare const isValidUuid: (check: unknown) => check is BrandedUuid;
export {};
//# sourceMappingURL=_guards.d.ts.map