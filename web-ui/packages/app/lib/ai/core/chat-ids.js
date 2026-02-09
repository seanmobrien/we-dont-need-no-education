import { log } from '@/lib/logger';
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
    if (!seed) {
        actualSeed = Math.floor(Math.random() * 1000000);
    }
    else if (typeof seed === 'number') {
        actualSeed = seed;
    }
    else {
        actualSeed = Number.parseInt(notCryptoSafeKeyHash(seed), 10);
    }
    const random = seededRandom(actualSeed);
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
        const cb = chars[Math.floor(random() * chars.length)];
        if (cb === undefined) {
            log((l) => l.error('Chat ID generation failed', { seed: actualSeed }));
        }
        id += cb ?? '';
    }
    return {
        seed: actualSeed,
        id,
    };
};
export const splitIds = (id) => {
    if (!id) {
        log((l) => l.warn('No ID provided to splitIds, returning emtpy values.'));
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
