export class DualKeyMap {
    idField;
    nameField;
    idToRecord;
    nameToId;
    constructor(idField, nameField, entries) {
        this.idField = idField;
        this.nameField = nameField;
        this.idToRecord = new Map(entries ?? []);
        this.nameToId = new Map();
        this.initializeNameToIdMap();
    }
    get entries() {
        return this.idToRecord.entries();
    }
    get allIds() {
        return Array.from(this.idToRecord.keys());
    }
    get allNames() {
        return Array.from(this.nameToId.keys());
    }
    record(idOrName) {
        let ret = this.idToRecord.get(idOrName);
        if (!ret) {
            const id = this.nameToId.get(idOrName);
            if (id) {
                ret = this.idToRecord.get(id);
            }
        }
        return ret;
    }
    name(idOrName) {
        const record = this.record(idOrName);
        return record ? record[this.nameField] : undefined;
    }
    id(idOrName) {
        const name = this.name(idOrName);
        return name ? this.nameToId.get(name) : undefined;
    }
    contains(idOrName) {
        return !!this.record(idOrName);
    }
    set(id, record) {
        this.idToRecord.set(id, record);
        this.nameToId.set(record[this.nameField], id);
    }
    delete(idOrName) {
        const id = this.id(idOrName);
        if (id) {
            const record = this.idToRecord.get(id);
            if (record) {
                this.nameToId.delete(record[this.nameField]);
            }
            return this.idToRecord.delete(id);
        }
        return false;
    }
    clear() {
        this.idToRecord.clear();
        this.nameToId.clear();
    }
    initializeNameToIdMap() {
        this.nameToId.clear();
        this.idToRecord.forEach((rec, id) => {
            this.nameToId.set(rec[this.nameField], id);
        });
    }
}
