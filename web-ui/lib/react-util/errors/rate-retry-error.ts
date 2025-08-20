
export class RateRetryError extends Error {
  readonly #chatId: string;
  readonly #turnId: string;
  readonly #retryId: string;
  readonly #retryAfter: Date;

  constructor({
    chatId,
    turnId,
    retryId,
    retryAfter
  } : { chatId: string; turnId: string; retryId: string; retryAfter: Date }) {
    super(`RateRetryError: Model Quota was exceeded while processing messages for chat ${chatId}; `);
    this.name = 'RateRetryError';
    this.#chatId = chatId;
    this.#turnId = turnId;
    this.#retryId = retryId;
    this.#retryAfter = retryAfter;
  }

  get chatId(): string {
    return this.#chatId;
  }
  get turnId(): string {
    return this.#turnId;
  }
  get retryId(): string {
    return this.#retryId;
  }
  get retryAfter(): Date {
    return this.#retryAfter;
  }
}

export const isRateRetryError = (error: unknown): error is RateRetryError => {
  if (error instanceof RateRetryError) {
    return true;
  }
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  return 'chatId' in error && 'turnId' in error && 'retryId' in error && 'retryAfter' in error;
}