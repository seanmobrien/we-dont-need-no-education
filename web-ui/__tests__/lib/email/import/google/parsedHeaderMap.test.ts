import { ParsedHeaderMap } from '@/lib/email/import/google/parsedHeaderMap';
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
        'recipient@example.com'
      );
    });

    it('should return the default value if the key does not exist', () => {
      const map = new ParsedHeaderMap();
      expect(
        map.getFirstValueOrDefault('NonExistent', 'default@example.com')
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
});
