/**
 * Gmail body stage manager
 * @module @/lib/email/import/google/manager-body
 */

import type { ImportStageManagerFactory } from '../types';

declare module '@/lib/email/import/google/manager-body' {
  /**
   * Factory that creates the body stage manager for Gmail imports.
   */
  export const managerFactory: ImportStageManagerFactory;
  export default managerFactory;
}
