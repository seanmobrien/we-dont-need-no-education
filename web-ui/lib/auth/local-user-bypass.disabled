import CredentialsProvider from 'next-auth/providers/credentials';
import { User as NextAuthUser } from 'next-auth'; // Added NextAuthConfig
import { env } from '/lib/site-util/env';
import { Provider } from '@auth/core/providers';

/**
 * Local User Auth Bypass Utilities
 * --------------------------------
 * Provides helpers and a NextAuth credentials provider for bypassing authentication in local development
 * or via a secret header (for trusted automation or test agents). Includes strong safeguards to prevent
 * accidental use in production environments.
 *
 * Features:
 * - Secret header bypass for trusted automation (Skynet/CI agents)
 * - Localhost-only bypass for developer convenience (with strong error if misused)
 * - NextAuth credentials provider for seamless integration
 * - Environment-driven configuration for all bypasses
 *
 * Environment Variables:
 * - AUTH_HEADER_BYPASS_KEY: Header name for secret bypass
 * - AUTH_HEADER_BYPASS_VALUE: Expected value for secret bypass
 * - LOCAL_DEV_AUTH_BYPASS_USER_ID: User ID to impersonate for local dev bypass
 * - NEXT_PUBLIC_HOSTNAME: (optional) fallback for hostname validation
 */

export const hasSecretHeaderBypass = (req: Request | undefined): boolean => {
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
 * Validates that the application is running on localhost or a private network before allowing
 * local development auth bypass. Throws a critical error if the bypass variable is set in a non-local environment.
 *
 * @param req - The incoming HTTP request (may be undefined)
 * @throws Error if not running on localhost or a private network
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
  const isLocalhost =
    hostname === 'localhost' ||
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
 * Checks if local development auth bypass is enabled (by env var) and validates the environment.
 *
 * @param req - The incoming HTTP request (may be undefined)
 * @returns True if local dev bypass is enabled and environment is valid, false otherwise
 * @throws Error if bypass is enabled but not running on localhost/private network
 */
export const shouldUseLocalDevBypass = (req: Request | undefined): boolean => {
  const bypassUserId = env('LOCAL_DEV_AUTH_BYPASS_USER_ID');
  if (!bypassUserId || bypassUserId.trim() === '') {
    return false;
  }
  validateLocalhost(req);
  return true;
};

/**
 * The user ID that local dev bypass will impersonate (from env var LOCAL_DEV_AUTH_BYPASS_USER_ID).
 * @type {string | undefined}
 */
export const bypassUserId = env('LOCAL_DEV_AUTH_BYPASS_USER_ID');

export const setupLocalUserBypass = ({
  req,
}: {
  req: Request;
}): Promise<Provider[]> => {
  if (!shouldUseLocalDevBypass(req)) {
    return Promise.resolve([] satisfies Provider[]);
  }
  const authorize = async (
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
  };
  return Promise.resolve([
    CredentialsProvider({
      id: 'local-dev-bypass', // Unique for the provider
      name: 'Local Dev Bypass',
      credentials: {
        secret: {
          label: '',
          type: 'hidden',
        },
        bypass: {
          label: 'Local Development Bypass',
          type: 'hidden',
          value: 'true',
        },
      },
      authorize,
    }),
  ]);
};
