export class InvalidGrantError extends Error {
  constructor(error: Error | unknown)
  constructor(message: string, {
    cause,
  }: {
    cause?: unknown;
  })
  constructor(error: Error | string, ops?: unknown) {
    if (typeof error === 'string') {
      super(error);
    } else {
      super(error.message, {
        ...(ops ?? {}),
        cause: error
      });
    }
    this.name = 'InvalidGrantError';
  }
}
