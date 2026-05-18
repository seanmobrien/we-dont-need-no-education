import type { Session } from '@compliance-theater/types';
import type { NextAuthResult } from '@compliance-theater/auth-compat';
import { createNextAuth } from '@compliance-theater/auth-compat/runtime';
import { env } from '@compliance-theater/env';

import { setupKeyCloakProvider } from './lib/keycloak-provider';
import { authorized } from './lib/authorized';

const providers = [...setupKeyCloakProvider()];

export const providerMap = providers.map((provider) => {
  if (typeof provider === 'function') {
    const providerData = provider();
    return { id: providerData.id, name: providerData.name };
  }
  return { id: provider.id, name: provider.name };
});

const nextAuthResult: NextAuthResult = createNextAuth(async (_req) => ({
  callbacks: {
    authorized,
  },
  providers,
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 60,
    updateAge: 5 * 60,
  },
  trustHost: env('NEXTAUTH_TRUST_HOST'),
}));

export type NextAuthHandlers = NextAuthResult['handlers'];
export type NextAuthAuth = NextAuthResult['auth'];
export type NextAuthSignIn = NextAuthResult['signIn'];
export type NextAuthSignOut = NextAuthResult['signOut'];

export const handlers: NextAuthHandlers = nextAuthResult.handlers;
export const auth: NextAuthAuth = nextAuthResult.auth;
export const signIn: NextAuthSignIn = nextAuthResult.signIn;
export const signOut: NextAuthSignOut = nextAuthResult.signOut;

export type { Session };
