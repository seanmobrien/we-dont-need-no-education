// Main auth configuration and handlers
export { handlers, auth, signIn, signOut, providerMap } from './auth';
export type { Session } from '@compliance-theater/types';

// Export all public auth-library types
export * from './lib';
export type {
    SessionContextType,
    KeyValidationStatus,
    SessionResponse,
} from './components/session-provider/types';
export { SessionProvider } from './components/session-provider/provider';
export { useSession } from './components/session-provider/hooks';
export { KeyRefreshNotify } from './components/key-refresh-notify';



