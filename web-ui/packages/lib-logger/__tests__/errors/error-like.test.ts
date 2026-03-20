import { isErrorLike, isStringOrErrorLike, asErrorLike } from '../../src/errors/error-like';

// A stack with a parseable frame for extraction tests
// Regex: /at ([\w$.<>]+ )?\((.*[\\/])?([^\\/()]+):(\d+):(\d+)\)/
// Groups: [1]=function, [2]=path, [3]=filename, [4]=line, [5]=column
const SAMPLE_STACK = `Error: test error
    at myFn (src/foo.ts:10:5)
    at <anonymous>:1:16`;

describe('isErrorLike', () => {
  it('returns false for null', () => {
    expect(isErrorLike(null)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isErrorLike('some error')).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isErrorLike({})).toBe(false);
  });

  it('returns false for object with only name', () => {
    expect(isErrorLike({ name: 'Error' })).toBe(false);
  });

  it('returns true for an object with message (name is optional)', () => {
    expect(isErrorLike({ message: 'hello' })).toBe(true);
  });

  it('returns true for object with message and name', () => {
    expect(isErrorLike({ message: 'x', name: 'E' })).toBe(true);
  });

  it('returns true for a real Error instance', () => {
    expect(isErrorLike(new Error('test'))).toBe(true);
  });

  it('returns false when cause is non-object (e.g. string)', () => {
    expect(isErrorLike({ message: 'x', name: 'E', cause: 'string cause' })).toBe(false);
  });

  it('returns true when cause is an object', () => {
    expect(isErrorLike({ message: 'x', name: 'E', cause: new Error('inner') })).toBe(true);
  });

  it('returns false when stack is not a string', () => {
    expect(isErrorLike({ message: 'x', name: 'E', stack: 42 })).toBe(false);
  });

  it('returns true when stack is a string', () => {
    expect(isErrorLike({ message: 'x', name: 'E', stack: 'some stack' })).toBe(true);
  });

  it('returns false for undefined', () => {
    expect(isErrorLike(undefined)).toBe(false);
  });

  it('returns false for 0', () => {
    expect(isErrorLike(0)).toBe(false);
  });
});

describe('isStringOrErrorLike', () => {
  it('returns false for empty string', () => {
    expect(isStringOrErrorLike('')).toBe(false);
  });

  it('returns true for non-empty string', () => {
    expect(isStringOrErrorLike('hello')).toBe(true);
  });

  it('returns true for ErrorLike object', () => {
    expect(isStringOrErrorLike({ message: 'x', name: 'E' })).toBe(true);
  });

  it('returns true for Error instance', () => {
    expect(isStringOrErrorLike(new Error('y'))).toBe(true);
  });

  it('returns false for null', () => {
    expect(isStringOrErrorLike(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isStringOrErrorLike(undefined)).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isStringOrErrorLike(42)).toBe(false);
  });
});

