const brandDataIntegrityError: symbol = Symbol('DataIntegrityError');

export type DataIntegrityErrorOptions = ErrorOptions & {
  table?: string;
  id?: unknown;
  source?: string;
};

export class DataIntegrityError extends Error {
  static isDataIntegrityError(e: unknown): e is DataIntegrityError {
    return (
      typeof e === 'object' &&
      e !== null &&
      'cause' in e &&
      (e as DataIntegrityError).cause === brandDataIntegrityError
    );
  }

  static buildMessage(options: DataIntegrityErrorOptions): string {
    const { table, source } = options;
    return [
      table ? `Table '${table}'` : 'DataIntegrity error',
      source ? `Source: ${source}` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  #table: string;
  #source: string;
  [Symbol.toStringTag]: string = 'DataIntegrityError';

  constructor(
    message: string | DataIntegrityErrorOptions,
    options?: DataIntegrityErrorOptions,
  ) {
    super(
      typeof message === 'string'
        ? message
        : DataIntegrityError.buildMessage(message),
      { cause: brandDataIntegrityError },
    );
    this.name = 'DataIntegrityError';
    this.#table = options?.table ?? '';
    this.#source = options?.source ?? '';
    this[Symbol.toStringTag] = this.message;
  }

  get table(): string {
    return this.#table;
  }

  get source(): string {
    return this.#source;
  }

  get message(): string {
    const ret = super.message;
    return ret ?? `Data Integrity issue detected on table ${this.#table}`;
  }
}
