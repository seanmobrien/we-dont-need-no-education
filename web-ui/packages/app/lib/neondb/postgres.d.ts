/**
 * @fileoverview Type Definitions for PostgreSQL Driver
 *
 * This module provides comprehensive type aliases equivalent to the postgres.Sql<T> type
 * and all its dependencies from the 'postgres' package. These types enable type-safe
 * PostgreSQL operations while maintaining compatibility with the original postgres types.
 *
 * @module lib/neondb/postgres-types
 * @version 1.0.0
 * @since 2025-07-26
 */

declare module '@/lib/neondb/postgres' {
  // Re-export all postgres types with comprehensive documentation preserved
  export * from './postgres';
}
