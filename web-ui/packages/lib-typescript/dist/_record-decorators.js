import { v4 as uuidv4 } from 'uuid';
const RecordIsDirty = Symbol('RecordIsDirty');
const RecordUuid = Symbol('RecordUuid');
export const getDecoratorSymbols = () => ({
    dirty: RecordIsDirty,
    uuid: RecordUuid,
});
export const isRecordWithDirtyState = (check) => {
    const record = check;
    return record[RecordIsDirty] !== undefined;
};
export const isRecordDirty = (record) => isRecordWithDirtyState(record) && record[RecordIsDirty] === true;
export const setRecordDirty = (record, isDirty = true) => {
    record[RecordIsDirty] = isDirty;
    return true;
};
export const isRecordWithUuid = (check) => (check &&
    typeof check === 'object' &&
    check[RecordUuid] !== undefined) == true;
export const getUuid = (record) => isRecordWithUuid(record) ? record[RecordUuid] : undefined;
export const newUuid = () => uuidv4();
export const setUuid = (record, uuid) => {
    const work = record;
    work[RecordUuid] = uuid === undefined ? newUuid() : uuid;
    return work;
};
