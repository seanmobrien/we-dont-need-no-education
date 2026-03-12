import { RateRetryError, isRateRetryError } from '../../src/errors/rate-retry-error';

describe('RateRetryError', () => {
    it('builds default message and exposes getters', () => {
        const retryAfter = new Date('2026-01-01T00:00:00.000Z');
        const error = new RateRetryError({
            chatId: 'c1',
            turnId: 't1',
            retryId: 'r1',
            retryAfter,
        });

        expect(error.name).toBe('RateRetryError');
        expect(error.message).toContain('Model Quota was exceeded');
        expect(error.chatId).toBe('c1');
        expect(error.turnId).toBe('t1');
        expect(error.retryId).toBe('r1');
        expect(error.retryAfter).toBe(retryAfter);
    });

    it('uses custom message when provided', () => {
        const error = new RateRetryError({
            chatId: 'c2',
            turnId: 't2',
            retryId: 'r2',
            retryAfter: new Date('2026-01-02T00:00:00.000Z'),
            message: 'custom retry message',
        });

        expect(error.message).toContain('custom retry message');
    });

    it('type guard handles instance, shape, and invalid input', () => {
        const instance = new RateRetryError({
            chatId: 'c3',
            turnId: 't3',
            retryId: 'r3',
            retryAfter: new Date('2026-01-03T00:00:00.000Z'),
        });

        expect(isRateRetryError(instance)).toBe(true);
        expect(
            isRateRetryError({
                chatId: 'c4',
                turnId: 't4',
                retryId: 'r4',
                retryAfter: new Date('2026-01-04T00:00:00.000Z'),
            }),
        ).toBe(true);
        expect(isRateRetryError(null)).toBe(false);
        expect(isRateRetryError('x')).toBe(false);
    });
});
