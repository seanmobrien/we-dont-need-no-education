import { hideConsoleOutput } from '../../app/__tests__/shared/test-utils-server';
import { StrongReferenceStorage } from '../src/singleton-provider/storage-strong-ref';

describe('StrongReferenceStorage', () => {
  let storage: StrongReferenceStorage;

  beforeEach(() => {
    storage = new StrongReferenceStorage();
  });

  it('stores, retrieves, checks, deletes, and clears global-symbol keys', () => {
    const keyA = Symbol.for('storage-a');
    const keyB = Symbol.for('storage-b');

    storage.set(keyA, { id: 'a' });
    storage.set(keyB, { id: 'b' });

    expect(storage.has(keyA)).toBe(true);
    expect(storage.get(keyA)).toEqual({ id: 'a' });

    storage.delete(keyA);
    expect(storage.has(keyA)).toBe(false);

    storage.clear();
    expect(storage.has(keyB)).toBe(false);
  });

  it('allows non-global symbol keys without throwing', () => {
    hideConsoleOutput().setup();
    const localSymbol = Symbol('local-storage-key');
    expect(() => storage.get(localSymbol)).not.toThrow();
    expect(() => storage.set(localSymbol, { id: 'x' })).not.toThrow();
    expect(storage.get(localSymbol)).toEqual({ id: 'x' });
  });
});
