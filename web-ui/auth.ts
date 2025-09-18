import NextAuth, { Account, NextAuthConfig, Profile, User } from 'next-auth'; // Added NextAuthConfig
import type { Adapter, AdapterSession, AdapterUser } from '@auth/core/adapters';
import type { CredentialInput, Provider } from '@auth/core/providers';
import { isRunningOnEdge } from '@/lib/site-util/env';
import { logEvent } from '@/lib/logger';

import { setupGoogleProvider } from './lib/auth/google-provider';
import { setupKeyCloakProvider } from './lib/auth/keycloak-provider';
import { authorized } from './lib/auth/authorized';
import { JWT } from '@auth/core/jwt';
import { Awaitable, DefaultSession, Session } from '@auth/core/types';

type DynamicImports = {
  drizzleAdapter: {
    setupDrizzleAdapter: () => Promise<Adapter>;
  };
  auth: {
    session: {
      session: (
        params: ({
          session: { user: AdapterUser } & AdapterSession;
          /** Available when {@link AuthConfig.session} is set to `strategy: "database"`. */
          user: AdapterUser;
        } & {
          session: Session;
          /** Available when {@link AuthConfig.session} is set to `strategy: "jwt"` */
          token: JWT;
        }) & {
          /**
           * Available when using {@link AuthConfig.session} `strategy: "database"` and an update is triggered for the session.
           *
           * :::note
           * You should validate this data before using it.
           * :::
           */
          // Using any for library compatibility
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          newSession: any;
          trigger?: 'update';
        },
      ) => Awaitable<Session | DefaultSession>;
    };
    signIn: {
      signIn: (params: {
        user: User | AdapterUser;
        account?: Account | null;
        /**
         * If OAuth provider is used, it contains the full
         * OAuth profile returned by your provider.
         */
        profile?: Profile;
        /**
         * If Email provider is used, on the first call, it contains a
         * `verificationRequest: true` property to indicate it is being triggered in the verification request flow.
         * When the callback is invoked after a user has clicked on a sign in link,
         * this property will not be present. You can check for the `verificationRequest` property
         * to avoid sending emails to addresses or domains on a blocklist or to only explicitly generate them
         * for email address in an allow list.
         */
        email?: {
          verificationRequest?: boolean;
        };
        /** If Credentials provider is used, it contains the user credentials */
        credentials?: Record<string, CredentialInput>;
      }) => Awaitable<boolean | string>;
    };
    jwt: {
      jwt: (params: {
        /**
         * When `trigger` is `"signIn"` or `"signUp"`, it will be a subset of {@link JWT},
         * `name`, `email` and `image` will be included.
         *
         * Otherwise, it will be the full {@link JWT} for subsequent calls.
         */
        token: JWT;
        /**
         * Either the result of the {@link OAuthConfig.profile} or the {@link CredentialsConfig.authorize} callback.
         * @note available when `trigger` is `"signIn"` or `"signUp"`.
         *
         * Resources:
         * - [Credentials Provider](https://authjs.dev/getting-started/authentication/credentials)
         * - [User database model](https://authjs.dev/guides/creating-a-database-adapter#user-management)
         */
        user: User | AdapterUser;
        /**
         * Contains information about the provider that was used to sign in.
         * Also includes {@link TokenSet}
         * @note available when `trigger` is `"signIn"` or `"signUp"`
         */
        account?: Account | null;
        /**
         * The OAuth profile returned from your provider.
         * (In case of OIDC it will be the decoded ID Token or /userinfo response)
         * @note available when `trigger` is `"signIn"`.
         */
        profile?: Profile;
        /**
         * Check why was the jwt callback invoked. Possible reasons are:
         * - user sign-in: First time the callback is invoked, `user`, `profile` and `account` will be present.
         * - user sign-up: a user is created for the first time in the database (when {@link AuthConfig.session}.strategy is set to `"database"`)
         * - update event: Triggered by the `useSession().update` method.
         * In case of the latter, `trigger` will be `undefined`.
         */
        trigger?: 'signIn' | 'signUp' | 'update';
        /** @deprecated use `trigger === "signUp"` instead */
        isNewUser?: boolean;
        /**
         * When using {@link AuthConfig.session} `strategy: "jwt"`, this is the data
         * sent from the client via the `useSession().update` method.
         *
         * ⚠ Note, you should validate this data before using it.
         */
        // Using any for library compatibility
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session?: any;
      }) => Awaitable<JWT | null>;
    };
  };
};

const dynamicImports: DynamicImports = {
  auth: {},
} as DynamicImports;

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
      if (!dynamicImports.drizzleAdapter) {
        dynamicImports.drizzleAdapter = await import(
          '@/lib/auth/drizzle-adapter'
        );
      }
      if (!dynamicImports.auth.signIn) {
        dynamicImports.auth.signIn = await import('@/lib/auth/sign-in');
      }
      const {
        auth: {
          signIn: { signIn },
        },
        drizzleAdapter: { setupDrizzleAdapter },
      } = dynamicImports;
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
    if (!dynamicImports.auth.session) {
      dynamicImports.auth.session = await import('@/lib/auth/session');
    }
    if (!dynamicImports.auth.jwt) {
      dynamicImports.auth.jwt = await import('@/lib/auth/jwt');
    }
    const {
      auth: { jwt: { jwt } = {}, session: { session } = {} },
    } = dynamicImports;
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
