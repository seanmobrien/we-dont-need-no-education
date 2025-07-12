import NextAuth, {
  Session,
  User as NextAuthUser,
  Account,
  NextAuthConfig,
} from 'next-auth'; // Added NextAuthConfig
import { Adapter, AdapterUser } from '@auth/core/adapters';
import type { Provider } from '@auth/core/providers';
import { skipCSRFCheck } from '@auth/core';
import { NextRequest } from 'next/server';
import { JWT } from 'next-auth/jwt';
import Google, { GoogleProfile } from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { isRunningOnEdge, env } from '@/lib/site-util/env';
import { logEvent } from '@/lib/logger';

/**
 * Extends NextAuthUser to include the account_id, which our provider helpfully sets
 */
type NextAuthUserWithAccountId = NextAuthUser & { account_id?: number };

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

/**
 * Validates that the application is running on localhost for local development auth bypass.
 * Throws a scary error if not running on localhost to prevent accidental production use.
 */
const validateLocalhost = (req: Request | undefined): void => {
  const bypassUserId = env('LOCAL_DEV_AUTH_BYPASS_USER_ID');
  if (!bypassUserId) {
    return; // No bypass configured, nothing to validate
  }

  // Extract hostname from various possible sources
  let hostname = '';
  
  if (req) {
    // Try to get hostname from the request
    const url = new URL(req.url);
    hostname = url.hostname;
  } else {
    // Fallback to environment variable
    const publicHostname = env('NEXT_PUBLIC_HOSTNAME');
    if (publicHostname) {
      hostname = new URL(publicHostname).hostname;
    }
  }

  // Check if running on localhost
  const isLocalhost = hostname === 'localhost' || 
                     hostname === '127.0.0.1' || 
                     hostname.startsWith('192.168.') ||
                     hostname.startsWith('10.') ||
                     hostname.startsWith('172.16.') ||
                     hostname.endsWith('.local');

  if (!isLocalhost) {
    throw new Error(`
🚨🚨🚨 CRITICAL SECURITY WARNING 🚨🚨🚨

LOCAL_DEV_AUTH_BYPASS_USER_ID is set but you're not running on localhost!
Current hostname: ${hostname}

This environment variable MUST NEVER be set in production or any non-local environment.
If you see this error:
1. IMMEDIATELY remove LOCAL_DEV_AUTH_BYPASS_USER_ID from your environment
2. Check your .env files and remove any reference to this variable
3. NEVER commit code with this variable set to any value

Continuing with this variable set in a non-localhost environment could compromise 
the security of your entire application and expose user data.

Remember: We don't threaten to fire people for exposing secrets - we make threats 
against things people actually care about. Don't make us test that theory.

🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨
    `);
  }
};

/**
 * Checks if local development auth bypass is enabled and validates environment
 */
