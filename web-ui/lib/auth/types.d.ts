import type { Session, User as NextAuthUser } from '@auth/core/types';
/**
 * Auth types shared by the application.
 * @module @/lib/auth/types
 * This module provides thin, well‑documented TypeScript types that extend the
 * upstream NextAuth/`@auth/core` types with application specific fields. The
 * primary extension is adding an optional `account_id` to the user object which
 * our credentials provider sets for convenience and downstream services.
 *
 * Exported types:
 * - `NextAuthUserWithAccountId` — a `NextAuthUser` with optional `account_id`
 * - `SessionWithAccountId` — the standard `Session` with the extended user type
 */
declare module '@/lib/auth/types' {
  /**
   * Represents an authenticated user with an optional numeric `account_id`.
   *
   * Background:
   * - `NextAuthUser` is provided by the `next-auth` types and models the standard
   *   user properties (id, name, email, image, etc.). Our local credential provider
   *   includes `account_id` (a numeric ID used by our backend) on the returned
   *   user object. This type documents that extension so the rest of the codebase
   *   can access `account_id` safely.
   *
   * Fields:
   * - All fields from `NextAuthUser` are available.
   * - `account_id?: number` — optional numeric identifier correlating to the
   *   application's account record. Marked optional because not all auth flows
   *   populate it (for example, third‑party providers may omit it).
   * - `hash?: string` — optional hash used for obsfucated user identification
   */
  export type NextAuthUserWithAccountId = NextAuthUser & {
    /**
     * Optional numeric account identifier associated with the user in our system.
     * This is primarily used by server-side services and is not part of the
     * upstream NextAuth user shape.
     */
    account_id?: number;
    /**
     * Optional hash used for obsfucated user identification (eg flags service).
     * This is simply the account email address w/ a SHA-256 hash applied.
     */
    hash?: string;
  };
  /**
   * Session shape used across the application that includes the extended user type.
   *
   * This type augments the `Session` exported by `@auth/core/types` to indicate
   * that `session.user` (when present) may include an `account_id` via
   * `NextAuthUserWithAccountId`.
   *
   * Usage note:
   * - Prefer consuming `SessionWithAccountId` in server handlers and helpers that
   *   need access to the numeric `account_id` to avoid repetitive type assertions.
   */
  export type SessionWithAccountId = Session & {
    /**
     * Authenticated user details. May be undefined if session is empty/uninitialized.
     */
    user?: NextAuthUserWithAccountId;
  };
}
