// Main auth configuration and handlers
export { handlers, auth, signIn, signOut, providerMap } from './auth';

// Include NextAuth/Auth.js module augmentations
import type {} from './types/auth';
import type {} from './types/nextauth';

// Export all public auth-library types
export * from './lib';
export type * from './components';

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
