export class RateRetryError extends Error {
    #chatId;
    #turnId;
    #retryId;
    #retryAfter;
    constructor({ chatId, turnId, retryId, retryAfter, message }) {
        super(`RateRetryError: ${message ?? `Model Quota was exceeded while processing messages for chat ${chatId}`}`);
        this.name = 'RateRetryError';
        this.#chatId = chatId;
        this.#turnId = turnId;
        this.#retryId = retryId;
        this.#retryAfter = retryAfter;
    }
    get chatId() {
        return this.#chatId;
    }
    get turnId() {
        return this.#turnId;
    }
    get retryId() {
        return this.#retryId;
    }
    get retryAfter() {
        return this.#retryAfter;
    }
}
export const isRateRetryError = (error) => {
    if (error instanceof RateRetryError) {
        return true;
    }
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    return 'chatId' in error && 'turnId' in error && 'retryId' in error && 'retryAfter' in error;
};
//# sourceMappingURL=rate-retry-error.js.map