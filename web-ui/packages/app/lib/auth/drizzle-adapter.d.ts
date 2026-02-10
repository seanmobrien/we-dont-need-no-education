/**
 * Drizzle adapter for NextAuth
 * @module @/lib/auth/drizzle-adapter
 */

declare module '@/lib/auth/drizzle-adapter' {
  /**
   * Drizzle ORM adapter for NextAuth session storage.
   */
  export function DrizzleAdapter(db: unknown): unknown;
}
