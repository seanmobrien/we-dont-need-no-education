/**
 * Factory for creating Gmail import stage manager map
 * @module @/lib/email/import/google/managermapfactory
 */
import type { ImportManagerMap } from '../types';

declare module '@/lib/email/import/google/managermapfactory' {
  /**
   * Creates a map of import stage managers for Gmail provider.
   *
   * @param provider - The provider name (should be 'gmail')
   * @returns Map of import stages to their manager factory functions
   */
  export function managerMapFactory(provider: string): ImportManagerMap;
}
