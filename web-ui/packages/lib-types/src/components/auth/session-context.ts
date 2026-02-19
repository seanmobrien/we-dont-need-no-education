import { createContext, useContext } from 'react';
import { SessionContextType } from './session-context-type';
import type { AuthSession } from '../../lib/auth/session';

/**
 * React context storing signed-in session state
 */
export const SessionContext = createContext<SessionContextType<AuthSession> | null>(
  null,
);

/**
 * Hook to access session context
 *
 * This hook provides read-only access to session state managed by SessionProvider.
 * All session management logic (polling, key validation, etc.) is handled by the provider.
 */
export const useSession = <
  TSessionData extends object = AuthSession,
>(): SessionContextType<TSessionData> => {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return session as SessionContextType<TSessionData>;
};
