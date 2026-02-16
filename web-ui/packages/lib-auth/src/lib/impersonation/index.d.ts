/**
 * Impersonation module exports
 * @module @/lib/auth/impersonation
 */

import type { ImpersonationService } from './impersonation.types';
import type { fromRequest, fromUserId } from './impersonation-factory';

declare module '@compliance-theater/auth/lib/impersonation' {
  export { fromRequest, fromUserId };
  export { ImpersonationService };
}
