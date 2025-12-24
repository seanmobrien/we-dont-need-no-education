/**
 * Gmail 'staged' stage manager
 * @module @/lib/email/import/google/manager-staged
 */

import type { ImportStageManagerFactory } from '../types';

declare module '@/lib/email/import/google/manager-staged' {
  /**
   * Factory that creates the staged stage manager for Gmail imports.
   */
  export const managerFactory: ImportStageManagerFactory;
  export default managerFactory;
}
