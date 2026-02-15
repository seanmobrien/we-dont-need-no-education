import {
  isErrorLike,
  isStringOrErrorLike,
  asErrorLike,
  ErrorLike,
} from '@compliance-theater/react/errors/error-like';

describe('isErrorLike', () => {
  it('returns true for a valid ErrorLike object', () => {
    const err: ErrorLike = {
      message: 'fail',
      name: 'TestError',
      stack: 'stacktrace',
      cause: {},
    };
    expect(isErrorLike(err)).toBe(true);
  });

  it('returns true for a branded ErrorLike object', () => {
    const err: ErrorLike = {
      message: 'fail',
      name: 'TestError',
      stack: 'stacktrace',
      cause: {},
      [Object.getOwnPropertySymbols({})[0]]: true,
    };
    // Brand it using asErrorLike
    const branded = asErrorLike(err);
    expect(isErrorLike(branded)).toBe(true);
  });

  it('returns false for a non-object', () => {
    expect(isErrorLike('not an object')).toBe(false);
    expect(isErrorLike(null)).toBe(false);
    expect(isErrorLike(undefined)).toBe(false);
    expect(isErrorLike(42)).toBe(false);
  });

  it('returns false for an object missing message', () => {
    expect(isErrorLike({ name: 'NoMessage' })).toBe(false);
  });

  it('returns true and brands the object if it passes checks', () => {
    const obj = { message: 'ok' };
    expect(isErrorLike(obj)).toBe(true);
    // Should now have the brand
    expect(isErrorLike(obj)).toBe(true);
  });
});

describe('isStringOrErrorLike', () => {
  it('returns true for a non-empty string', () => {
    expect(isStringOrErrorLike('hello')).toBe(true);
  });
  it('returns false for an empty string', () => {
    expect(isStringOrErrorLike('')).toBe(false);
  });
  it('returns true for a valid ErrorLike', () => {
    expect(isStringOrErrorLike({ message: 'fail' })).toBe(true);
  });
  it('returns false for a non-object, non-string', () => {
    expect(isStringOrErrorLike(123)).toBe(false);
    expect(isStringOrErrorLike(null)).toBe(false);
  });
});

describe('asErrorLike', () => {
  it('converts a string to an ErrorLike', () => {
    const result = asErrorLike('fail');
    expect(result).toMatchObject({
      message: 'fail',
      name: 'Error',
      stack: undefined,
      cause: undefined,
    });
    expect(isErrorLike(result)).toBe(true);
  });
  it('pulls stack from line/file/column options', () => {
    const result = asErrorLike('fail', {
      filename: 'test.js',
      lineno: 10,
      colno: 5,
    })!;
    expect(result).toMatchObject({
      message: 'fail',
      name: 'Error',
      stack: 'Error: fail\n\tat (test.js:10:5)',
      cause: undefined,
    });
    expect(isErrorLike(result)).toBe(true);
    expect(result.source).toBe('test.js');
    expect(result.line).toBe(10);
    expect(result.column).toBe(5);
  });
  it('passthrough for errorlike', () => {
    const source = asErrorLike('test');
    const result = asErrorLike(source)!;
    expect(result).toBe(source);
  });
  it('proxies source property on actual error objects', () => {
    const target = asErrorLike(new Error('fail'))!;
    const result = target.source;
    expect(result).toBe('error-like.test.ts');
  });
  it('converts a string to an ErrorLike with custom name', () => {
    const result = asErrorLike('fail', { name: 'CustomError' })!;
    expect(result.name).toBe('CustomError');
  });
  it('brands an ErrorLike object', () => {
    const obj = { message: 'fail', name: 'X' };
    const branded = asErrorLike(obj)!;
    expect(isErrorLike(branded)).toBe(true);
    expect(branded.name).toBe('X');
  });
  it('does not mutate a string', () => {
    const str = 'fail';
    const result = asErrorLike(str);
    expect(typeof str).toBe('string');
    expect(result).not.toBe(str);
  });
});
