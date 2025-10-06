/**
 * Test helper functions for auth bypass functionality
 * These are extracted from auth.ts for testability
 */

import { env } from '/lib/site-util/env';

/**
 * Validates that the application is running on localhost for local development auth bypass.
 * Throws a scary error if not running on localhost to prevent accidental production use.
 */
export const validateLocalhost = (req: Request | undefined): void => {
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
 * Checks if local development auth bypass is enabled and validates environment
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
 * Creates a user object for local development bypass
 */
export const createLocalDevBypassUser = (req: Request | undefined) => {
  if (!shouldUseLocalDevBypass(req)) {
    return null;
  }

  const bypassUserId = env('LOCAL_DEV_AUTH_BYPASS_USER_ID');
  return {
    id: bypassUserId!,
    account_id: parseInt(bypassUserId!) || 1,
    image: '',
    name: `Local Dev User ${bypassUserId}`,
    email: `localdev-${bypassUserId}@localhost.dev`,
  };
};
