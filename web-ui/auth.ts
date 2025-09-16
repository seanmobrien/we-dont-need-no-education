import NextAuth, { NextAuthConfig } from 'next-auth'; // Added NextAuthConfig
import type { Adapter } from '@auth/core/adapters';
import type { Provider } from '@auth/core/providers';
import { isRunningOnEdge } from '@/lib/site-util/env';
import { logEvent } from '@/lib/logger';

import { setupGoogleProvider } from './lib/auth/google-provider';
import { setupKeyCloakProvider } from './lib/auth/keycloak-provider';
import { authorized } from './lib/auth/authorized';

const providers: Provider[] = [
  ...setupGoogleProvider(),
  ...setupKeyCloakProvider(),
];

export const providerMap = providers.map((provider) => {
  if (typeof provider === 'function') {
    const providerData = provider();
    return { id: providerData.id, name: providerData.name };
  }
  return { id: provider.id, name: provider.name };
});

export const { handlers, auth, signIn, signOut } = NextAuth(
  async (): Promise<NextAuthConfig> => {
    // Added NextAuthConfig return type
    let adapter: Adapter | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let signInImpl: any;

    // Skip database adapter during build process, on edge, or client-side (which should never happen)
    if (
      process.env.NEXT_RUNTIME === 'nodejs' &&
      typeof window === 'undefined' &&
      !isRunningOnEdge() &&
      process.env.NEXT_PHASE !== 'phase-production-build'
    ) {
      const { setupDrizzleAdapter } = await import(
        '@/lib/auth/drizzle-adapter'
      );
      const { signIn } = await import('@/lib/auth/sign-in');
      adapter = await setupDrizzleAdapter();
      // Custom signIn implementation to update tokens on each sign-in for Google provider
      signInImpl = signIn;
    } else {
      adapter = undefined; // No adapter for edge runtime, client, or build
      signInImpl = async () => {
        logEvent('signIn');
        return false;
      };
    }
    const { session } = await import('@/lib/auth/session');
    const { jwt } = await import('@/lib/auth/jwt');
    return {
      adapter,
      callbacks: {
        authorized,
        signIn: signInImpl,
        jwt,
        session,
      },
      providers,
      pages: {
        signIn: '/auth/signin',
      },
      session: { strategy: 'jwt' },
      theme: {
        colorScheme: 'auto', // 'auto' for system preference, 'light' or 'dark'
        logo: '/static/logo/logo-dark.png',
        brandColor: '#1898a8', // Custom brand color
      },
    };
  },
);
