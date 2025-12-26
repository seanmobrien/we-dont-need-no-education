export class AggregateError extends Error {
  public static isAggregateError(e: unknown): e is AggregateError {
    return e instanceof AggregateError;
  }

  private static buildMessage(
    messageOrError: string | Error,
    errors: Error[],
  ): string {
    return messageOrError instanceof Error
      ? `An aggregate error has occurred:\n${[
          messageOrError,
          ...(errors ?? []),
        ].join('\n')}`
      : `${messageOrError}\n${errors.map((e) => e.message).join('\n')}`;
  }

  public static fromErrors(errors: Error[]): AggregateError {
    return new AggregateError(...[errors[0], ...(errors.slice(1) ?? [])]);
  }

  constructor(...[messageOrError, ...errors]: [string | Error, ...Error[]]) {
    super(AggregateError.buildMessage(messageOrError, errors));
    this.name = 'AggregateError';
    this.#errors =
      typeof messageOrError == 'object'
        ? [messageOrError, ...errors]
        : [...errors];    
  }

  [index: number]: Error;

  readonly #errors: Error[];

  public get count(): number {
    return this.#errors.length;
  }

  public get(index: number): Error {
    return this.#errors[index];
  }

  public all(): Error[] {
    return [...this.#errors];
  }

  public toString(): string {
    return this.message;
  }
}
