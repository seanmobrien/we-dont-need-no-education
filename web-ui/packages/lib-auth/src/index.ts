// Main auth configuration and handlers
export { handlers, auth, signIn, signOut, providerMap } from './auth';
export type { Session } from '@compliance-theater/types';

// Export all public auth-library types
export {
    setupSession,
} from './lib/session/shared';
export { refreshAccessToken } from './lib/refresh-token';
export type {
    SessionContextType,
    KeyValidationStatus,
    SessionResponse,
} from './components/session-provider/types';
export { SessionProvider } from './components/session-provider/provider';
export { useSession } from './components/session-provider/hooks';
export { KeyRefreshNotify } from './components/key-refresh-notify';



