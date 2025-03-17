import {
  isParsedHeaderMap,
  ParsedHeaderMap,
} from '@/lib/email/parsedHeaderMap';
import type { gmail_v1 } from 'googleapis';

describe('ParsedHeaderMap', () => {
  describe('fromHeaders', () => {
    it('should create a ParsedHeaderMap from an array of headers', () => {
      const headers: gmail_v1.Schema$MessagePart['headers'] = [
        { name: 'Subject', value: 'Test Email' },
        { name: 'From', value: 'test@example.com' },
        { name: 'To', value: 'recipient@example.com' },
        { name: 'To', value: 'another@example.com' },
      ];
      const map = ParsedHeaderMap.fromHeaders(headers);
      expect(map.get('Subject')).toBe('Test Email');
      expect(map.get('From')).toBe('test@example.com');
      expect(map.get('To')).toEqual([
        'recipient@example.com',
        'another@example.com',
      ]);
    });

    it('should handle undefined headers', () => {
      const map = ParsedHeaderMap.fromHeaders(undefined);
      expect(map.size).toBe(0);
    });
  });

  describe('getFirstValue', () => {
    it('should return the first value associated with the key', () => {
      const map = new ParsedHeaderMap([
        ['To', ['recipient@example.com', 'another@example.com']],
      ]);
      expect(map.getFirstValue('To')).toBe('recipient@example.com');
    });

    it('should return undefined if the key does not exist', () => {
      const map = new ParsedHeaderMap();
      expect(map.getFirstValue('NonExistent')).toBeUndefined();
    });
  });

  describe('getFirstValueOrDefault', () => {
    it('should return the first value associated with the key', () => {
      const map = new ParsedHeaderMap([
        ['To', ['recipient@example.com', 'another@example.com']],
      ]);
      expect(map.getFirstValueOrDefault('To', 'default@example.com')).toBe(
        'recipient@example.com',
      );
    });

    it('should return the default value if the key does not exist', () => {
      const map = new ParsedHeaderMap();
      expect(
        map.getFirstValueOrDefault('NonExistent', 'default@example.com'),
      ).toBe('default@example.com');
    });
  });

  describe('getAllValues', () => {
    it('should return all values associated with the key', () => {
      const map = new ParsedHeaderMap([
        ['To', ['recipient@example.com', 'another@example.com']],
      ]);
      expect(map.getAllValues('To')).toEqual([
        'recipient@example.com',
        'another@example.com',
      ]);
    });

    it('should return an empty array if the key does not exist', () => {
      const map = new ParsedHeaderMap();
      expect(map.getAllValues('NonExistent')).toEqual([]);
    });
  });

  describe('hasValue', () => {
    it('should return true if the value exists for the key', () => {
      const map = new ParsedHeaderMap([
        ['To', ['recipient@example.com', 'another@example.com']],
      ]);
      expect(map.hasValue('To', 'recipient@example.com')).toBe(true);
    });

    it('should return false if the value does not exist for the key', () => {
      const map = new ParsedHeaderMap([
        ['To', ['recipient@example.com', 'another@example.com']],
      ]);
      expect(map.hasValue('To', 'nonexistent@example.com')).toBe(false);
    });
  });

  describe('countValues', () => {
    it('should return the count of values associated with the key', () => {
      const map = new ParsedHeaderMap([
        ['To', ['recipient@example.com', 'another@example.com']],
      ]);
      expect(map.countValues('To')).toBe(2);
    });

    it('should return 0 if the key does not exist', () => {
      const map = new ParsedHeaderMap();
      expect(map.countValues('NonExistent')).toBe(0);
    });
  });

  describe('clearValues', () => {
    it('should clear all values associated with the key', () => {
      const map = new ParsedHeaderMap([
        ['To', ['recipient@example.com', 'another@example.com']],
      ]);
      map.clearValues('To');
      expect(map.get('To')).toBeUndefined();
    });
  });

  describe('clearAllValues', () => {
    it('should clear all values in the map', () => {
      const map = new ParsedHeaderMap([
        ['To', ['recipient@example.com', 'another@example.com']],
      ]);
      map.clearAllValues();
      expect(map.size).toBe(0);
    });
  });
  describe('makeParseMap', () => {
    it('should create a parse map with default options', () => {
      const parseMap = ParsedHeaderMap.makeParseMap();
      expect(parseMap).toEqual({
        to: undefined,
        cc: undefined,
        bcc: undefined,
        from: undefined,
        'in-reply-to': undefined,
        references: undefined,
        'return-path': undefined,
        'message-id': undefined,
      });
    });

    it('should create a parse map with expandArrays option', () => {
      const parseMap = ParsedHeaderMap.makeParseMap({ expandArrays: true });
      expect(parseMap).toEqual({
        to: { split: ',' },
        cc: { split: ',' },
        bcc: { split: ',' },
        from: { split: ',' },
        'in-reply-to': { split: ' ' },
        references: { split: ' ' },
        'return-path': undefined,
        'message-id': undefined,
      });
    });

    it('should create a parse map with parseContacts option', () => {
      const parseMap = ParsedHeaderMap.makeParseMap({ parseContacts: true });
      expect(parseMap).toEqual({
        to: { parse: expect.any(Function) },
        cc: { parse: expect.any(Function) },
        bcc: { parse: expect.any(Function) },
        from: { parse: expect.any(Function) },
        'in-reply-to': undefined,
        references: undefined,
        'return-path': undefined,
        'message-id': undefined,
      });
    });

    it('should create a parse map with extractBrackets option', () => {
      const parseMap = ParsedHeaderMap.makeParseMap({ extractBrackets: true });
      expect(parseMap).toEqual({
        to: undefined,
        cc: undefined,
        bcc: undefined,
        from: undefined,
        'in-reply-to': { parse: expect.any(Function) },
        references: { parse: expect.any(Function) },
        'return-path': { parse: expect.any(Function) },
        'message-id': { parse: expect.any(Function) },
      });
    });
  });

  describe('headerContactToString', () => {
    it('should return the name if available', () => {
      const contact = { name: 'John Doe', email: 'john@example.com' };
      expect(ParsedHeaderMap.headerContactToString(contact)).toBe('John Doe');
    });

    it('should return the email if name is not available', () => {
      const contact = { email: 'john@example.com' };
      expect(ParsedHeaderMap.headerContactToString(contact)).toBe(
        'john@example.com',
      );
    });
  });

  describe('valueAsString', () => {
    it('should return the value if it is a string', () => {
      expect(ParsedHeaderMap.valueAsString('test')).toBe('test');
    });

    it('should return the email if the value is a ContactInHeader object', () => {
      const contact = { email: 'john@example.com' };
      expect(ParsedHeaderMap.valueAsString(contact)).toBe('john@example.com');
    });
  });

  describe('valueAsContact', () => {
    it('should return the contact if it is already a ContactInHeader object', () => {
      const contact = { email: 'john@example.com' };
      expect(ParsedHeaderMap.valueAsContact(contact)).toEqual(contact);
    });

    it('should convert the value to a ContactInHeader object if it is a string', () => {
      expect(ParsedHeaderMap.valueAsContact('john@example.com')).toEqual({
        email: 'john@example.com',
      });
    });
  });

  describe('getFirstStringValue', () => {
    it('should return the first value as a string', () => {
      const map = new ParsedHeaderMap([
        ['To', ['recipient@example.com', 'another@example.com']],
      ]);
      expect(map.getFirstStringValue('To')).toBe('recipient@example.com');
    });

    it('should return undefined if the key does not exist', () => {
      const map = new ParsedHeaderMap();
      expect(map.getFirstStringValue('NonExistent')).toBeUndefined();
    });
  });

  describe('getFirstContactValue', () => {
    it('should return the first value as a ContactInHeader object', () => {
      const map = new ParsedHeaderMap([
        [
          'To',
          [
            { email: 'recipient@example.com' },
            { email: 'another@example.com' },
          ],
        ],
      ]);
      expect(map.getFirstContactValue('To')).toEqual({
        email: 'recipient@example.com',
      });
    });

    it('should return undefined if the key does not exist', () => {
      const map = new ParsedHeaderMap();
      expect(map.getFirstContactValue('NonExistent')).toBeUndefined();
    });
  });

  describe('getAllStringValues', () => {
    it('should return all values as strings', () => {
      const map = new ParsedHeaderMap([
        ['To', ['recipient@example.com', 'another@example.com']],
      ]);
      expect(map.getAllStringValues('To')).toEqual([
        'recipient@example.com',
        'another@example.com',
      ]);
    });

    it('should return an empty array if the key does not exist', () => {
      const map = new ParsedHeaderMap();
      expect(map.getAllStringValues('NonExistent')).toEqual([]);
    });
  });

  describe('getAllContactValues', () => {
    it('should return all values as ContactInHeader objects', () => {
      const map = new ParsedHeaderMap([
        [
          'To',
          [
            { email: 'recipient@example.com' },
            { email: 'another@example.com' },
          ],
        ],
      ]);
      expect(map.getAllContactValues('To')).toEqual([
        { email: 'recipient@example.com' },
        { email: 'another@example.com' },
      ]);
    });

    it('should return an empty array if the key does not exist', () => {
      const map = new ParsedHeaderMap();
      expect(map.getAllContactValues('NonExistent')).toEqual([]);
    });
  });

  describe('isParsedHeaderMap', () => {
    it('should return true if the value is an instance of ParsedHeaderMap', () => {
      const map = new ParsedHeaderMap();
      expect(isParsedHeaderMap(map)).toBe(true);
    });

    it('should return false if the value is not an instance of ParsedHeaderMap', () => {
      expect(isParsedHeaderMap({})).toBe(false);
    });
  });
});
