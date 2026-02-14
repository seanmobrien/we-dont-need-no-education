/**
 * Main entry point for Neon PostgreSQL database module
 * @module @/lib/neondb
 */

declare module '@compliance-theater/database/driver' {
  
  export type {
    CommandMeta,
    IResultset,    
  };

  export * from './index-postgres';
  export type { DbQueryFunction } from './index-postgres';
}
