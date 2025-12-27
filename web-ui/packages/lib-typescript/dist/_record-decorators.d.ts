declare const RecordIsDirty: unique symbol;
declare const RecordUuid: unique symbol;
export declare const getDecoratorSymbols: () => {
    dirty: symbol;
    uuid: symbol;
};
export type RecordWithDirtyState<T extends object> = T & {
    [RecordIsDirty]?: boolean;
};
export type RecordWithUuid<T extends object> = T & {
    [RecordUuid]?: string | null;
};
export declare const isRecordWithDirtyState: <T extends object>(check: unknown) => check is RecordWithDirtyState<T>;
export declare const isRecordDirty: (record: object) => boolean;
export declare const setRecordDirty: <T extends object>(record: object, isDirty?: boolean) => record is RecordWithDirtyState<T>;
export declare const isRecordWithUuid: <T extends object>(check: T | unknown) => check is RecordWithUuid<T>;
export declare const getUuid: (record: unknown) => string | null | undefined;
export declare const newUuid: () => string;
export declare const setUuid: <T extends object>(record: T, uuid?: string | null) => RecordWithUuid<T>;
export {};
//# sourceMappingURL=_record-decorators.d.ts.map