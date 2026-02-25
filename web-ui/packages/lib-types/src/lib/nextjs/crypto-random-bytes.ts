type NodeCryptoModule = {
  randomBytes: (size: number) => Uint8Array;
};

const NODE_CRYPTO_RANDOM_BYTES_SYMBOL = Symbol.for(
  '@compliance-theater/types/lib/nextjs/crypto-random-bytes/node-random-bytes'
);

type GlobalWithNodeCryptoRandomBytes = typeof globalThis & {
  [NODE_CRYPTO_RANDOM_BYTES_SYMBOL]?: NodeCryptoModule['randomBytes'];
};

const loadNodeCryptoRandomBytes = (): NodeCryptoModule['randomBytes'] | undefined => {
  const g = globalThis as GlobalWithNodeCryptoRandomBytes;

  if (g[NODE_CRYPTO_RANDOM_BYTES_SYMBOL]) {
    return g[NODE_CRYPTO_RANDOM_BYTES_SYMBOL];
  }

  try {
    if (typeof process?.getBuiltinModule !== 'function') {
      return undefined;
    }

    const nodeCrypto = process.getBuiltinModule('node:crypto') as
      | NodeCryptoModule
      | undefined;
    if (nodeCrypto?.randomBytes) {
      g[NODE_CRYPTO_RANDOM_BYTES_SYMBOL] = nodeCrypto.randomBytes;
      return g[NODE_CRYPTO_RANDOM_BYTES_SYMBOL];
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
