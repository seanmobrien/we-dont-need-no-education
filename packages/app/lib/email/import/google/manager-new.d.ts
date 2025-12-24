/**
 * Gmail 'new' stage manager
 * @module @/lib/email/import/google/manager-new
 */

import type { ImportStageManagerFactory } from '../types';

declare module '@/lib/email/import/google/manager-new' {
  /**
   * Factory that creates the 'new' stage manager for Gmail imports.
   */
  export const managerFactory: ImportStageManagerFactory;
  export default managerFactory;
}
