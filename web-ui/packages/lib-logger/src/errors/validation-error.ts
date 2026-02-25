const brandValidationError: symbol = Symbol('ValidationError');

export type ValidationErrorOptions = {
  field?: string;
  value?: unknown;
  expected?: unknown;
  reason?: string;
  source?: string;
};

export class ValidationError extends Error {
  static isValidationError(e: unknown): e is ValidationError {
    return (
      typeof e === 'object' &&
      e !== null &&
      'cause' in e &&
      (e as ValidationError).cause === brandValidationError
    );
  }

  static buildMessage(options: ValidationErrorOptions): string {
    const { field, value, expected, reason, source } = options;
    return [
      field ? `Field '${field}'` : 'Validation error',
      value ? `Value: ${JSON.stringify(value)}` : '',
      expected ? `Expected: ${JSON.stringify(expected)}` : '',
      reason ? `Reason: ${reason}` : '',
      source ? `Source: ${source}` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  #field: string;
  #value: unknown;
  #expected: unknown;
  #reason: string;
  #source: string;
  [Symbol.toStringTag]: string = 'ValidationError';

  constructor(
    message: string | ValidationErrorOptions,
    options?: ValidationErrorOptions,
  ) {
    super(
      typeof message === 'string'
        ? message
        : ValidationError.buildMessage(message),
      { cause: brandValidationError },
    );
    this.name = 'ValidationError';
    this.#field = options?.field ?? '';
    this.#value = options?.value ?? '';
    this.#expected = options?.expected ?? '';
    this.#reason = options?.reason ?? '';
    this.#source = options?.source ?? '';
    this[Symbol.toStringTag] = this.message;
  }

  get field(): string {
    return this.#field;
  }

  get value(): unknown {
    return this.#value;
  }

  get expected(): unknown {
    return this.#expected;
  }

  get reason(): string {
    return this.#reason;
  }

  get source(): string {
    return this.#source;
  }
}
