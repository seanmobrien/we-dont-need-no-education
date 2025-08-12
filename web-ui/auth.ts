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

const bypassUserId = env('LOCAL_DEV_AUTH_BYPASS_USER_ID');


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
  ...(bypassUserId ? [CredentialsProvider({
    id: 'local-dev-bypass', // Unique for the provider
    name: 'Local Dev Bypass',
    credentials: {
      secret: {
        label: '',
        type: 'hidden',
      },
      ...(bypassUserId ? {
        bypass: {
        label: 'Local Development Bypass',
        type: 'hidden',
        value: 'true',
      },      
      } : {}),      
    },
    authorize: async (
      credentials: Record<string, unknown> | undefined,
      req: Request,
    ): Promise<NextAuthUser | null> => {
      // Check to see if this is our chatbot doing secret chatbot stuff
      if (hasSecretHeaderBypass(req)) {
        return {
          id: '3',
          account_id: 3, // custom field
          image: '',
          name: 'secret header',
          email: 'secret-header@notadomain.org',
        } as NextAuthUser & { account_id: number }; // Type assertion for custom field
      }
      // Check to see if local development bypass is an option
      if (shouldUseLocalDevBypass(req)) {
        return {
          id: bypassUserId,
          account_id: parseInt(bypassUserId!) || 1, // Parse user ID or default to 1
          image: '',
          name: `Local Dev User ${bypassUserId}`,
          email: `localdev-${bypassUserId}@localhost.dev`,
        } as NextAuthUser & { account_id: number };
      }
      return null; // Authentication failed
    },
  })] : []) as Provider[] // Only add if bypassUserId is set,
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

    // Skip database adapter during build process, on edge, or client-side (which should never happen)
    if (
      process.env.NEXT_RUNTIME === 'nodejs' &&
      typeof window === 'undefined' &&
      !isRunningOnEdge() &&
      process.env.NEXT_PHASE !== 'phase-production-build'
    ) {
      const { sql } = await import('drizzle-orm');
      const { drizDbWithInit, schema } = await import('@/lib/drizzle-db');
      const { DrizzleAdapter } = await import('@auth/drizzle-adapter');

      adapter = DrizzleAdapter(await drizDbWithInit(), {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        usersTable: schema.users as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        accountsTable: schema.accounts as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sessionsTable: schema.sessions as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        verificationTokensTable: schema.verificationTokens as any,
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
          await (drizDbWithInit()
            .then(db => db
            .update(schema.accounts)
            .set({
              accessToken: String(account.access_token),
              refreshToken: String(account.refresh_token),
            })
            .where(
              sql`provider='google' AND "provider_account_id" = ${account.providerAccountId}`,
            )));
        }
        logEvent('signIn');
        return true;
      };
    } else {
      adapter = undefined; // No adapter for edge runtime, client, or build
      signInImpl = async () => {
        logEvent('signIn');
        return false;
      };
    }

    return {
      adapter,
      callbacks: {
        authorized: async ({ auth }: { auth: Session | null; request?: Request }) => {          
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
      providers,
      session: { strategy: 'jwt' },
      skipCSRFCheck:
        req && hasSecretHeaderBypass(req) ? skipCSRFCheck : undefined,
      theme: {
        colorScheme: 'auto', // 'auto' for system preference, 'light' or 'dark'
        logo: '/static/logo/logo-dark.png',
        brandColor: '#1898a8', // Custom brand color        
      }
    };
  },
);