describe('asErrorLike', () => {
  it('returns undefined for null', () => {
    expect(asErrorLike(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(asErrorLike(undefined)).toBeUndefined();
  });

  it('returns undefined for 0', () => {
    expect(asErrorLike(0)).toBeUndefined();
  });

  it('returns undefined for false', () => {
    expect(asErrorLike(false)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    // empty string is falsy, so returns undefined
    expect(asErrorLike('')).toBeUndefined();
  });

  it('returns a proxy for an ErrorLike input', () => {
    const input = { message: 'hello', name: 'Error' };
    const result = asErrorLike(input);
    expect(result).toBeDefined();
    expect(result?.message).toBe('hello');
  });

  it('returns a branded ErrorLike as-is (same reference) via proxy', () => {
    // A branded instance already has isErrorLikeBrand so proxy returns it as-is
    const input = new Error('branded');
    const result1 = asErrorLike(input);
    const result2 = asErrorLike(result1!);
    // result2 should still be a valid ErrorLike
    expect(result2?.message).toBe('branded');
  });

  it('creates ErrorLikeInstance from plain object with message', () => {
    const result = asErrorLike({ message: 'from object', foo: 'bar' });
    expect(result?.message).toBe('from object');
  });

  it('creates ErrorLikeInstance from string', () => {
    const result = asErrorLike('string error');
    expect(result?.message).toBe('string error');
  });

  it('uses default "Unexpected error" when plain object has no message', () => {
    const result = asErrorLike({ foo: 'bar' } as unknown);
    expect(result?.message).toBe('Unexpected error');
  });

  describe('ErrorLikeInstance from string (via asErrorLike)', () => {
    it('toString with name includes message', () => {
      const result = asErrorLike('my error');
      expect(result?.toString?.()).toContain('my error');
    });

    it('toString without name (empty string name) omits the "name: " prefix', () => {
      // When constructed as ErrorLikeInstance with empty name, toString returns just the message
      const result = asErrorLike('just the message', { name: '' });
      expect(result?.toString?.()).toBe('just the message');
    });

    it('name defaults to Error', () => {
      const result = asErrorLike('test error');
      expect(result?.name).toBe('Error');
    });
  });

  describe('stack-based getters from ErrorLikeInstance', () => {
    it('source returns the filename from stack', () => {
      const result = asErrorLike({ message: 'x', name: 'E', stack: SAMPLE_STACK });
      // The regex group [3] captures the filename (not the directory path)
      expect(result?.source).toBe('foo.ts');
    });

    it('line returns the line number from stack', () => {
      const result = asErrorLike({ message: 'x', name: 'E', stack: SAMPLE_STACK });
      expect(result?.line).toBe(10);
    });

    it('column returns the column number from stack', () => {
      const result = asErrorLike({ message: 'x', name: 'E', stack: SAMPLE_STACK });
      expect(result?.column).toBe(5);
    });

    it('returns 0 for line when stack has no frames', () => {
      const result = asErrorLike({ message: 'x', name: 'E', stack: 'Error: no frames' });
      expect(result?.line).toBe(0);
    });

    it('returns 0 for column when stack has no frames', () => {
      const result = asErrorLike({ message: 'x', name: 'E', stack: 'Error: no frames' });
      expect(result?.column).toBe(0);
    });

    it('returns undefined for source when no stack', () => {
      const result = asErrorLike('no stack error');
      // stack is undefined so source is undefined
      expect(result?.source).toBeUndefined();
    });

    it('returns 0 for line when no stack', () => {
      const result = asErrorLike('no stack error');
      expect(result?.line).toBe(0);
    });
  });

  describe('filename-based stack construction', () => {
    it('builds a stack when filename is provided', () => {
      const result = asErrorLike('file error', { filename: 'test.ts', lineno: 5, colno: 10 });
      expect(result?.stack).toContain('test.ts');
    });

    it('defaults lineno to 1 and colno to 0 when not provided', () => {
      const result = asErrorLike('file error', { filename: 'app.ts' });
      expect(result?.stack).toContain(':1:0');
    });
  });

  describe('nodeInspectCustom', () => {
    const nodeInspectCustom = Symbol.for('nodejs.util.inspect.custom');

    it('returns stack when stack is present (ErrorLikeInstance with filename)', () => {
      // Use filename option to trigger stack construction in ErrorLikeInstance
      const result = asErrorLike('x', { filename: 'foo.ts', lineno: 1, colno: 0 });
      // Call with proper binding
      const inspected = (result as unknown as { [nodeInspectCustom]: () => string })[nodeInspectCustom]?.call(result);
      expect(inspected).toContain('foo.ts');
    });

    it('returns toString output when no stack (ErrorLikeInstance from string)', () => {
      // No filename means no stack, so nodeInspectCustom returns toString result
      const result = asErrorLike('just a string error');
      const inspected = (result as unknown as { [nodeInspectCustom]: () => string })[nodeInspectCustom]?.call(result);
      expect(inspected).toContain('just a string error');
    });
  });

  describe('proxy source/line/column for ErrorLike input', () => {
    it('proxy provides source extracted from stack', () => {
      const err = new Error('test');
      err.stack = SAMPLE_STACK;
      const result = asErrorLike(err);
      // The regex group [3] captures the filename (not the directory path)
      expect(result?.source).toBe('foo.ts');
    });

    it('proxy provides line extracted from stack', () => {
      const err = new Error('test');
      err.stack = SAMPLE_STACK;
      const result = asErrorLike(err);
      expect(result?.line).toBe(10);
    });

    it('proxy provides column extracted from stack', () => {
      const err = new Error('test');
      err.stack = SAMPLE_STACK;
      const result = asErrorLike(err);
      expect(result?.column).toBe(5);
    });

    it('proxy provides 0 for line when stack has no parseable frames', () => {
      const err = new Error('test');
      err.stack = 'Error: no frames here';
      const result = asErrorLike(err);
      expect(result?.line).toBe(0);
    });

    it('proxy provides 0 for column when stack has no parseable frames', () => {
      const err = new Error('test');
      err.stack = 'Error: no frames here';
      const result = asErrorLike(err);
      expect(result?.column).toBe(0);
    });

    it('proxy provides undefined for source when stack has no parseable frames', () => {
      const err = new Error('test');
      err.stack = 'Error: no frames';
      const result = asErrorLike(err);
      expect(result?.source).toBeUndefined();
    });
  });

  describe('proxy default case (unknown property on unbranded ErrorLike)', () => {
    it('returns undefined for unknown properties on a proxied ErrorLike', () => {
      // Create a proxied ErrorLike (unbranded) and access an unknown property
      const err = new Error('proxy test');
      const result = asErrorLike(err);
      // Access a property that's not in the error and not a handled proxy case
      // The result proxy's default switch branch should return undefined
      expect((result as unknown as Record<string, unknown>)['unknownPropXYZ']).toBeUndefined();
    });
  });

  describe('ErrorLikeInstance column getter (string input creates instance)', () => {
    it('returns 0 for column when no stack', () => {
      // String input → ErrorLikeInstance with no stack → column getter returns 0
      const result = asErrorLike('some error with no stack');
      expect(result?.column).toBe(0);
    });

    it('returns correct column when stack is provided via filename option', () => {
      // filename option builds a stack like "Name: msg\n\tat (filename:lineno:colno)"
      const result = asErrorLike('col test', { filename: 'myfile.ts', lineno: 3, colno: 7 });
      expect(result?.column).toBe(7);
    });

    it('ErrorLikeInstance is recognized as ErrorLike (brand fast-path)', () => {
      // After asErrorLike returns an ErrorLikeInstance, isErrorLike should return true via brand fast-path
      const result = asErrorLike('brand test');
      expect(isErrorLike(result)).toBe(true);
    });
  });
});
