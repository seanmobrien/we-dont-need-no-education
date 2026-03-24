import type {
  User,
  NextAuthConfig,
  NextAuthResult,
  Provider,
} from '@compliance-theater/auth-compat';
import { createNextAuth } from '@compliance-theater/auth-compat/runtime';
import { env } from '@compliance-theater/env';

import { setupKeyCloakProvider } from './lib/keycloak-provider';
import { loadAuthRuntimeDependencies } from './lib/load-auth-runtime-dependencies';
import { getRuntimeTarget } from './lib/runtime-loader';

const providers: Provider[] = [...setupKeyCloakProvider()];

export const providerMap = providers.map((provider) => {
  if (typeof provider === 'function') {
    const providerData = provider();
    return { id: providerData.id, name: providerData.name };
  }
  return { id: provider.id, name: provider.name };
});

export const buildNextAuthConfig = async (req?: Request): Promise<NextAuthConfig> => {
  const runtime = getRuntimeTarget();
  const isNodeServerRuntime =
    runtime === 'node' && process.env.NEXT_PHASE !== 'phase-production-build';
  const { adapter, signInImpl, callbacks } = await loadAuthRuntimeDependencies({
    runtime,
    isNodeServerRuntime,
  });

  const isLocalhost = req?.url && new URL(req.url).hostname === 'localhost' && env('NEXTAUTH_URL')?.includes('localhost');
  return {
    adapter,
    callbacks: {
      authorized: callbacks.authorized,
      signIn: signInImpl,
      jwt: callbacks.jwt,
      session: callbacks.session,
      redirect: callbacks.redirect,
    },
    providers, 
    pages: {
      signIn: '/auth/signin',
    },
    session: {
      user: { id: '123' } as User,
      strategy: 'jwt',
      maxAge: 30 * 60,
      updateAge: 5 * 60,
    },
    theme: {
      colorScheme: 'auto',
      logo: '/static/logo/logo-dark.png',
      brandColor: '#1898a8',
    },
    trustHost: env('NEXTAUTH_TRUST_HOST')
  } as NextAuthConfig;
};

const nextAuthResult: NextAuthResult = createNextAuth(buildNextAuthConfig);

export type NextAuthHandlers = NextAuthResult['handlers'];
export type NextAuthAuth = NextAuthResult['auth'];
export type NextAuthSignIn = NextAuthResult['signIn'];
export type NextAuthSignOut = NextAuthResult['signOut'];

export const handlers: NextAuthHandlers = nextAuthResult.handlers;
export const auth: NextAuthAuth = nextAuthResult.auth;
export const signIn: NextAuthSignIn = nextAuthResult.signIn;
export const signOut: NextAuthSignOut = nextAuthResult.signOut;
