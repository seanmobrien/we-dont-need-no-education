import { ContactSummary } from '/data-models/api/contact';
import { isKeyOf } from '../typescript';

/**
 * Represents an email header with a name and value.
 */
export interface EmailHeader {
  /**
   * The name of the header before the `:` separator. For example, `To`.
   */
  name?: string | null;
  /**
   * The value of the header after the `:` separator. For example, `someuser@example.com`.
   */
  value?: string | null;
}

/**
 * Parses an email ID from a string.
 *
 * @param {string} x - The string to parse.
 * @returns {string} The parsed email ID.
 */
export type ContactInHeader = Omit<ContactSummary, 'name' | 'contactId'> & {
  name?: string;
};

/**
 * Properties for parsing an array of headers.
 *
 * @property {string} [split] - The delimiter used to split the header string.
 * @property {(arg0: string) => string} [parse] - A function to parse each split header string.
 */
export type ParseHeaderArrayRecord = {
  split?: string;
  parse?: (arg0: string) => string | ContactInHeader;
};

type ParseHeaderOptions = {
  expandArrays?: boolean;
  parseContacts?: boolean;
  extractBrackets?: boolean;
};

/**
 * Extracts contact information from a string.
 *
 * The input string is expected to be in the format "Name <email@example.com>".
 * If the input string matches this format, the function returns an object with
 * `name` and `email` properties. If the input string does not match this format,
 * the function returns an object with only the `email` property.
 *
 * @param x - The input string containing the contact information.
 * @returns An object containing the extracted contact information.
 *          If the input string matches the expected format, the object will have
 *          `name` and `email` properties. Otherwise, it will only have the `email` property.
 */
export class EmailHeaderParser implements ParseHeaderArrayRecord {
  readonly #parser: (x: string) => ContactInHeader | string;
  readonly #split?: string;

  constructor(splitArrays: boolean, parse: boolean) {
    this.#parser = parse
      ? (x: string) => {
          const match = x.match(/\s*(?:([^<]+)\s+)<([^>]+)>/);
          return match
            ? { name: match[1].replaceAll('"', ''), email: match[2].trim() }
            : { email: x.trim() };
        }
      : (x: string) => x;
    this.#split = splitArrays ? ',' : undefined;
  }
  get split() {
    return this.#split;
  }
  get parse() {
    return this.#parser;
  }
}

export class BracketHeaderParser implements ParseHeaderArrayRecord {
  readonly #parser: (x: string) => string;
  readonly #split?: string;

  constructor(splitArrays: boolean, parse: boolean) {
    this.#parser = parse
      ? (x: string) => {
          const match = x.match(/<([^>]+)>/);
          return match ? match[1] : x;
        }
      : (x: string) => x;
    this.#split = splitArrays ? ' ' : undefined;
  }
  get split() {
    return this.#split;
  }
  get parse() {
    return this.#parser;
  }
}

/**
 * A specialized map for handling email headers, extending the native `Map` class.
 * This map allows for multiple values per key and provides utility methods for
 * common operations on email headers.
 *
 * @extends Map
 */
export class ParsedHeaderMap extends Map<
  string,
  string | ContactInHeader | Array<string | ContactInHeader>
