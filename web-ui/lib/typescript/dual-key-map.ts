/**
 * DualKeyMap<TRecordType, TRecordIdType, TRecordNameType>
 *
 * A generic dual-key dictionary for fast lookup by both ID and name.
 *
 * - Maintains two maps: idToRecord and nameToId
 * - Supports lookup by either key, and iteration over entries
 * - Used for cases like ProviderMap, ModelMap, etc.
 *
 * @template TRecordType - The record type (e.g., ProviderMapEntry)
 * @template TRecordIdType - The ID type (e.g., string | number)
 * @template TRecordNameType - The name type (e.g., string)
 */
export class DualKeyMap<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TRecordType extends { [K in TIdField | TNameField]: any },
  TRecordIdType extends PropertyKey,
  TRecordNameType extends PropertyKey,
  TIdField extends PropertyKey = PropertyKey,
  TNameField extends PropertyKey = PropertyKey
> {
  private readonly idField: TIdField;
  private readonly nameField: TNameField;
  private readonly idToRecord: Map<TRecordIdType, TRecordType>;
  private readonly nameToId: Map<TRecordNameType, TRecordIdType>;

  /**
   * Create a new DualKeyMap
   * @param idField - The field name in the record that is the ID
   * @param nameField - The field name in the record that is the name
   * @param entries - Optional initial entries as [id, record] pairs
   */
  constructor(idField: TIdField, nameField: TNameField, entries?: IterableIterator<[TRecordIdType, TRecordType]>) {
    this.idField = idField;
    this.nameField = nameField;
    this.idToRecord = new Map(entries ?? []);
    this.nameToId = new Map();
    this.initializeNameToIdMap();
  }

  /**
   * All [id, record] entries
   */
  get entries(): IterableIterator<[TRecordIdType, TRecordType]> {
    return this.idToRecord.entries();
  }

  /**
   * All record IDs
   */
  get allIds(): TRecordIdType[] {
    return Array.from(this.idToRecord.keys());
  }

  /**
   * All record names
   */
  get allNames(): TRecordNameType[] {
    return Array.from(this.nameToId.keys());
  }

  /**
   * Lookup a record by ID or name
   */
  record(idOrName: TRecordIdType | TRecordNameType): TRecordType | undefined {
    let ret = this.idToRecord.get(idOrName as TRecordIdType);
    if (!ret) {
      const id = this.nameToId.get(idOrName as TRecordNameType);
      if (id) {
        ret = this.idToRecord.get(id);
      }
    }
    return ret;
  }

  /**
   * Get the name for a given ID or name
   */
  name(idOrName: TRecordIdType | TRecordNameType): TRecordNameType | undefined {
    const record = this.record(idOrName);
    return record ? (record[this.nameField] as TRecordNameType) : undefined;
  }

  /**
   * Get the ID for a given ID or name
   */
  id(idOrName: TRecordIdType | TRecordNameType): TRecordIdType | undefined {
    const name = this.name(idOrName);
    return name ? this.nameToId.get(name) : undefined;
  }

  /**
   * Check if a record exists by ID or name
   */
  contains(idOrName: TRecordIdType | TRecordNameType): boolean {
    return !!this.record(idOrName);
  }

  /**
   * Add or update a record
   */
  set(id: TRecordIdType, record: TRecordType): void {
    this.idToRecord.set(id, record);
    this.nameToId.set(record[this.nameField] as TRecordNameType, id);
  }

  /**
   * Remove a record by ID or name
   */
  delete(idOrName: TRecordIdType | TRecordNameType): boolean {
    const id = this.id(idOrName);
    if (id) {
      const record = this.idToRecord.get(id);
      if (record) {
        this.nameToId.delete(record[this.nameField] as TRecordNameType);
      }
      return this.idToRecord.delete(id);
    }
    return false;
  }

  /**
   * Clear all records
   */
  clear(): void {
    this.idToRecord.clear();
    this.nameToId.clear();
  }

  /**
   * Rebuild the name-to-id map from the id-to-record map
   */
  private initializeNameToIdMap(): void {
    this.nameToId.clear();
    this.idToRecord.forEach((rec, id) => {
      this.nameToId.set(rec[this.nameField] as TRecordNameType, id);
    });
  }
}