const shouldUseLocalDevBypass = (req: Request | undefined): boolean => {
  const bypassUserId = env('LOCAL_DEV_AUTH_BYPASS_USER_ID');
  if (!bypassUserId || bypassUserId.trim() === '') {
    return false;
  }
  
  validateLocalhost(req);
  return true;
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
      secret: {
        label: 'Secret',
        type: 'text',
        placeholder: 'Enter secret value',
      },
    },
    authorize: async (
      credentials: Record<string, unknown> | undefined,
      req: Request,
    ): Promise<NextAuthUser | null> => {
      // Added Promise<NextAuthUser | null>
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
  CredentialsProvider({
    name: 'Local Dev Bypass',
    credentials: {
      bypass: {
        label: 'Local Development Bypass',
        type: 'hidden',
        value: 'true',
      },
    },
    authorize: async (
      credentials: Record<string, unknown> | undefined,
      req: Request,
    ): Promise<NextAuthUser | null> => {
      if (shouldUseLocalDevBypass(req)) {
        const bypassUserId = env('LOCAL_DEV_AUTH_BYPASS_USER_ID');
        return {
          id: bypassUserId,
          account_id: parseInt(bypassUserId!) || 1, // Parse user ID or default to 1
          image: '',
          name: `Local Dev User ${bypassUserId}`,
          email: `localdev-${bypassUserId}@localhost.dev`,
        } as NextAuthUser & { account_id: number };
      }
      return null;
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

export const { handlers, auth, signIn, signOut } = NextAuth(
  async (req: NextRequest | undefined): Promise<NextAuthConfig> => {
    // Added NextAuthConfig return type
    let adapter: Adapter | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let signInImpl: any;

    // Skip database adapter during build process
    /*if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NEXT_PHASE !== 'phase-production-build')*/
    if (
      process.env.NEXT_RUNTIME === 'nodejs' &&
      typeof window === 'undefined' &&
      !isRunningOnEdge() &&
      process.env.NEXT_PHASE !== 'phase-production-build'
    ) {
      const { sql } = await import('drizzle-orm');
      const { db, schema } = await import('@/lib/drizzle-db');
      const { DrizzleAdapter } = await import('@auth/drizzle-adapter');
      adapter = DrizzleAdapter(db, {
        usersTable: schema.users,
        accountsTable: schema.accounts,
        sessionsTable: schema.sessions,
        verificationTokensTable: schema.verificationTokens,
      });
      signInImpl = async (
        {
          account,
        }: { account?: Account | Record<string, unknown> } | undefined = {
          account: undefined,
        },
      ) => {
        // Ensure account is not null or undefined before accessing its properties
        if (
          account &&
          account.provider === 'google' &&
          account.refresh_token &&
          account.access_token &&
          account.providerAccountId
        ) {
          await db
            .update(schema.accounts)
            .set({
              access_token: String(account.access_token),
              refresh_token: String(account.refresh_token),
            })
            .where(
              sql`provider='google' AND "providerAccountId" = ${account.providerAccountId}`,
            );
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
      session: { strategy: 'jwt' },
      adapter,
      providers,
      skipCSRFCheck:
        req && hasSecretHeaderBypass(req) ? skipCSRFCheck : undefined,
      callbacks: {
        authorized: async ({ auth, request }: { auth: Session | null; request?: Request }) => {
          // Check if we should use local dev bypass
          if (shouldUseLocalDevBypass(request)) {
            return true; // Always authorize when local dev bypass is enabled
          }
          return !!auth;
        },
        signIn: signInImpl,
        jwt: async ({
          token,
          user,
        }: {
          token: JWT;
          user?: NextAuthUserWithAccountId | NextAuthUser | AdapterUser | null;
        }) => {
          // Handle local dev bypass - create a token for the bypass user if needed
          if (!user && !token.id && shouldUseLocalDevBypass(undefined)) {
            const bypassUserId = env('LOCAL_DEV_AUTH_BYPASS_USER_ID');
            token.id = bypassUserId;
            token.account_id = parseInt(bypassUserId!) || 1;
            token.name = `Local Dev User ${bypassUserId}`;
            token.email = `localdev-${bypassUserId}@localhost.dev`;
          }
          
          if (user) {
            token.id = user.id;
            // Check to see if we were given an account_id, which is a custom field we set in the authorize function of the CredentialsProvider
            if ('account_id' in user && !!user.account_id) {
              token.account_id = user.account_id;
            }
          }
          return token;
        },
        session: async ({
          session,
          token,
        }: {
          session: Session;
          token: JWT;
        }) => {
          // Handle local dev bypass session creation
          if (shouldUseLocalDevBypass(undefined) && (!session.user || !session.user.id)) {
            const bypassUserId = env('LOCAL_DEV_AUTH_BYPASS_USER_ID');
            session.user = {
              id: bypassUserId!,
              name: `Local Dev User ${bypassUserId}`,
              email: `localdev-${bypassUserId}@localhost.dev`,
              image: '',
            };
            (session.user as NextAuthUserWithAccountId).account_id = parseInt(bypassUserId!) || 1;
          }
          
          if (session.user) {
            if (token.id) {
              session.user.id = String(token.id);
            }
            if (token.name && !session.user.name) {
              session.user.name = String(token.name);
            }
            if (token.email && !session.user.email) {
              session.user.email = String(token.email);
            }
            if (token.account_id !== undefined) {
              // Store account_id for use in the sesion callback
              (session.user as NextAuthUserWithAccountId).account_id =
                token.account_id;
            }
          }
          return session;
        },
      },
    };
  },
);
