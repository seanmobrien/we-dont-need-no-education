import { RateRetryError, isRateRetryError } from '../../src/errors/rate-retry-error';

const baseParams = {
  chatId: 'chat-123',
  turnId: 'turn-456',
  retryId: 'retry-789',
  retryAfter: new Date('2026-01-01T00:00:00Z'),
};

describe('RateRetryError', () => {
  describe('constructor', () => {
    it('extends Error', () => {
      const err = new RateRetryError(baseParams);
      expect(err).toBeInstanceOf(Error);
    });

    it('sets name to RateRetryError', () => {
      const err = new RateRetryError(baseParams);
      expect(err.name).toBe('RateRetryError');
    });

    it('uses default message when none provided', () => {
      const err = new RateRetryError(baseParams);
      expect(err.message).toBe(
        `RateRetryError: Model Quota was exceeded while processing messages for chat ${baseParams.chatId}`,
      );
    });

    it('uses custom message when provided', () => {
      const err = new RateRetryError({ ...baseParams, message: 'Too many requests' });
      expect(err.message).toBe('RateRetryError: Too many requests');
    });

    it('stores chatId', () => {
      const err = new RateRetryError(baseParams);
      expect(err.chatId).toBe('chat-123');
    });

    it('stores turnId', () => {
      const err = new RateRetryError(baseParams);
      expect(err.turnId).toBe('turn-456');
    });

    it('stores retryId', () => {
      const err = new RateRetryError(baseParams);
      expect(err.retryId).toBe('retry-789');
    });

    it('stores retryAfter', () => {
      const err = new RateRetryError(baseParams);
      expect(err.retryAfter).toEqual(new Date('2026-01-01T00:00:00Z'));
    });
  });

  describe('isRateRetryError', () => {
    it('returns true for RateRetryError instances', () => {
      expect(isRateRetryError(new RateRetryError(baseParams))).toBe(true);
    });

    it('returns true for duck-typed objects with all required fields', () => {
      const fake = {
        chatId: 'c',
        turnId: 't',
        retryId: 'r',
        retryAfter: new Date(),
      };
      expect(isRateRetryError(fake)).toBe(true);
    });

    it('returns false for plain Error', () => {
      expect(isRateRetryError(new Error('nope'))).toBe(false);
    });

    it('returns false for null', () => {
      expect(isRateRetryError(null)).toBe(false);
    });

    it('returns false for a string', () => {
      expect(isRateRetryError('not an error')).toBe(false);
    });

    it('returns false for a number', () => {
      expect(isRateRetryError(42)).toBe(false);
    });

    it('returns false for object missing retryAfter', () => {
      expect(isRateRetryError({ chatId: 'c', turnId: 't', retryId: 'r' })).toBe(false);
    });

    it('returns false for object missing chatId', () => {
      expect(isRateRetryError({ turnId: 't', retryId: 'r', retryAfter: new Date() })).toBe(false);
    });
  });
});
