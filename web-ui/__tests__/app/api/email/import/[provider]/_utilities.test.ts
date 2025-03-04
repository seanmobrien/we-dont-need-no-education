/**
 * @jest-environment node
 */

import {
  MailQueryBuilder,
  parsePaginationStats,
} from '@/app/api/email/import/[provider]/_utilitites';
import { PaginationStats } from '@/data-models';

describe('MailQueryBuilder', () => {
  let builder: MailQueryBuilder;

  beforeEach(() => {
    builder = new MailQueryBuilder();
  });

  describe('hasQuery', () => {
    it('should return false when the query is empty', () => {
      expect(builder.hasQuery).toBe(false);
    });

    it('should return true when the query has elements', () => {
      builder.appendQueryParam('from', 'example@example.com');
      expect(builder.hasQuery).toBe(true);
    });
  });

  describe('appendQueryParam', () => {
    it('should append a single query parameter', () => {
      builder.appendQueryParam('from', 'example@example.com');
      expect(builder.build()).toBe('from:example@example.com');
    });

    it('should append multiple query parameters', () => {
      builder.appendQueryParam('from', [
        'example1@example.com',
        'example2@example.com',
      ]);
      expect(builder.build()).toBe(
        'from:example1@example.com from:example2@example.com'
      );
    });

    it('should trim and filter out empty values', () => {
      builder.appendQueryParam('from', [
        ' example1@example.com ',
        ' ',
        'example2@example.com',
      ]);
      expect(builder.build()).toBe(
        'from:example1@example.com from:example2@example.com'
      );
    });

    it('should return the builder instance for method chaining', () => {
      const result = builder.appendQueryParam('from', 'example@example.com');
      expect(result).toBe(builder);
    });
  });

  describe('build', () => {
    it('should return undefined if the query is empty', () => {
      expect(builder.build()).toBeUndefined();
    });

    it('should return the trimmed query string if it exists', () => {
      builder.appendQueryParam('from', 'example@example.com');
      expect(builder.build()).toBe('from:example@example.com');
    });
  });
});

describe('parsePaginationStats', () => {
  it('should parse pagination stats from a URL object', () => {
    const url = new URL('https://example.com?page=2&num=50');
    const result = parsePaginationStats(url);
    expect(result).toEqual<PaginationStats<string>>({
      page: '2',
      num: 50,
      total: 0,
    });
  });

  it('should parse pagination stats from a URLSearchParams object', () => {
    const searchParams = new URLSearchParams('page=3&num=25');
    const result = parsePaginationStats(searchParams);
    expect(result).toEqual<PaginationStats<string>>({
      page: '3',
      num: 25,
      total: 0,
    });
  });

  it('should default num to 100 if not specified', () => {
    const url = new URL('https://example.com?page=1');
    const result = parsePaginationStats(url);
    expect(result).toEqual<PaginationStats<string>>({
      page: '1',
      num: 100,
      total: 0,
    });
  });

  it('should default num to 100 if invalid', () => {
    const url = new URL('https://example.com?page=1&num=invalid');
    const result = parsePaginationStats(url);
    expect(result).toEqual<PaginationStats<string>>({
      page: '1',
      num: 100,
      total: 0,
    });
  });

  it('should trim the page value', () => {
    const url = new URL('https://example.com?page=  4  &num=10');
    const result = parsePaginationStats(url);
    expect(result).toEqual<PaginationStats<string>>({
      page: '4',
      num: 10,
      total: 0,
    });
  });

  it('should handle missing page parameter', () => {
    const url = new URL('https://example.com?num=20');
    const result = parsePaginationStats(url);
    expect(result).toEqual<PaginationStats<string>>({
      page: '',
      num: 20,
      total: 0,
    });
  });
});
