import { safeArgsSummary, safeSerialize } from '../src/safe-serialize';

describe('safe-serialize', () => {
  it('serializes primitive values with max length handling', () => {
    expect(safeSerialize('abcdefghij', 5)).toBe('abcde...');
    expect(safeSerialize(123)).toBe('123');
    expect(safeSerialize(true)).toBe('true');
    expect(safeSerialize(null)).toBe('null');
    expect(safeSerialize(undefined)).toBe('undefined');
  });

  it('summarizes arrays and errors', () => {
    expect(safeSerialize([1, 2, 3])).toBe('[Array length=3]');
    expect(safeSerialize(new Error('boom'))).toContain('Error: boom');
  });

  it('handles circular references and object-depth limits', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;

    const serialized = safeSerialize(obj, { maxObjectDepth: 2 });
    expect(serialized).toContain('"self"');

    const explicitCircular = safeSerialize(obj, {
      visited: new Set<unknown>([obj]),
    });
    expect(explicitCircular).toBe('[circular]');

    expect(safeSerialize({ a: 1, b: { c: 2 } }, { maxObjectDepth: 0 })).toBe('{a,b}');
  });

  it('applies property filters and strips sensitive properties', () => {
    const serialized = safeSerialize(
      { ok: 1, password: 'secret', token: 'secret-token', nested: { keep: 2 } },
      {
        maxObjectDepth: 2,
        propertyFilter: (key) => key !== 'ok',
      },
    );

    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('token');
    expect(serialized).not.toContain('"ok"');
    expect(serialized).toContain('nested');
  });

  it('provides server descriptor summaries with and without nested server', () => {
    expect(
      safeSerialize.serverDescriptor({
        server: { basePath: '/api', transport: { type: 'sse', url: '/stream' } },
      }),
    ).toEqual({
      basePath: '/api',
      transportType: 'sse',
      transportUrl: '/stream',
    });

    expect(safeSerialize.serverDescriptor({ basePath: '/fallback' })).toEqual({
      basePath: '/fallback',
      transportType: null,
      transportUrl: null,
    });
  });

  it('builds argument summaries with iteration limits and null handling', () => {
    expect(safeArgsSummary(undefined as unknown as unknown[])).toBe('[null/undefined]');

    const summary = safeArgsSummary([1, 'two', { a: 1 }, 4], { maxIterations: 2 });
    expect(summary).toBe('1, two');
  });
});
