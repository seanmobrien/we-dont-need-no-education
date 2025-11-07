/**
 * Type definitions for session provider hooks
 * @module components/auth/session-provider/hooks
 */

import type { SessionContextType } from './types';
import type { Session } from '@auth/core/types';

declare module '@/components/auth/session-provider/hooks' {
  /**
   * Hook to access session context
   *
   * This hook provides read-only access to session state managed by SessionProvider.
   * All session management logic (polling, key validation, etc.) is handled by the provider.
   */
  export function useSession<
    TSessionData extends object = Session,
  >(): SessionContextType<TSessionData>;
}
