type NodeCryptoModule = {
  randomBytes: (size: number) => Uint8Array;
};

let cachedNodeCryptoRandomBytes: NodeCryptoModule['randomBytes'] | undefined;

const loadNodeCryptoRandomBytes = (): NodeCryptoModule['randomBytes'] | undefined => {
  if (cachedNodeCryptoRandomBytes) {
    return cachedNodeCryptoRandomBytes;
  }

  try {
    if (typeof process?.getBuiltinModule !== 'function') {
      return undefined;
    }

    const nodeCrypto = process.getBuiltinModule('node:crypto') as
      | NodeCryptoModule
      | undefined;
    if (nodeCrypto?.randomBytes) {
      cachedNodeCryptoRandomBytes = nodeCrypto.randomBytes;
      return cachedNodeCryptoRandomBytes;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

/**
 * Runtime-safe cryptographic random bytes for both browser and server.
 * - Browser: uses window.crypto.getRandomValues
 * - Server: lazily loads node:crypto at runtime
 * - Fallback: uses globalThis.crypto.getRandomValues when available (e.g. edge runtimes)
 */
export const cryptoRandomBytes = (size: number): Uint8Array => {
  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError('cryptoRandomBytes size must be a positive integer');
  }

  if (
    typeof window !== 'undefined' &&
    typeof window.crypto?.getRandomValues === 'function'
  ) {
    return window.crypto.getRandomValues(new Uint8Array(size));
  }

  const nodeCryptoRandomBytes = loadNodeCryptoRandomBytes();
  if (nodeCryptoRandomBytes) {
    return nodeCryptoRandomBytes(size);
  }

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    return globalThis.crypto.getRandomValues(new Uint8Array(size));
  }

  throw new Error('No cryptographically secure random source available');
};
