export declare class DualKeyMap<TRecordType extends {
    [K in TIdField | TNameField]: any;
}, TRecordIdType extends PropertyKey, TRecordNameType extends PropertyKey, TIdField extends PropertyKey = PropertyKey, TNameField extends PropertyKey = PropertyKey> {
    private readonly idField;
    private readonly nameField;
    private readonly idToRecord;
    private readonly nameToId;
    constructor(idField: TIdField, nameField: TNameField, entries?: IterableIterator<[TRecordIdType, TRecordType]>);
    get entries(): IterableIterator<[TRecordIdType, TRecordType]>;
    get allIds(): TRecordIdType[];
    get allNames(): TRecordNameType[];
    record(idOrName: TRecordIdType | TRecordNameType): TRecordType | undefined;
    name(idOrName: TRecordIdType | TRecordNameType): TRecordNameType | undefined;
    id(idOrName: TRecordIdType | TRecordNameType): TRecordIdType | undefined;
    contains(idOrName: TRecordIdType | TRecordNameType): boolean;
    set(id: TRecordIdType, record: TRecordType): void;
    delete(idOrName: TRecordIdType | TRecordNameType): boolean;
    clear(): void;
    private initializeNameToIdMap;
}
//# sourceMappingURL=dual-key-map.d.ts.map