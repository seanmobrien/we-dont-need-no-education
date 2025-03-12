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
  readonly #messageIds: Array<string>;

  constructor() {
    this.#query = '';
    this.#messageIds = [];
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
   * Appends a message ID to the list of message IDs.
   *
   * @param messageId - The ID of the message to append.
   * @returns The current instance of MailQueryBuilder for method chaining.
   */
  appendMessageId(messageId: string | string[]): MailQueryBuilder {
    const normalize = (x: string) => {
      return x.replace(' ', '+');
    };

    if (Array.isArray(messageId)) {
      messageId.forEach((x) => this.appendMessageId(normalize(x)));
      return this;
    }

    if (this.#messageIds.includes(messageId)) {
      return this;
    }
    this.#messageIds.push(normalize(messageId));
    return this;
  }

  /**
   * Builds and returns the query string if it exists.
   *
   * @returns {string | undefined} The trimmed query string if it exists, otherwise undefined.
   */
  build(): string | undefined {
    let q = this.hasQuery
      ? this.#query.trim()
      : '' + this.buildMessageIdQuery();
    q = q.trim();
    return q.length > 0 ? q : undefined;
  }

  /**
   * Builds a query string for message IDs.
   *
   * This method constructs a query string based on the `#messageIds` array.
   * If the array is empty, it returns an empty string.
   * If the array contains one message ID, it returns a string in the format `rfc822msgid:<messageId>`.
   * If the array contains multiple message IDs, it returns a string in the format `{rfc822msgid:<messageId1> rfc822msgid:<messageId2> ...}`.
   *
   * @returns {string} The constructed query string for message IDs.
   */
  private buildMessageIdQuery(): string {
    if (this.#messageIds.length === 0) {
      return '';
    }
    const key = 'rfc822msgid';
    if (this.#messageIds.length === 1) {
      return `${key}:${this.#messageIds[0]}`;
    }
    return '{' + this.#messageIds.map((id) => `${key}:${id}`).join(' ') + '}';
  }
}
