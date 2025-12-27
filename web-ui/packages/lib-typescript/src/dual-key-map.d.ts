/**
 * Type declarations for DualKeyMap data structure.
 *
 * This module provides a specialized Map implementation that allows lookup by either
 * an ID field or a name field. Useful for scenarios where entities can be referenced
 * by multiple keys, such as models, providers, or other registry patterns.
 *
 * @module lib/typescript/dual-key-map
 */

declare module '@/lib/typescript/dual-key-map' {
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
   * @template TIdField - The property key in TRecordType that contains the ID
   * @template TNameField - The property key in TRecordType that contains the name
   *
   * @example
   * ```typescript
   * type Provider = {
   *   id: string;
   *   name: string;
   *   config: object;
   * };
   *
   * const providers = new DualKeyMap<Provider, string, string, 'id', 'name'>('id', 'name');
   * providers.set('provider-1', { id: 'provider-1', name: 'azure', config: {} });
   *
   * // Lookup by ID
   * const byId = providers.record('provider-1');
   *
   * // Lookup by name
   * const byName = providers.record('azure');
   *
   * console.log(byId === byName); // true
   * ```
   */
  export class DualKeyMap<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TRecordType extends { [K in TIdField | TNameField]: any },
    TRecordIdType extends PropertyKey,
    TRecordNameType extends PropertyKey,
    TIdField extends PropertyKey = PropertyKey,
    TNameField extends PropertyKey = PropertyKey,
  > {
    /**
     * Create a new DualKeyMap
     * @param idField - The field name in the record that is the ID
     * @param nameField - The field name in the record that is the name
     * @param entries - Optional initial entries as [id, record] pairs
     */
    constructor(
      idField: TIdField,
      nameField: TNameField,
      entries?: IterableIterator<[TRecordIdType, TRecordType]>,
    );

    /**
     * All [id, record] entries
     */
    get entries(): IterableIterator<[TRecordIdType, TRecordType]>;

    /**
     * All record IDs
     */
    get allIds(): TRecordIdType[];

    /**
     * All record names
     */
    get allNames(): TRecordNameType[];

    /**
     * Lookup a record by ID or name
     *
     * @param idOrName - The ID or name to look up
     * @returns The record if found, undefined otherwise
     *
     * @example
     * ```typescript
     * const provider = providers.record('azure'); // Lookup by name
     * const sameProvider = providers.record('provider-1'); // Lookup by ID
     * ```
     */
    record(idOrName: TRecordIdType | TRecordNameType): TRecordType | undefined;

    /**
     * Get the name for a given ID or name
     *
     * @param idOrName - The ID or name to look up
     * @returns The name if found, undefined otherwise
     *
     * @example
     * ```typescript
     * const name = providers.name('provider-1'); // Returns 'azure'
     * ```
     */
    name(
      idOrName: TRecordIdType | TRecordNameType,
    ): TRecordNameType | undefined;

    /**
     * Get the ID for a given ID or name
     *
     * @param idOrName - The ID or name to look up
     * @returns The ID if found, undefined otherwise
     *
     * @example
     * ```typescript
     * const id = providers.id('azure'); // Returns 'provider-1'
     * ```
     */
    id(idOrName: TRecordIdType | TRecordNameType): TRecordIdType | undefined;

    /**
     * Check if a record exists by ID or name
     *
     * @param idOrName - The ID or name to check
     * @returns True if the record exists, false otherwise
     *
     * @example
     * ```typescript
     * if (providers.contains('azure')) {
     *   console.log('Azure provider is registered');
     * }
     * ```
     */
    contains(idOrName: TRecordIdType | TRecordNameType): boolean;

    /**
     * Add or update a record
     *
     * @param id - The ID to store the record under
     * @param record - The record to store
     *
     * @example
     * ```typescript
     * providers.set('provider-2', {
     *   id: 'provider-2',
     *   name: 'google',
     *   config: { apiKey: 'xxx' }
     * });
     * ```
     */
    set(id: TRecordIdType, record: TRecordType): void;

    /**
     * Remove a record by ID or name
     *
     * @param idOrName - The ID or name of the record to delete
     * @returns True if a record was deleted, false if not found
     *
     * @example
     * ```typescript
     * providers.delete('azure'); // Delete by name
     * providers.delete('provider-1'); // Delete by ID
     * ```
     */
    delete(idOrName: TRecordIdType | TRecordNameType): boolean;

    /**
     * Clear all records
     *
     * @example
     * ```typescript
     * providers.clear(); // Removes all providers
     * ```
     */
    clear(): void;
  }
}
