/**
 * JWT utilities
 * @module @/lib/auth/jwt
 */

declare module '@/lib/auth/jwt' {
  /**
   * JWT encoding and decoding utilities.
   */
  export function encode(payload: unknown): Promise<string>;
  export function decode(token: string): Promise<unknown>;
}
