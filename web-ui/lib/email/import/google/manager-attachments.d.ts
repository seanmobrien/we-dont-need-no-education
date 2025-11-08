/**
 * Gmail attachments stage manager
 * @module @/lib/email/import/google/manager-attachments
 */

import type { ImportStageManagerFactory } from '../types';

declare module '@/lib/email/import/google/manager-attachments' {
  /**
   * Factory that creates the attachments stage manager for Gmail imports.
   */
  export const managerFactory: ImportStageManagerFactory;
  export default managerFactory;
}
