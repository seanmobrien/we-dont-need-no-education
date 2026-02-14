import { log } from '@compliance-theater/logger';
import { cryptoRandomBytes } from '@/lib/react-util/crypto-random-bytes';
const CHAT_ID_LENGTH = 8;
const CHAT_ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const seededRandom = (seed) => {
    return () => {
        seed = (seed * 9301 + 49297) % 233280;
        return Math.abs(seed / 233280);
    };
};
export const notCryptoSafeKeyHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
};
export const generateChatId = (seed) => {
    let actualSeed;
    if (seed === undefined || seed === null) {
        let id = '';
        const unbiasedUpperBound = Math.floor(256 / CHAT_ID_CHARS.length) * CHAT_ID_CHARS.length;
        while (id.length < CHAT_ID_LENGTH) {
            const bytes = cryptoRandomBytes(CHAT_ID_LENGTH - id.length);
            for (let i = 0; i < bytes.length && id.length < CHAT_ID_LENGTH; i++) {
                const byte = bytes[i];
                if (byte === undefined || byte >= unbiasedUpperBound) {
                    continue;
                }
                const idx = byte % CHAT_ID_CHARS.length;
                const next = CHAT_ID_CHARS[idx];
                if (next === undefined) {
                    log((l) => l.error('Chat ID generation failed (secure random)', { idx, byte }));
                    continue;
                }
                id += next;
            }
        }
        const seedBytes = cryptoRandomBytes(4);
        const seedView = new DataView(seedBytes.buffer, seedBytes.byteOffset, seedBytes.byteLength);
        actualSeed = seedView.getUint32(0);
        return { seed: actualSeed, id };
    }
    actualSeed =
        typeof seed === 'number'
            ? Math.trunc(seed)
            : Number.parseInt(notCryptoSafeKeyHash(seed), 10);
    const random = seededRandom(actualSeed);
    let id = '';
    for (let i = 0; i < CHAT_ID_LENGTH; i++) {
        const idx = Math.floor(random() * CHAT_ID_CHARS.length);
        const cb = CHAT_ID_CHARS[idx];
        if (cb === undefined) {
            log((l) => l.error('Chat ID generation failed', { seed: actualSeed, idx }));
            continue;
        }
        id += cb;
    }
    return { seed: actualSeed, id };
};
export const splitIds = (id) => {
    if (!id) {
        log((l) => l.warn('No ID provided to splitIds, returning empty values.'));
        return ['', undefined];
    }
    const splitIndex = id.indexOf(':');
    if (splitIndex === -1) {
        log((l) => l.warn('No ":" found in ID, returning as is.'));
        return [id, undefined];
    }
    if (splitIndex === 0 || splitIndex === id.length - 1) {
        log((l) => l.warn('Invalid ID format, returning empty values.'));
        return ['', undefined];
    }
    return [id.slice(0, splitIndex), id.slice(splitIndex + 1)];
};
//# sourceMappingURL=chat-ids.js.map