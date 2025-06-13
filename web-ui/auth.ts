import NextAuth, { Session, User as NextAuthUser, Account, Profile, NextAuthConfig } from 'next-auth'; // Added NextAuthConfig
import { Adapter, AdapterUser } from '@auth/core/adapters';
import type { OAuthConfig, Provider } from '@auth/core/providers';
import { skipCSRFCheck } from '@auth/core';
import { NextRequest } from 'next/server';
import { JWT } from 'next-auth/jwt';
import Google, { GoogleProfile } from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { isRunningOnEdge, isRunningOnServer, env } from '@/lib/site-util/env';
import { logEvent } from '@/lib/logger';

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
  Google<GoogleProfile>({
    clientId: process.env.GOOGLE_CLIENT_ID as string, // Added type assertion
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string, // Added type assertion
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
    credentials: {
      secret: { label: 'Secret', type: 'text', placeholder: 'Enter secret value' },
    },
    authorize: async (credentials: Record<string, unknown> | undefined, req: Request): Promise<NextAuthUser | null> => { // Added Promise<NextAuthUser | null>
      if (hasSecretHeaderBypass(req)) {
        return {
          id: '3',
          account_id: 3, // custom field
          image: '',
          name: 'secret header',
          email: 'secret-header@notadomain.org',
        } as NextAuthUser & { account_id: number }; // Type assertion for custom field
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

export const { handlers, auth, signIn, signOut } = NextAuth(async (req: NextRequest | undefined): Promise<NextAuthConfig> => { // Added NextAuthConfig return type
  let adapter: Adapter | undefined;
  
  let signInImpl: any;

  // Skip database adapter during build process
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NEXT_PHASE !== 'phase-production-build') {
    const { sql } = await import('drizzle-orm');
    const { db, schema } = await import('@/lib/drizzle-db');
    const { DrizzleAdapter } = await import('@auth/drizzle-adapter');
    adapter = DrizzleAdapter(db, {
      usersTable: schema.users,
      accountsTable: schema.accounts,
      sessionsTable: schema.sessions,
      verificationTokensTable: schema.verificationTokens,
    });
    signInImpl = async ({ account }: ({ account?: Account | Record<string, unknown> } | undefined) = { account: undefined }) => { 
        // Ensure account is not null or undefined before accessing its properties
        if (account && account.provider === "google" && account.refresh_token && account.access_token && account.providerAccountId) {
          await db.update(schema.accounts).set({
            access_token: String(account.access_token),
            refresh_token: String(account.refresh_token),
          }).where(sql`provider='google' AND "providerAccountId" = ${account.providerAccountId}`);
        }
        logEvent('signIn');
        return true;
      };
  } else {
    adapter = undefined; // No adapter for edge runtime, client, or build
    signInImpl = async () => {         
      logEvent('signIn');
      return true;
    };
  }

  return {
    secret: process.env.NEXTAUTH_SECRET || 'development-secret-key-change-me-in-production',
    session: { strategy: 'jwt' },
    adapter,
    providers,
    skipCSRFCheck: req && hasSecretHeaderBypass(req) ? skipCSRFCheck : undefined,
    callbacks: {
      authorized: async ({ auth }: { auth: Session | null; }) => {
        return !!auth;
      },
      signIn: signInImpl,
      jwt: async ({ token, user, account, profile }: { token: JWT; user?: NextAuthUser | AdapterUser | null; account?: Account | null; profile?: Profile | null; }) => {
        if (user) {
          token.id = user.id;
          if ((user as any).account_id !== undefined) {
            token.account_id = (user as any).account_id;
          }
        }
        return token;
      },
      session: async ({ session, token }: { session: Session; token: JWT; }) => {
        if (session.user) {
          if (token.id) {
            session.user.id = String(token.id);
          }
          if (token.account_id !== undefined) {
            (session.user as any).account_id = token.account_id;
          }
        }
        return session;
      },
    },
  };
});