> {
  /**
   * Creates a map of header parsing options based on the provided configuration.
   *
   * @param options - An object containing optional configuration properties.
   * @param options.expandArrays - If true, splits the header values by commas.
   * @param options.parseContacts - If true, parses the header values as contacts.
   * @param options.extractBrackets - If true, extracts values from brackets in the header.
   * @returns A record where the keys are header names and the values are parsing options.
   */
  public static makeParseMap = ({
    expandArrays = false,
    parseContacts = false,
    extractBrackets = false,
  }: ParseHeaderOptions = {}) => {
    const ret = {
      to: new EmailHeaderParser(expandArrays, parseContacts),
      cc: new EmailHeaderParser(expandArrays, parseContacts),
      bcc: new EmailHeaderParser(expandArrays, parseContacts),
      from: new EmailHeaderParser(expandArrays, parseContacts),
      'return-path': new BracketHeaderParser(expandArrays, extractBrackets),
      'message-id': new BracketHeaderParser(expandArrays, extractBrackets),
      'in-reply-to': new BracketHeaderParser(expandArrays, extractBrackets),
      references: new BracketHeaderParser(expandArrays, extractBrackets),
      get: (key: string): ParseHeaderArrayRecord | undefined => {
        const normalKey = key.toLocaleLowerCase();
        if (isKeyOf(normalKey, ret)) {
          if (normalKey === 'get') return undefined;
          return ret[normalKey];
        }
      },
    };

    return ret;
  };

  /**
   * Converts a `ContactInHeader` object to a string representation.
   * If the contact has a name, it returns the name; otherwise, it returns the email.
   *
   * @param contact - The contact object containing name and email.
   * @returns The name of the contact if available, otherwise the email.
   */
  public static readonly headerContactToString = (contact: ContactInHeader) =>
    contact.name ?? contact.email;

  /**
   * Converts the given value to a string representation.
   * If the value is a string, it returns the value as is.
   * If the value is a ContactInHeader object, it returns the email property of the object.
   *
   * @param value - The value to be converted to a string. It can be either a string or a ContactInHeader object.
   * @returns The string representation of the value.
   */
  public static readonly valueAsString = (value: string | ContactInHeader) =>
    typeof value === 'string'
      ? value
      : ParsedHeaderMap.headerContactToString(value);

  /**
   * Converts a value to a `ContactInHeader` object.
   *
   * @param contact - The contact value, either a string or a `ContactInHeader` object.
   * @returns A `ContactInHeader` object.
   */
  public static readonly valueAsContact = (
    contact: string | ContactInHeader,
  ) => (typeof contact === 'string' ? { email: contact } : contact);

  /**
   * Creates a ParsedHeaderMap instance from an array of Gmail message headers.
   * @param headers - An array of Gmail message headers.
   * @returns A new ParsedHeaderMap instance populated with the provided headers.
   */
  public static fromHeaders(
    headers: Array<EmailHeader> | undefined,
    options?: Partial<ParseHeaderOptions>,
  ): ParsedHeaderMap {
    const parseOptionMap = ParsedHeaderMap.makeParseMap(options);
    const map = new ParsedHeaderMap();
    for (const header of headers ?? []) {
      if (header.name && header.value) {
        if (map.has(header.name)) {
          let value:
            | string
            | ContactInHeader
            | Array<string | ContactInHeader> = header.value;
          const parser = parseOptionMap.get(header.name);
          if (parser) {
            if (parser.split) {
              value = value.split(parser.split).map(parser.parse ?? ((x) => x));
            } else if (parser.parse) {
              value = parser.parse(value);
            }
          }
          if (Array.isArray(value)) {
            const existing = map.get(header.name);
            if (existing) {
              if (Array.isArray(existing)) {
                existing.push(...value);
              } else {
                map.set(header.name, [existing, ...value]);
              }
            }
          } else {
            const existing = map.get(header.name);
            if (Array.isArray(existing)) {
              existing.push(value);
            } else if (existing) {
              map.set(header.name, [existing, value]);
            } else {
              map.set(header.name, value);
            }
          }
        } else {
          let value:
            | string
            | ContactInHeader
            | Array<string | ContactInHeader> = header.value;
          const parser = parseOptionMap.get(header.name);
          if (parser) {
            if (parser.split) {
              value = value.split(parser.split).map(parser.parse ?? ((x) => x));
            } else if (parser.parse) {
              value = parser.parse(value);
            }
          }
          map.set(header.name, value);
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
   * Retrieves the first value associated with the specified key as a string.
   *
   * @param key - The key whose first value is to be retrieved.
   * @returns The first value associated with the key as a string, or undefined if the key does not exist.
   */
  public getFirstStringValue(key: string) {
    const value = this.getFirstValue(key);
    return value ? ParsedHeaderMap.valueAsString(value) : undefined;
  }

  /**
   * Retrieves the first value associated with the specified key as a `ContactInHeader` object.
   *
   * @param key - The key whose first value is to be retrieved.
   * @returns The first value associated with the key as a `ContactInHeader` object, or undefined if the key does not exist.
   */
  public getFirstContactValue(key: string) {
    const value = this.getFirstValue(key);
    return value ? ParsedHeaderMap.valueAsContact(value) : undefined;
  }
  /**
   * Retrieves the first value associated with the specified key, or a default value if the key does not exist.
   * @param key - The key whose first value is to be retrieved.
   * @param defaultValue - The default value to return if the key does not exist.
   * @returns The first value associated with the key, or the default value if the key does not exist.
   */
  public getFirstValueOrDefault(key: string, defaultValue: string) {
    return this.getFirstStringValue(key) ?? defaultValue;
  }

  /**
   * Retrieves all values associated with the specified key.
   * @param key - The key whose values are to be retrieved.
   * @returns An array of values associated with the key, or an empty array if the key does not exist.
   */
  public getAllValues(key: string): Array<string | ContactInHeader> {
    const value = this.get(key);
    return Array.isArray(value) ? value : value ? [value] : [];
  }

  /**
   * Retrieves all values associated with the specified key as strings.
   *
   * @param key - The key whose values are to be retrieved.
   * @returns An array of string values associated with the key.
   */
  public getAllStringValues(key: string): Array<string> {
    const value = this.getAllValues(key);
    return value.map(ParsedHeaderMap.valueAsString);
  }

  /**
   * Retrieves all values associated with the specified key as Contact objects.
   *
   * @param key - The key whose values are to be retrieved.
   * @returns An array of string values associated with the key.
   */
  public getAllContactValues(key: string): Array<ContactInHeader> {
    const value = this.getAllValues(key);
    return value.map(ParsedHeaderMap.valueAsContact);
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
