import NextAuth, { Session } from 'next-auth';
import { Adapter } from 'next-auth/adapters';
import type { Provider } from 'next-auth/providers';
import { skipCSRFCheck } from '@auth/core';

import { JWT } from 'next-auth/jwt';
import Google from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { isRunningOnEdge, isRunningOnServer } from './lib/site-util/env';
import { logEvent } from '@/lib/logger';
import { env } from '@/lib/site-util/env';

const hasSecretHeaderBypass = (req: Request | undefined): boolean => {
  if (!req) {
    return false;
  }
  const headerName = env('AUTH_HEADER_BYPASS_KEY');
  const checkHeaderValue = env('AUTH_HEADER_BYPASS_VALUE');
  if (!headerName || !checkHeaderValue) {
    return false;
  }
  const headerValue = req?.headers.get(headerName);
  // Disable CSRF validation if Skynet credentials are used
  return headerValue === checkHeaderValue;
};

const providers: Provider[] = [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authorization: {
      params: {
        access_type: 'offline',
        prompt: 'consent',
        response_type: 'code',
        scope:
          'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.readonly', //
      },
    },
  }),
  CredentialsProvider({
    name: 'Secret Header',
    credentials: {},
    authorize: async (credentials, req) => {
      if (hasSecretHeaderBypass(req)) {
        return {
          id: '3',
          account_id: 3,
          image: '',
          name: 'secret header',
          email: 'secret-header@notadomain.org',
        }; // Return user object with string properties
      }
      return null; // Authentication failed
    },
  }),
];

export const providerMap = providers.map((provider) => {
  if (typeof provider === 'function') {
    const providerData = provider();
    return { id: providerData.id, name: providerData.name };
  }
  return { id: provider.id, name: provider.name };
});

export const { handlers, auth, signIn, signOut } = NextAuth(async (req) => {
  let adapter: Adapter | undefined;

  if (!isRunningOnEdge() && typeof window === 'undefined') {
    const { Pool } = await import('pg');
    const { default: PostgresAdapter } = await import('@auth/pg-adapter');
    // Create a `Pool` inside the request handler.
    adapter = PostgresAdapter(
      new Pool({
        connectionString: env('DATABASE_URL'),
        ssl: { rejectUnauthorized: false, requestCert: false },
      }),
    );
  }

  return {
    // debug: true,
    session: { strategy: 'jwt' },
    adapter,
    providers,
    skipCSRFCheck: hasSecretHeaderBypass(req) ? skipCSRFCheck : undefined,
    /*
    pages: {
      signIn: '/auth/signin',
    },
    */
    callbacks: {
      authorized: async ({ auth }) => {
        // Logged in users are authenticated, otherwise redirect to login page
        return !!auth;
      },
      signIn: async ({ account }) => {
        if (!isRunningOnEdge() && isRunningOnServer()) {
          const { query } = await import('@/lib/neondb');
          // Update refresh token if provided
          if (account && account.refresh_token) {
            const records = await query(
              (sql) =>
                sql`UPDATE accounts SET access_token=${account.access_token}, refresh_token = ${account.refresh_token} WHERE provider='google' AND "providerAccountId" = ${account.providerAccountId} RETURNING *`,
            );
            if (!records.length) {
              throw new Error('Failed to update account');
            }
          }
        }
        logEvent('signIn');
        // Add user to database
        return true;
      },
      jwt({ token, user, account }) {
        if (user) {
          // User is available during sign-in
          token.user_id = Number(user.id!);
          token.account_id = token.account_id ?? user.account_id;
        }
        if (account) {
          token.account_id = Number(account.id!);
        }
        // Add Skynet credentials provider logic
        if (!token.user_id && !token.account_id) {
          token.user_id = 3;
          token.account_id = 3;
        }
        return token;
      },
      session({ session, token }: { session: Session; token: JWT }) {
        session.user!.id = String(token.user_id!);
        session.user!.account_id = token.account_id!;
        return session;
      },
    },
  };
});
