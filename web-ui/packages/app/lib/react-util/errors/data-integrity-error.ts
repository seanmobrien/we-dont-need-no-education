/**
 * A unique symbol used to brand the `DataIntegrityError` class instances.
 */
const brandDataIntegrityError: symbol = Symbol('DataIntegrityError');

/**
 * Options for specifying details about a validation error.
 *
 * @property {string} [table] - The name of the table that caused the validation error.
 * @property {unknown} [id] - The id of the record value that is missing or invalid, if known.
 * @property {string} [source] - The source of the validation error, such as the function or module where it occurred.
 */
export type DataIntegrityErrorOptions = ErrorOptions & {
  table?: string;
  id?: unknown;
  source?: string;
};

export class DataIntegrityError extends Error {
  /**
   * Checks if the given error is an instance of `ValidationError`.
   *
   * @param {unknown} e - The error to check.
   * @returns {boolean} `true` if the error is an instance of `ValidationError`, otherwise `false`.
   */
  static isDataIntegrityError(e: unknown): e is DataIntegrityError {
    return (
      typeof e === 'object' &&
      e !== null &&
      'cause' in e &&
      (e as DataIntegrityError).cause === brandDataIntegrityError
    );
  }

  /**
   * Builds a DataIntegrity error message from the given options.
   *
   * @param {DataIntegrityErrorOptions} options - The options to build the message from.
   * @returns {string} The constructed DataIntegrity error message.
   */
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
  /**
   * Constructs a new instance of `DataIntegrityError`.
   *
   * @param {string | DataIntegrityErrorOptions} message - The error message or options to build the message from.
   * @param {DataIntegrityErrorOptions} [options] - Additional options for the DataIntegrity error.
   */
  constructor(
    message: string | DataIntegrityErrorOptions,
    options?: DataIntegrityErrorOptions
  ) {
    super(
      typeof message === 'string'
        ? message
        : DataIntegrityError.buildMessage(message),
      { cause: brandDataIntegrityError }
    );
    this.name = 'DataIntegrityError';
    this.#table = options?.table ?? '';
    this.#source = options?.source ?? '';
    this[Symbol.toStringTag] = this.message;
  }

  /**
   * Gets the field associated with the DataIntegrity error.
   *
   * @returns {string} The field associated with the DataIntegrity error.
   */
  get table(): string {
    return this.#table;
  }
  /**
   * Gets the source of the DataIntegrity error.
   *
   * @returns {string} The source of the DataIntegrity error.
   */
  get source(): string {
    return this.#source;
  }

  /**
   * Gets the error message associated with the DataIntegrity error.
   *
   * @returns {string} The error message associated with the DataIntegrity error.
   */
  get message(): string {
    const ret = super.message;
    return ret ?? `Data Integrity issue detected on table ${this.#table}`;
  }
}
