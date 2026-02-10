/**
 * Completed stage manager for email import
 * @module @/lib/email/import/default/manager-completed
 */

import type { ImportStageManagerFactory } from '../types';

declare module '@/lib/email/import/default/manager-completed' {
  /**
   * Manager factory for the 'completed' stage of import.
   * The implementation exports a default factory function that returns an ImportStageManager.
   */
  export const managerFactory: ImportStageManagerFactory;
  export default managerFactory;
}
