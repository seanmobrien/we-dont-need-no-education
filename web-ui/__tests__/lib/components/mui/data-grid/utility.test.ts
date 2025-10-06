/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  parseSortOptions,
  // buildOrderBy,
  parseFilterOptions,
} from '/lib/components/mui/data-grid/server';
import { GridFilterModel, GridSortModel } from '@mui/x-data-grid-pro';

describe('utility functions', () => {
  describe('parseSortOptions', () => {
    it('returns undefined for undefined input', () => {
      expect(parseSortOptions(undefined)).toBeUndefined();
    });

    it('returns the same GridSortModel if passed as input', () => {
      const model: GridSortModel = [
        { field: 'foo', sort: 'asc' },
        { field: 'bar', sort: 'desc' },
      ];
      expect(parseSortOptions(model)).toEqual(model);
    });

    it('parses sort from URLSearchParams', () => {
      const params = new URLSearchParams({ sort: 'foo:asc,bar:desc' });
      expect(parseSortOptions(params)).toEqual([
        { field: 'foo', sort: 'asc' },
        { field: 'bar', sort: 'desc' },
      ]);
    });

    it('parses sort from URL', () => {
      const url = new URL('http://localhost?sort=foo:asc,bar:desc');
      expect(parseSortOptions(url)).toEqual([
        { field: 'foo', sort: 'asc' },
        { field: 'bar', sort: 'desc' },
      ]);
    });

    it('returns undefined if sort param is missing', () => {
      const url = new URL('http://localhost');
      expect(parseSortOptions(url)).toBeUndefined();
    });

    it('defaults to asc if sort direction is missing', () => {
      const params = new URLSearchParams({ sort: 'foo' });
      expect(parseSortOptions(params)).toEqual([{ field: 'foo', sort: 'asc' }]);
    });

    it('handles empty sort param', () => {
      const params = new URLSearchParams({ sort: '' });
      expect(parseSortOptions(params)).toBeUndefined();
    });
  });

  describe('parseSortOptions edge cases', () => {
    it('returns empty array for null input', () => {
      expect(parseSortOptions(null as any)).toEqual([]);
    });

    it('returns undefined for non-URL, non-URLSearchParams, non-array input', () => {
      expect(parseSortOptions({} as any)).toBeUndefined();
      expect(parseSortOptions(123 as any)).toBeUndefined();
      // String input should be parsed if it looks like sort format
      expect(parseSortOptions('foo:asc')).toEqual([
        { field: 'foo', sort: 'asc' },
      ]);
    });

    it('parses sort param with extra spaces', () => {
      const params = new URLSearchParams({ sort: ' foo :desc , bar :asc ' });
      const normalize = (str: string) => str.replace(/\s+/g, ' ').trim();
      const actual = JSON.stringify(parseSortOptions(params));
      const expected = JSON.stringify([
        { field: ' foo ', sort: 'desc' },
        { field: ' bar ', sort: 'asc' },
      ]);
      expect(normalize(actual)).toBe(normalize(expected));
    });

    it('parses sort param with missing direction (defaults to asc)', () => {
      const params = new URLSearchParams({ sort: 'foo,bar:desc' });
      expect(parseSortOptions(params)).toEqual([
        { field: 'foo', sort: 'asc' },
        { field: 'bar', sort: 'desc' },
      ]);
    });

    it('parses sort param without any direction (defaults to asc)', () => {
      const params = new URLSearchParams({ sort: 'foo,bar' });
      expect(parseSortOptions(params)).toEqual([
        { field: 'foo', sort: 'asc' },
        { field: 'bar', sort: 'asc' },
      ]);
    });

    it('parses sort param with unknown direction (defaults to asc)', () => {
      const params = new URLSearchParams({ sort: 'foo:up,bar:down' });
      expect(parseSortOptions(params)).toEqual([
        { field: 'foo', sort: 'asc' },
        { field: 'bar', sort: 'asc' },
      ]);
    });

    it('parses sort param with empty field', () => {
      const params = new URLSearchParams({ sort: ':desc' });
      expect(parseSortOptions(params)).toEqual([{ field: '', sort: 'desc' }]);
    });

    it('parses sort param with multiple colons in field', () => {
      const params = new URLSearchParams({ sort: 'foo:bar:desc' });
      const normalize = (str: string) => str.replace(/\s+/g, ' ').trim();
      const actual = JSON.stringify(parseSortOptions(params));
      const expected = JSON.stringify([
        { field: 'foo', sort: 'asc' }, // only splits on first colon, 'bar:desc' becomes direction which defaults to asc
      ]);
      expect(normalize(actual)).toBe(normalize(expected));
    });
  });

  describe('parseFilterOptions', () => {
    it('returns undefined for undefined input', () => {
      expect(parseFilterOptions(undefined)).toBeUndefined();
    });

    it('returns the same GridFilterModel if passed as input and has items', () => {
      const model: GridFilterModel = {
        items: [{ field: 'foo', operator: 'equals', value: 'bar' }],
      };
      expect(parseFilterOptions(model)).toEqual(model);
    });

    it('returns undefined for GridFilterModel with empty items', () => {
      const model: GridFilterModel = { items: [] };
      expect(parseFilterOptions(model)).toBeUndefined();
    });

    it('parses filter from URLSearchParams', () => {
      const filter = {
        items: [{ field: 'foo', operator: 'equals', value: 'bar' }],
      };
      const params = new URLSearchParams({ filter: JSON.stringify(filter) });
      expect(parseFilterOptions(params)).toEqual(filter);
    });

    it('parses filter from URL', () => {
      const filter = {
        items: [{ field: 'foo', operator: 'equals', value: 'bar' }],
      };
      const url = new URL(
        'http://localhost?filter=' + encodeURIComponent(JSON.stringify(filter)),
      );
      expect(parseFilterOptions(url)).toEqual(filter);
    });

    it('returns undefined if filter param is missing', () => {
      const url = new URL('http://localhost');
      expect(parseFilterOptions(url)).toBeUndefined();
    });

    it('returns undefined if filter param is empty', () => {
      const params = new URLSearchParams({ filter: '' });
      expect(parseFilterOptions(params)).toBeUndefined();
    });

    it('returns undefined if parsed filter is not a valid GridFilterModel', () => {
      const params = new URLSearchParams({
        filter: JSON.stringify({ foo: 'bar' }),
      });
      expect(parseFilterOptions(params)).toEqual(undefined);
    });
  });
});
