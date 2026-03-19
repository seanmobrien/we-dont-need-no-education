export class MissingReactQueryPeerError extends Error {
  readonly cause: unknown;

  constructor(cause?: unknown) {
    super(
      'React Query runtime is unavailable. Install @tanstack/react-query in the web-ui workspace root to use @compliance-theater/react-query-compat/runtime.',
    );
    this.name = 'MissingReactQueryPeerError';
    this.cause = cause;
  }
}

export const isMissingReactQueryPeerError = (
  error: unknown,
): error is MissingReactQueryPeerError => {
  return error instanceof MissingReactQueryPeerError;
};
