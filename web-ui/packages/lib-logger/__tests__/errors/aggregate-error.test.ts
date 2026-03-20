import { AggregateError } from '../../src/errors/aggregate-error';

const e1 = new Error('first error');
const e2 = new Error('second error');
const e3 = new Error('third error');

describe('AggregateError', () => {
  describe('constructor with string first arg', () => {
    it('is an instance of Error', () => {
      const agg = new AggregateError('Something went wrong', e1, e2);
      expect(agg).toBeInstanceOf(Error);
    });

    it('sets name to AggregateError', () => {
      const agg = new AggregateError('Something went wrong', e1);
      expect(agg.name).toBe('AggregateError');
    });

    it('builds message using string + error messages joined by newline', () => {
      const agg = new AggregateError('Header', e1, e2);
      expect(agg.message).toBe(`Header\n${e1.message}\n${e2.message}`);
    });

    it('sets #errors to only the rest errors (not the string)', () => {
      const agg = new AggregateError('Header', e1, e2);
      expect(agg.count).toBe(2);
    });

    it('get(0) returns the first additional error', () => {
      const agg = new AggregateError('Header', e1, e2);
      expect(agg.get(0)).toBe(e1);
    });

    it('get(1) returns the second additional error', () => {
      const agg = new AggregateError('Header', e1, e2);
      expect(agg.get(1)).toBe(e2);
    });

    it('all() returns a copy of all errors', () => {
      const agg = new AggregateError('Header', e1, e2, e3);
      const all = agg.all();
      expect(all).toEqual([e1, e2, e3]);
    });

    it('all() returns a new array (not the same reference)', () => {
      const agg = new AggregateError('Header', e1);
      const all = agg.all();
      expect(all).not.toBe(agg.all());
    });
  });

  describe('constructor with Error first arg', () => {
    it('builds an aggregate message starting with "An aggregate error has occurred:"', () => {
      const agg = new AggregateError(e1, e2);
      expect(agg.message).toContain('An aggregate error has occurred:');
    });

    it('includes all errors in the message', () => {
      const agg = new AggregateError(e1, e2);
      expect(agg.message).toContain(e1.toString());
      expect(agg.message).toContain(e2.toString());
    });

    it('sets #errors to [firstError, ...rest]', () => {
      const agg = new AggregateError(e1, e2, e3);
      expect(agg.count).toBe(3);
    });

    it('get(0) returns the first error (the Error arg)', () => {
      const agg = new AggregateError(e1, e2);
      expect(agg.get(0)).toBe(e1);
    });

    it('get(1) returns the second error', () => {
      const agg = new AggregateError(e1, e2);
      expect(agg.get(1)).toBe(e2);
    });

    it('all() returns all errors including the first Error arg', () => {
      const agg = new AggregateError(e1, e2);
      expect(agg.all()).toEqual([e1, e2]);
    });
  });

  describe('fromErrors', () => {
    it('creates an AggregateError from an array', () => {
      const agg = AggregateError.fromErrors([e1, e2, e3]);
      expect(agg).toBeInstanceOf(AggregateError);
    });

    it('uses first element as the first arg and rest as remaining args', () => {
      const agg = AggregateError.fromErrors([e1, e2, e3]);
      expect(agg.count).toBe(3);
    });

    it('produces the same result as calling constructor with Error first arg', () => {
      const fromFactory = AggregateError.fromErrors([e1, e2]);
      const fromConstructor = new AggregateError(e1, e2);
      expect(fromFactory.message).toBe(fromConstructor.message);
      expect(fromFactory.count).toBe(fromConstructor.count);
    });
  });

  describe('isAggregateError', () => {
    it('returns true for AggregateError instances', () => {
      const agg = new AggregateError(e1);
      expect(AggregateError.isAggregateError(agg)).toBe(true);
    });

    it('returns false for regular Error', () => {
      expect(AggregateError.isAggregateError(new Error('x'))).toBe(false);
    });

    it('returns false for null', () => {
      expect(AggregateError.isAggregateError(null)).toBe(false);
    });

    it('returns false for plain objects', () => {
      expect(AggregateError.isAggregateError({ count: 1 })).toBe(false);
    });
  });

  describe('toString', () => {
    it('returns the message', () => {
      const agg = new AggregateError('My message', e1);
      expect(agg.toString()).toBe(agg.message);
    });
  });

  describe('count getter', () => {
    it('reflects the number of tracked errors', () => {
      const agg = new AggregateError(e1, e2, e3);
      expect(agg.count).toBe(3);
    });

    it('is 0 when only a string is provided with no extra errors', () => {
      const agg = new AggregateError('no errors' as string & Error);
      expect(agg.count).toBe(0);
    });
  });
});
