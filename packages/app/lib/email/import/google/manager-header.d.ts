/**
 * Gmail header stage manager
 * @module @/lib/email/import/google/manager-header
 */

import type { ImportStageManagerFactory } from '../types';

declare module '@/lib/email/import/google/manager-header' {
  /**
   * Factory that creates the header stage manager for Gmail imports.
   */
  export const managerFactory: ImportStageManagerFactory;
  export default managerFactory;
}
