/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';

// Polyfill fetch for Node.js test environment
// Polyfill Request for Node.js test environment

// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.Request = Request as any;
global.URL = URL;

// Mock the environment utilities

// Mock drizzle-orm and related`` database imports
jest.mock('drizzle-orm', () => ({
  sql: jest.fn(),
}));

jest.mock('@/lib/drizzle-db', () => ({
  drizDbWithInit: jest.fn(() =>
    Promise.resolve({
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(),
        })),
      })),
    }),
  ),
  schema: {
    users: {},
    accounts: {},
    sessions: {},
    verificationTokens: {},
  },
}));

jest.mock('@auth/drizzle-adapter', () => ({
  DrizzleAdapter: jest.fn(() => ({})),
}));

// Import the helper functions directly since they're just utility functions
import { env } from '@/lib/site-util/env'; // Not actually used in tests
import { resetEnvVariables } from '@/__tests__/jest.setup';

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
const shouldUseLocalDevBypass = (req: Request | undefined): boolean => {
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
const createLocalDevBypassUser = (req: Request | undefined) => {
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

// We need to set up the environment before importing auth
process.env.NEXT_RUNTIME = 'nodejs';
process.env.NEXT_PHASE = 'development';

describe('Local Development Auth Bypass', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
    // Reset environment variables
    resetEnvVariables();
  });

  describe('validateLocalhost', () => {
    it('should pass validation when running on localhost', async () => {
      process.env.LOCAL_DEV_AUTH_BYPASS_USER_ID = '123';
      process.env.NEXT_PUBLIC_HOSTNAME = 'http://localhost:3000';
      // Mock a request to localhost
      const mockRequest = new Request(
        'http://localhost:3000/test',
      ) as unknown as Request;

      expect(() => validateLocalhost(mockRequest)).not.toThrow();
    });

    it('should throw error when bypass is set but not on localhost', async () => {
      process.env.LOCAL_DEV_AUTH_BYPASS_USER_ID = '123';
      process.env.NEXT_PUBLIC_HOSTNAME = 'https://production.com';
      // Mock a request to production
      const mockRequest = new Request(
        'https://production.com/test',
      ) as unknown as Request;

      expect(() => validateLocalhost(mockRequest)).toThrow(
        /CRITICAL SECURITY WARNING/,
      );
      expect(() => validateLocalhost(mockRequest)).toThrow(
        /LOCAL_DEV_AUTH_BYPASS_USER_ID/,
      );
    });

    it('should pass when bypass is not set', async () => {
      process.env.LOCAL_DEV_AUTH_BYPASS_USER_ID = undefined;
      process.env.NEXT_PUBLIC_HOSTNAME = 'https://production.com';
      const mockRequest = new Request(
        'https://production.com/test',
      ) as unknown as Request;

      expect(() => validateLocalhost(mockRequest)).not.toThrow();
    });

    it('should recognize various localhost patterns', async () => {
      const localhostPatterns = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://192.168.1.100:3000',
        'http://10.0.0.1:3000',
        'http://172.16.0.1:3000',
        'http://myapp.local:3000',
      ];
      process.env.LOCAL_DEV_AUTH_BYPASS_USER_ID = undefined;

      for (const pattern of localhostPatterns) {
        const mockRequest = new Request(
          pattern + '/test',
        ) as unknown as Request;
        expect(() => validateLocalhost(mockRequest)).not.toThrow();
      }
    });
  });

  describe('shouldUseLocalDevBypass', () => {
    it('should return true when bypass user ID is set and on localhost', async () => {
      process.env.LOCAL_DEV_AUTH_BYPASS_USER_ID = '123';
      process.env.NEXT_PUBLIC_HOSTNAME = 'http://localhost:3000';

      const mockRequest = new Request(
        'http://localhost:3000/test',
      ) as unknown as Request;

      expect(shouldUseLocalDevBypass(mockRequest)).toBe(true);
    });

    it('should return false when bypass user ID is not set', async () => {
      process.env.LOCAL_DEV_AUTH_BYPASS_USER_ID = undefined;

      const mockRequest = new Request(
        'http://localhost:3000/test',
      ) as unknown as Request;

      expect(shouldUseLocalDevBypass(mockRequest)).toBe(false);
    });

    it('should return false when bypass user ID is empty string', async () => {
      process.env.LOCAL_DEV_AUTH_BYPASS_USER_ID = '';
      process.env.NEXT_PUBLIC_HOSTNAME = 'http://localhost:3000';

      const mockRequest = new Request(
        'http://localhost:3000/test',
      ) as unknown as Request;

      expect(shouldUseLocalDevBypass(mockRequest)).toBe(false);
    });

    it('should throw error when bypass is set but not on localhost', async () => {
      process.env.LOCAL_DEV_AUTH_BYPASS_USER_ID = '123';
      process.env.NEXT_PUBLIC_HOSTNAME = 'https://production.com';
      const mockRequest = new Request(
        'https://production.com/test',
      ) as unknown as Request;

      expect(() => shouldUseLocalDevBypass(mockRequest)).toThrow(
        /CRITICAL SECURITY WARNING/,
      );
    });
  });

  describe('Local Dev Bypass Provider', () => {
    it('should create user when bypass is enabled', async () => {
      process.env.LOCAL_DEV_AUTH_BYPASS_USER_ID = '456';
      process.env.NEXT_PUBLIC_HOSTNAME = 'http://localhost:3000';

      const mockRequest = new Request(
        'http://localhost:3000/test',
      ) as unknown as Request;
      const user = createLocalDevBypassUser(mockRequest);

      expect(user).toEqual({
        id: '456',
        account_id: 456,
        image: '',
        name: 'Local Dev User 456',
        email: 'localdev-456@localhost.dev',
      });
    });

    it('should return null when bypass is not enabled', async () => {
      process.env.LOCAL_DEV_AUTH_BYPASS_USER_ID = undefined;

      const mockRequest = new Request(
        'http://localhost:3000/test',
      ) as unknown as Request;
      const user = createLocalDevBypassUser(mockRequest);

      expect(user).toBeNull();
    });
  });

  describe('Environment File Validation', () => {
    it('should ensure .env files do not contain LOCAL_DEV_AUTH_BYPASS_USER_ID', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const webUiRoot = path.resolve(__dirname, '..');
      const envFiles = [
        '.env',
        '.env.local',
        '.env.development',
        '.env.production',
      ];

      for (const envFile of envFiles) {
        const envPath = path.join(webUiRoot, envFile);

        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf-8');

          // Check that the bypass variable is not set to any non-empty value
          const bypassRegex = /^LOCAL_DEV_AUTH_BYPASS_USER_ID\s*=\s*(.+)$/m;
          const match = envContent.match(bypassRegex);

          if (
            match &&
            match[1] &&
            match[1].trim() !== '' &&
            match[1].trim() !== '""' &&
            match[1].trim() !== "''"
          ) {
            fail(`
  🚨 SECURITY VIOLATION DETECTED 🚨

  ${envFile} contains LOCAL_DEV_AUTH_BYPASS_USER_ID with a non-empty value: ${match[1]}

  This is extremely dangerous and MUST be fixed immediately:
  1. Remove or comment out this line from ${envFile}
  2. NEVER commit this file with this variable set
  3. This variable should ONLY be set temporarily during local development

  The bypass feature is only for local development and could compromise security if deployed.
            `);
          }
        }
      }
    });
  });
});
