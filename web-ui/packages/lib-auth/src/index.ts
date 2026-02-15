// Main auth configuration and handlers
export { handlers, auth, signIn, signOut, providerMap } from './auth';

// Re-export commonly used types from next-auth
export type {
  Session,
  User,
  Account,
  Profile,
  AuthConfig,
} from '@auth/core/types';
export type { JWT } from '@auth/core/jwt';
export type { Adapter } from '@auth/core/adapters';
