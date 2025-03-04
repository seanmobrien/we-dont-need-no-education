import type { gmail_v1 } from 'googleapis';

/**
 * A specialized map for handling email headers, extending the native `Map` class.
 * This map allows for multiple values per key and provides utility methods for
 * common operations on email headers.
 *
 * @extends Map<string, string | Array<string>>
 */
export class ParsedHeaderMap extends Map<string, string | Array<string>> {
  /**
   * Creates a ParsedHeaderMap instance from an array of Gmail message headers.
   * @param headers - An array of Gmail message headers.
   * @returns A new ParsedHeaderMap instance populated with the provided headers.
   */
  public static fromHeaders(
    headers: gmail_v1.Schema$MessagePart['headers'] | undefined
  ): ParsedHeaderMap {
    const map = new ParsedHeaderMap();
    for (const header of headers ?? []) {
      if (header.name && header.value) {
        if (map.has(header.name)) {
          const existing = map.get(header.name);
          if (Array.isArray(existing)) {
            existing.push(header.value);
          } else if (existing) {
            map.set(header.name, [existing, header.value]);
          } else {
            map.set(header.name, header.value);
          }
        } else {
          map.set(header.name, header.value);
        }
      }
    }
    return map;
  }
  /**
   * Retrieves the first value associated with the specified key.
   * @param key - The key whose first value is to be retrieved.
   * @returns The first value associated with the key, or undefined if the key does not exist.
   */
  public getFirstValue(key: string) {
    const value = this.get(key);
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }
  /**
   * Retrieves the first value associated with the specified key, or a default value if the key does not exist.
   * @param key - The key whose first value is to be retrieved.
   * @param defaultValue - The default value to return if the key does not exist.
   * @returns The first value associated with the key, or the default value if the key does not exist.
   */
  public getFirstValueOrDefault(key: string, defaultValue: string) {
    return this.getFirstValue(key) ?? defaultValue;
  }
  /**
   * Retrieves all values associated with the specified key.
   * @param key - The key whose values are to be retrieved.
   * @returns An array of values associated with the key, or an empty array if the key does not exist.
   */
  public getAllValues(key: string): Array<string> {
    const value = this.get(key);
    return Array.isArray(value) ? value : value ? [value] : [];
  }

  /**
   * Checks if the specified value exists for the given key.
   * @param key - The key to check values against.
   * @param value - The value to check for presence.
   * @returns True if the value exists for the key, otherwise false.
   */
  public hasValue(key: string, value: string): boolean {
    const values = this.getAllValues(key);
    return values.includes(value);
  }

  /**
   * Counts the number of values associated with the specified key.
   * @param key - The key whose associated values are to be counted.
   * @returns The count of values associated with the key.
   */
  public countValues(key: string): number {
    return this.getAllValues(key).length;
  }

  /**
   * Clears all values associated with the specified key.
   * @param key - The key whose values are to be cleared.
   */
  public clearValues(key: string): void {
    this.delete(key);
  }

  /**
   * Clears all values in the map.
   * @returns void
   */
  public clearAllValues(): void {
    this.clear();
  }
}

/**
 * Checks if the given value is an instance of ParsedHeaderMap.
 *
 * @param value - The value to check.
 * @returns True if the value is an instance of ParsedHeaderMap, otherwise false.
 */
export const isParsedHeaderMap = (value: unknown): value is ParsedHeaderMap =>
  value instanceof ParsedHeaderMap;
