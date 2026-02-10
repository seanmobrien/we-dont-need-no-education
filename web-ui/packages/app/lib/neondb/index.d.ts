/**
 * Main entry point for Neon PostgreSQL database module
 * @module @/lib/neondb
 */

declare module '@/lib/neondb' {
  export type * from './types';
  export * from './index-postgres';
  export type { DbQueryFunction } from './index-postgres';
}
