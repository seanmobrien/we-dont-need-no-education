/**
 * @jest-environment node
 */

import {
  generateUniqueId,
  isError,
  isAbortError,
  isTemplateStringsArray,
  isTruthy,
  isRecord,
  TypeBrandSymbol,
  isTypeBranded,
  getResolvedPromises,
} from '/lib/react-util/utility-methods';

describe('_utility-methods', () => {
  describe('generateUniqueId', () => {
    it('should generate a string of 7 characters', () => {
      const id = generateUniqueId();
      expect(typeof id).toBe('string');
      expect(id).toHaveLength(7);
    });

    it('should generate unique IDs', () => {
      const ids = Array.from({ length: 1000 }, () => generateUniqueId());
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should only contain alphanumeric characters', () => {
      const id = generateUniqueId();
      expect(id).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('isError', () => {
    it('should return true for Error instances', () => {
      expect(isError(new Error('test'))).toBe(true);
      expect(isError(new TypeError('test'))).toBe(true);
      expect(isError(new ReferenceError('test'))).toBe(true);
    });

    it('should return true for error-like objects', () => {
      const errorLike = {
        message: 'test error',
        name: 'CustomError',
        stack: 'stack trace',
      };
      expect(isError(errorLike)).toBe(true);
    });

    it('should return false for non-error values', () => {
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
      expect(isError('error string')).toBe(false);
      expect(isError(42)).toBe(false);
      expect(isError({})).toBe(false);
      expect(isError({ message: 'missing name and stack' })).toBe(false);
    });

    it('should return false for objects missing error properties', () => {
      expect(isError({ message: 'test' })).toBe(false);
      expect(isError({ name: 'Error' })).toBe(false);
      expect(isError({ stack: 'trace' })).toBe(false);
    });
  });

  describe('isAbortError', () => {
    it('should return true for DOMException with AbortError name', () => {
      const abortError = new DOMException(
        'Operation was aborted',
        'AbortError',
      );
      expect(isAbortError(abortError)).toBe(true);
    });

    it('should return false for DOMException with other names', () => {
      const otherError = new DOMException('Network error', 'NetworkError');
      expect(isAbortError(otherError)).toBe(false);
    });

    it('should return false for regular Error with AbortError message', () => {
      const regularError = new Error('AbortError');
      expect(isAbortError(regularError)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isAbortError(null)).toBe(false);
      expect(isAbortError('AbortError')).toBe(false);
      expect(isAbortError({ name: 'AbortError' })).toBe(false);
    });
  });

  describe('isTemplateStringsArray', () => {
    it('should return true for template strings array', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const templateFn = (
        strings: TemplateStringsArray,
        ..._values: unknown[]
      ) => strings;
      const result = templateFn`test ${1} string`;
      expect(isTemplateStringsArray(result)).toBe(true);
    });

    it('should return true for manually created template-like array', () => {
      const templateLike = Object.assign(['hello ', ' world'], {
        raw: ['hello ', ' world'],
      });
      expect(isTemplateStringsArray(templateLike)).toBe(true);
    });

    it('should return false for regular arrays', () => {
      expect(isTemplateStringsArray([])).toBe(false);
      expect(isTemplateStringsArray(['a', 'b'])).toBe(false);
      expect(isTemplateStringsArray([1, 2, 3])).toBe(false);
    });

    it('should return false for non-array values', () => {
      expect(isTemplateStringsArray(null)).toBe(false);
      expect(isTemplateStringsArray(undefined)).toBe(false);
      expect(isTemplateStringsArray('string')).toBe(false);
      expect(isTemplateStringsArray({ raw: [] })).toBe(false);
    });
  });

  describe('isTruthy', () => {
    describe('with default defaultValue (false)', () => {
      it('should return default for null/undefined', () => {
        expect(isTruthy(null)).toBe(false);
        expect(isTruthy(undefined)).toBe(false);
      });

      it('should handle truthy strings', () => {
        expect(isTruthy('true')).toBe(true);
        expect(isTruthy('TRUE')).toBe(true);
        expect(isTruthy('  True  ')).toBe(true);
        expect(isTruthy('1')).toBe(true);
        expect(isTruthy('yes')).toBe(true);
        expect(isTruthy('YES')).toBe(true);
        expect(isTruthy('y')).toBe(true);
        expect(isTruthy('Y')).toBe(true);
      });

      it('should handle falsy strings', () => {
        expect(isTruthy('false')).toBe(false);
        expect(isTruthy('0')).toBe(false);
        expect(isTruthy('no')).toBe(false);
        expect(isTruthy('random')).toBe(false);
        expect(isTruthy('')).toBe(false);
      });

      it('should handle arrays', () => {
        expect(isTruthy([])).toBe(false);
        expect(isTruthy([1])).toBe(true);
        expect(isTruthy(['a', 'b'])).toBe(true);
      });

      it('should handle objects', () => {
        expect(isTruthy({})).toBe(false);
        expect(isTruthy({ key: 'value' })).toBe(true);
        expect(isTruthy({ a: 1, b: 2 })).toBe(true);
      });

      it('should handle other types', () => {
        expect(isTruthy(0)).toBe(false);
        expect(isTruthy(1)).toBe(true);
        expect(isTruthy(false)).toBe(false);
        expect(isTruthy(true)).toBe(true);
      });
    });

    describe('with custom defaultValue', () => {
      it('should return custom default for null/undefined', () => {
        expect(isTruthy(null, true)).toBe(true);
        expect(isTruthy(undefined, true)).toBe(true);
      });
    });
  });

  describe('isRecord', () => {
    it('should return true for plain objects', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ key: 'value' })).toBe(true);
      expect(isRecord({ a: 1, b: 2 })).toBe(true);
    });

    it('should return true for arrays (they are objects)', () => {
      expect(isRecord([])).toBe(true);
      expect(isRecord([1, 2, 3])).toBe(true);
    });

    it('should return true for other object types', () => {
      expect(isRecord(new Date())).toBe(true);
      expect(isRecord(new Error('test'))).toBe(true);
      expect(isRecord(/regex/)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isRecord(null)).toBe(false);
    });

    it('should return false for primitive types', () => {
      expect(isRecord(undefined)).toBe(false);
      expect(isRecord('string')).toBe(false);
      expect(isRecord(42)).toBe(false);
      expect(isRecord(true)).toBe(false);
      expect(isRecord(Symbol('test'))).toBe(false);
    });
  });

  describe('TypeBrandSymbol and isTypeBranded', () => {
    it('should correctly identify type branded objects', () => {
      const customBrand = Symbol('CustomBrand');
      const brandedObject = {
        [TypeBrandSymbol]: customBrand,
        data: 'test',
      };

      expect(isTypeBranded(brandedObject, customBrand)).toBe(true);
    });

    it('should return false for objects with wrong brand', () => {
      const customBrand = Symbol('CustomBrand');
      const wrongBrand = Symbol('WrongBrand');
      const brandedObject = {
        [TypeBrandSymbol]: wrongBrand,
        data: 'test',
      };

      expect(isTypeBranded(brandedObject, customBrand)).toBe(false);
    });

    it('should return false for objects without brand', () => {
      const customBrand = Symbol('CustomBrand');
      const unbrandedObject = { data: 'test' };

      expect(isTypeBranded(unbrandedObject, customBrand)).toBe(false);
    });

    it('should return false for non-objects', () => {
      const customBrand = Symbol('CustomBrand');

      expect(isTypeBranded(null, customBrand)).toBe(false);
      expect(isTypeBranded(undefined, customBrand)).toBe(false);
      expect(isTypeBranded('string', customBrand)).toBe(false);
      expect(isTypeBranded(42, customBrand)).toBe(false);
    });
  });

  describe('getResolvedPromises', () => {
    beforeEach(() => {
      // jest.clearAllTimers();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should categorize all fulfilled promises correctly', async () => {
      const promises = [
        Promise.resolve('value1'),
        Promise.resolve('value2'),
        Promise.resolve(null), // Should handle null values
        Promise.resolve(undefined), // Should handle undefined values
      ];

      const resultPromise = getResolvedPromises(promises, 1000);

      // Fast-forward time to ensure no timeouts
      jest.advanceTimersByTime(500);

      const result = await resultPromise;

      expect(result.fulfilled).toEqual(['value1', 'value2', null, undefined]);
      expect(result.rejected).toEqual([]);
      expect(result.pending).toEqual([]);
    });

    it('should categorize all rejected promises correctly', async () => {
      const error1 = new Error('error1');
      const error2 = 'string error';
      const promises = [Promise.reject(error1), Promise.reject(error2)];

      const resultPromise = getResolvedPromises(promises, 1000);

      // Fast-forward time to ensure no timeouts
      jest.advanceTimersByTime(500);

      const result = await resultPromise;

      expect(result.fulfilled).toEqual([]);
      expect(result.rejected).toEqual([error1, error2]);
      expect(result.pending).toEqual([]);
    });

    it('should categorize timed out promises as pending', async () => {
      const slowPromise1 = new Promise((resolve) =>
        setTimeout(() => resolve('slow1'), 2000),
      );
      const slowPromise2 = new Promise((resolve) =>
        setTimeout(() => resolve('slow2'), 3000),
      );
      const promises = [slowPromise1, slowPromise2];

      const resultPromise = getResolvedPromises(promises, 1000);

      // Fast-forward past timeout but not past promise resolution
      jest.advanceTimersByTime(1500);

      const result = await resultPromise;

      expect(result.fulfilled).toEqual([]);
      expect(result.rejected).toEqual([]);
      expect(result.pending).toEqual([slowPromise1, slowPromise2]);
    });

    it('should handle mixed promise states correctly', async () => {
      const slowPromise = new Promise((resolve) =>
        setTimeout(() => resolve('slow'), 2000),
      );
      const error = new Error('test error');

      const promises = [
        Promise.resolve('fast'),
        slowPromise,
        Promise.reject(error),
        Promise.resolve(42),
      ];

      const resultPromise = getResolvedPromises(promises, 1000);

      // Fast-forward past timeout
      jest.advanceTimersByTime(1500);

      const result = await resultPromise;

      expect(result.fulfilled).toEqual(['fast', 42]);
      expect(result.rejected).toEqual([error]);
      expect(result.pending).toEqual([slowPromise]);
    });

    it('should handle empty promise array', async () => {
      const result = await getResolvedPromises([], 1000);

      expect(result.fulfilled).toEqual([]);
      expect(result.rejected).toEqual([]);
      expect(result.pending).toEqual([]);
    });

    it('should handle custom timeout values', async () => {
      const slowPromise = new Promise((resolve) =>
        setTimeout(() => resolve('slow'), 500),
      );
      const promises = [slowPromise];

      const resultPromise = getResolvedPromises(promises, 100); // Very short timeout

      // Fast-forward past short timeout but not past promise resolution
      jest.advanceTimersByTime(200);

      const result = await resultPromise;

      expect(result.fulfilled).toEqual([]);
      expect(result.rejected).toEqual([]);
      expect(result.pending).toEqual([slowPromise]);
    });

    it('should handle promises that resolve with falsy values', async () => {
      const promises = [
        Promise.resolve(0),
        Promise.resolve(''),
        Promise.resolve(false),
        Promise.resolve(null),
        Promise.resolve(undefined),
      ] as Promise<number | string | boolean | null | undefined>[];

      const result = await getResolvedPromises(promises, 1000);

      expect(result.fulfilled).toEqual([0, '', false, null, undefined]);
      expect(result.rejected).toEqual([]);
      expect(result.pending).toEqual([]);
    });
  });
});
