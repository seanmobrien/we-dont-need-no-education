/**
 * Gmail contacts stage manager
 * @module @/lib/email/import/google/manager-contacts
 */

import type { ImportStageManagerFactory } from '../types';

declare module '@/lib/email/import/google/manager-contacts' {
  /**
   * Factory that creates the contacts stage manager for Gmail imports.
   */
  export const managerFactory: ImportStageManagerFactory;
  export default managerFactory;
}
