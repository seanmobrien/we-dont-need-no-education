/**
 * A class to build mail query strings for a specific provider.
 *
 * @class
 * @example
 * const builder = new MailQueryBuilder();
 * builder.appendQueryParam('from', 'example@example.com');
 * const query = builder.build(); // 'from:example@example.com'
 */
export class MailQueryBuilder {
  #query: string;

  constructor() {
    this.#query = '';
  }

  /**
   * Checks if the query has any elements.
   *
   * @returns {boolean} `true` if the query has one or more elements, otherwise `false`.
   */
  get hasQuery(): boolean {
    return this.#query.length > 0;
  }

  /**
   * Appends a query parameter to the existing query string.
   *
   * @param queryKey - The key of the query parameter to append.
   * @param input - The value(s) of the query parameter. Can be a string or an array of strings.
   * @returns The current instance of `MailQueryBuilder` for method chaining.
   */
  appendQueryParam(
    queryKey: string,
    input: string | string[]
  ): MailQueryBuilder {
    const data = (Array.isArray(input) ? input : [input])
      .map((item) => item?.trim() ?? '')
      .filter(Boolean);
    if (data.length > 0) {
      this.#query += `${queryKey}:${data.join(` ${queryKey}:`)} `;
    }
    return this;
  }

  /**
   * Builds and returns the query string if it exists.
   *
   * @returns {string | undefined} The trimmed query string if it exists, otherwise undefined.
   */
  build(): string | undefined {
    return this.hasQuery ? this.#query.trim() : undefined;
  }
}
