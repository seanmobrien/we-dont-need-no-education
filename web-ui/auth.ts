process.env.NODE_PG_FORCE_NATIVE = '0';
import NextAuth, { Session } from 'next-auth';
import { Adapter } from 'next-auth/adapters';
import type { Provider } from 'next-auth/providers';
import { JWT } from 'next-auth/jwt';
import Google from 'next-auth/providers/google';
//import { Pool } from '@neondatabase/serverless';
import { query } from '@/lib/neondb';
import { isRunningOnEdge } from './lib/site-util/env';
import { logEvent } from '@/lib/logger';

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
];

export const providerMap = providers.map((provider) => {
  if (typeof provider === 'function') {
    const providerData = provider();
    return { id: providerData.id, name: providerData.name };
  }
  return { id: provider.id, name: provider.name };
});

export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  let adapter: Adapter | undefined;

  if (!isRunningOnEdge()) {
    process.env.PG_FORCE_NATIVE = '0';
    const { Pool } = await import('pg');
    const { default: PostgresAdapter } = await import('@auth/pg-adapter');
    // Create a `Pool` inside the request handler.
    adapter = PostgresAdapter(
      new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false, requestCert: false },
      }),
    );
  }

  return {
    // debug: true,
    session: { strategy: 'jwt' },
    adapter,
    providers,
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
