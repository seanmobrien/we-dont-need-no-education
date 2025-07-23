import { useContext } from "react";
import { SessionContext } from "./provider";
import { type SessionContextType } from "./types";

/**
 * Hook to access session context
 * 
 * This hook provides read-only access to session state managed by SessionProvider.
 * All session management logic (polling, key validation, etc.) is handled by the provider.
 */
export const useSession = <TSessionData extends object>(): SessionContextType<TSessionData> => {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return session as SessionContextType<TSessionData>;
};