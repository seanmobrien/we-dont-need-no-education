import type { SessionExt } from './_types';

declare module '@/lib/site-util/auth/_guards' {
  /**
   * Type guard to check if a session object is a SessionExt
   *
   * Validates that the provided session object has the expected structure
   * of a SessionExt, including the server property with nested tokens.
   * This is useful for runtime type checking when handling session objects
   * that may come from different sources or versions.
   *
   * @param session - The session object to validate
   * @returns True if the session is a valid SessionExt with server tokens, false otherwise
   *
   * @example
   * ```typescript
   * const session = await auth();
   * if (isSessionExt(session)) {
   *   // TypeScript now knows session has .server.tokens
   *   const tokens = await session.server.resolveTokens();
   * }
   * ```
   */
  export const isSessionExt: (session: unknown) => session is SessionExt;
}
