/**
 * Email header parsing utilities
 * @module @/lib/email/parsedHeaderMap
 */

declare module '@/lib/email/parsedHeaderMap' {
  /**
   * Represents an email header with a name and value.
   */
  export interface EmailHeader {
    /** The name of the header before the `:` separator. For example, `To`. */
    name?: string | null;
    /** The value of the header after the `:` separator. For example, `someuser@example.com`. */
    value?: string | null;
  }

  /**
   * Parsed contact information used inside headers.
   */
  /** Minimal contact shape used in header parsing. */
  export type ContactInHeader = {
    email: string;
    name?: string;
  };

  /**
   * Options for how a header array should be parsed.
   */
  export type ParseHeaderArrayRecord = {
    split?: string;
    parse?: (arg0: string) => string | ContactInHeader;
  };

  export type ParseHeaderOptions = {
    expandArrays?: boolean;
    parseContacts?: boolean;
    extractBrackets?: boolean;
  };

  /**
   * A parser that can be used to split and/or parse header values.
   */
  export class EmailHeaderParser implements ParseHeaderArrayRecord {
    readonly split?: string | undefined;
    readonly parse: (x: string) => string | ContactInHeader;
    constructor(splitArrays: boolean, parse: boolean);
  }

  export class BracketHeaderParser implements ParseHeaderArrayRecord {
    readonly split?: string | undefined;
    readonly parse: (x: string) => string;
    constructor(splitArrays: boolean, parse: boolean);
  }

  /**
   * A specialized map for handling email headers, extending the native `Map` class.
   * This map allows for multiple values per key and provides utility methods for
   * common operations on email headers.
   */
  export class ParsedHeaderMap extends Map<
    string,
    string | ContactInHeader | Array<string | ContactInHeader>
  > {
    /**
     * Creates a map of header parsing options based on the provided configuration.
     */
    public static makeParseMap: (
      options?: ParseHeaderOptions,
    ) => Record<
      string,
      | ParseHeaderArrayRecord
      | ((key: string) => ParseHeaderArrayRecord | undefined)
    >;

    /** Convert a ContactInHeader to a display string (name or email). */
    public static readonly headerContactToString: (
      contact: ContactInHeader,
    ) => string;

    /** Convert a string or contact to a string value. */
    public static readonly valueAsString: (
      value: string | ContactInHeader,
    ) => string;

    /** Convert a string or contact to a ContactInHeader. */
    public static readonly valueAsContact: (
      contact: string | ContactInHeader,
    ) => ContactInHeader;

    public static fromHeaders(
      headers: Array<EmailHeader> | undefined,
      options?: Partial<ParseHeaderOptions>,
    ): ParsedHeaderMap;

    public getFirstValue(key: string): string | ContactInHeader | undefined;
    public getFirstStringValue(key: string): string | undefined;
    public getFirstContactValue(key: string): ContactInHeader | undefined;
    public getFirstValueOrDefault(key: string, defaultValue: string): string;
    public getAllValues(key: string): Array<string | ContactInHeader>;
    public getAllStringValues(key: string): Array<string>;
    public getAllContactValues(key: string): Array<ContactInHeader>;
    public hasValue(key: string, value: string): boolean;
    public countValues(key: string): number;
    public clearValues(key: string): void;
    public clearAllValues(): void;
  }

  /**
   * Type guard for ParsedHeaderMap instances.
   */
  export const isParsedHeaderMap: (value: unknown) => value is ParsedHeaderMap;
}
