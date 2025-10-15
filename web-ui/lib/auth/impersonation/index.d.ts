/**
 * Impersonation module exports
 * @module @/lib/auth/impersonation
 */

import type { ImpersonationService } from './impersonation.types';
import type { fromRequest, fromUserId } from './impersonation-factory';

declare module '@/lib/auth/impersonation' {
  export { fromRequest, fromUserId };
  export { ImpersonationService };
}
