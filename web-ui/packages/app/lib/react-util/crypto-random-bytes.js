let cachedNodeCryptoRandomBytes;
const loadNodeCryptoRandomBytes = () => {
    if (cachedNodeCryptoRandomBytes) {
        return cachedNodeCryptoRandomBytes;
    }
    try {
        if (typeof process?.getBuiltinModule !== 'function') {
            return undefined;
        }
        const nodeCrypto = process.getBuiltinModule('node:crypto');
        if (nodeCrypto?.randomBytes) {
            cachedNodeCryptoRandomBytes = nodeCrypto.randomBytes;
            return cachedNodeCryptoRandomBytes;
        }
    }
    catch {
        return undefined;
    }
    return undefined;
};
export const cryptoRandomBytes = (size) => {
    if (!Number.isInteger(size) || size <= 0) {
        throw new RangeError('cryptoRandomBytes size must be a positive integer');
    }
    if (typeof window !== 'undefined' &&
        typeof window.crypto?.getRandomValues === 'function') {
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
//# sourceMappingURL=crypto-random-bytes.js.map