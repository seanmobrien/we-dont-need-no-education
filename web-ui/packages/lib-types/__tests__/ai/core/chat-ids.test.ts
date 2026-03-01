const cryptoRandomBytesMock = jest.fn();

jest.mock('../../../src/lib/nextjs/crypto-random-bytes', () => ({
    cryptoRandomBytes: (...args: unknown[]) => cryptoRandomBytesMock(...args),
}));

import {
    generateChatId,
    notCryptoSafeKeyHash,
    splitIds,
} from '../../../src/lib/ai/core/chat-ids';

describe('lib/ai/core/chat-ids', () => {
    beforeEach(() => {
        cryptoRandomBytesMock.mockReset();
    });

    it('produces deterministic ids for numeric and string seeds', () => {
        const a = generateChatId(123);
        const b = generateChatId(123);
        expect(a).toEqual(b);
        expect(a.id).toHaveLength(8);

        const c = generateChatId('abc-seed');
        const d = generateChatId('abc-seed');
        expect(c).toEqual(d);
        expect(c.id).toHaveLength(8);
    });

    it('generates id and seed from crypto bytes when no seed provided', () => {
        cryptoRandomBytesMock
            .mockImplementationOnce(() =>
                Uint8Array.from([255, 252, 1, 2, 3, 4, 5, 6, 7, 8])
            )
            .mockImplementationOnce(() => Uint8Array.from([1, 2, 3, 4]));

        const result = generateChatId();

        expect(result.id).toHaveLength(8);
        expect(result.id).toMatch(/^[a-z0-9]{8}$/);
        expect(result.seed).toBe(16909060);
        expect(cryptoRandomBytesMock).toHaveBeenCalledWith(8);
        expect(cryptoRandomBytesMock).toHaveBeenCalledWith(4);
    });

    it('hashes strings consistently', () => {
        const first = notCryptoSafeKeyHash('same-input');
        const second = notCryptoSafeKeyHash('same-input');
        const third = notCryptoSafeKeyHash('different-input');

        expect(first).toBe(second);
        expect(first).not.toBe(third);
        expect(typeof first).toBe('string');
    });

    it('splits ids across normal and edge cases', () => {
        expect(splitIds('chat:msg')).toEqual(['chat', 'msg']);
        expect(splitIds('chat')).toEqual(['chat', undefined]);
        expect(splitIds('')).toEqual(['', undefined]);
        expect(splitIds(':msg')).toEqual(['', undefined]);
        expect(splitIds('chat:')).toEqual(['', undefined]);
        expect(splitIds('a:b:c')).toEqual(['a', 'b:c']);
    });
});