export class MissingNextAuthPeerError extends Error {
  readonly cause: unknown;

  constructor(cause?: unknown) {
    super(
      'next-auth runtime is unavailable. Install next-auth in the web-ui workspace root to use @compliance-theater/auth-compat/runtime.',
    );
    this.name = 'MissingNextAuthPeerError';
    this.cause = cause;
  }
}

export const isMissingNextAuthPeerError = (
  error: unknown,
): error is MissingNextAuthPeerError => {
  return error instanceof MissingNextAuthPeerError;
};

export class MissingAuthCorePeerError extends Error {
  readonly cause: unknown;

  constructor(cause?: unknown) {
    super(
      '@auth/core runtime is unavailable. Install @auth/core in the web-ui workspace root to use @compliance-theater/auth-compat/runtime.',
    );
    this.name = 'MissingAuthCorePeerError';
    this.cause = cause;
  }
}

export const isMissingAuthCorePeerError = (
  error: unknown,
): error is MissingAuthCorePeerError => {
  return error instanceof MissingAuthCorePeerError;
};

export class MissingDrizzleAdapterPeerError extends Error {
  readonly cause: unknown;

  constructor(cause?: unknown) {
    super(
      '@auth/drizzle-adapter runtime is unavailable. Install @auth/drizzle-adapter in the web-ui workspace root to use @compliance-theater/auth-compat/runtime.',
    );
    this.name = 'MissingDrizzleAdapterPeerError';
    this.cause = cause;
  }
}

export const isMissingDrizzleAdapterPeerError = (
  error: unknown,
): error is MissingDrizzleAdapterPeerError => {
  return error instanceof MissingDrizzleAdapterPeerError;
};
