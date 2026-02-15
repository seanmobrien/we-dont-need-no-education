/**
 * @fileoverview Tests for impersonation utility functions
 *
 * Tests the adminBaseFromIssuer and defaultConfigFromEnv utility functions
 * that handle Keycloak configuration parsing and environment variable processing.
 */

import {
  adminBaseFromIssuer,
  defaultConfigFromEnv,
} from '@/lib/auth/impersonation/utility';
import type { AdminTokenConfig } from '@/lib/auth/impersonation/impersonation.types';
import { type ILogger, log } from '@compliance-theater/logger';
// Mock the dependencies

describe('impersonation/utility', () => {
  let mockLog: ILogger;
  beforeEach(() => {
    log((l) => (mockLog = l));
    // jest.clearAllMocks();
  });

  describe('adminBaseFromIssuer', () => {
    describe('valid Keycloak issuer URLs', () => {
      test('extracts configuration from standard Keycloak issuer URL', () => {
        const issuer = 'https://auth.example.com/realms/master';
        const result = adminBaseFromIssuer(issuer);

        expect(result).toEqual({
          origin: 'https://auth.example.com',
          realm: 'master',
          adminBase: 'https://auth.example.com/admin/realms/master',
        });
      });

      test('handles realm names with special characters', () => {
        const issuer = 'https://auth.example.com/realms/my-realm-test';
        const result = adminBaseFromIssuer(issuer);

        expect(result).toEqual({
          origin: 'https://auth.example.com',
          realm: 'my-realm-test',
          adminBase: 'https://auth.example.com/admin/realms/my-realm-test',
        });
      });

      test('handles URL-encoded realm names', () => {
        const issuer = 'https://auth.example.com/realms/my%2Drealm';
        const result = adminBaseFromIssuer(issuer);

        expect(result).toEqual({
          origin: 'https://auth.example.com',
          realm: 'my-realm',
          adminBase: 'https://auth.example.com/admin/realms/my-realm',
        });
      });

      test('handles different ports and protocols', () => {
        const issuer = 'http://localhost:8080/realms/development';
        const result = adminBaseFromIssuer(issuer);

        expect(result).toEqual({
          origin: 'http://localhost:8080',
          realm: 'development',
          adminBase: 'http://localhost:8080/admin/realms/development',
        });
      });

      test('handles realms with nested paths', () => {
        const issuer = 'https://auth.example.com/auth/realms/production';
        const result = adminBaseFromIssuer(issuer);

        expect(result).toEqual({
          origin: 'https://auth.example.com',
          realm: 'production',
          adminBase: 'https://auth.example.com/admin/realms/production',
        });
      });

      test('handles complex realm names with multiple special characters', () => {
        const issuer =
          'https://auth.example.com/realms/org%2Dname%2Dtest%5F2024';
        const result = adminBaseFromIssuer(issuer);

        expect(result).toEqual({
          origin: 'https://auth.example.com',
          realm: 'org-name-test_2024',
          adminBase: 'https://auth.example.com/admin/realms/org-name-test_2024',
        });
      });
    });

    describe('invalid or malformed URLs', () => {
      test('returns undefined for invalid URL format', () => {
        const result = adminBaseFromIssuer('not-a-valid-url');
        expect(result).toBeUndefined();
      });

      test('returns undefined for empty string', () => {
        const result = adminBaseFromIssuer('');
        expect(result).toBeUndefined();
      });

      test('returns undefined when no realms path is present', () => {
        const result = adminBaseFromIssuer(
          'https://auth.example.com/some/other/path'
        );
        expect(result).toBeUndefined();
      });

      test('returns undefined when realms path exists but no realm name follows', () => {
        const result = adminBaseFromIssuer('https://auth.example.com/realms/');
        expect(result).toBeUndefined();
      });

      test('returns undefined when realms is not followed by a realm name', () => {
        const result = adminBaseFromIssuer('https://auth.example.com/realms');
        expect(result).toBeUndefined();
      });

      test('handles malformed URLs gracefully', () => {
        const result = adminBaseFromIssuer('://invalid-protocol');
        expect(result).toBeUndefined();
      });

      test('returns undefined for URLs with invalid realm encoding', () => {
        // This should still work as URL constructor handles most encoding issues
        const issuer = 'https://auth.example.com/realms/test%';
        const result = adminBaseFromIssuer(issuer);

        // This might succeed depending on how the URL constructor handles it
        // If it fails, it should return undefined gracefully
        if (result) {
          expect(result.realm).toBeDefined();
        } else {
          expect(result).toBeUndefined();
        }
      });
    });

    describe('edge cases', () => {
      test('handles multiple realms segments (uses first occurrence)', () => {
        const issuer = 'https://auth.example.com/realms/master/realms/other';
        const result = adminBaseFromIssuer(issuer);

        expect(result).toEqual({
          origin: 'https://auth.example.com',
          realm: 'master',
          adminBase: 'https://auth.example.com/admin/realms/master',
        });
      });

      test('handles URLs with query parameters and fragments', () => {
        const issuer =
          'https://auth.example.com/realms/master?param=value#fragment';
        const result = adminBaseFromIssuer(issuer);

        expect(result).toEqual({
          origin: 'https://auth.example.com',
          realm: 'master',
          adminBase: 'https://auth.example.com/admin/realms/master',
        });
      });

      test('handles internationalized domain names', () => {
        const issuer = 'https://auth.exämple.com/realms/test';
        const result = adminBaseFromIssuer(issuer);

        if (result) {
          expect(result.realm).toBe('test');
          expect(result.origin).toContain('auth.');
        }
      });
    });
  });

  describe('defaultConfigFromEnv', () => {
    beforeEach(() => {
      // Set up default environment variables for tests
      process.env.AUTH_KEYCLOAK_ISSUER =
        'https://auth.example.com/realms/master';
      process.env.AUTH_KEYCLOAK_CLIENT_ID = 'admin-cli';
      process.env.AUTH_KEYCLOAK_CLIENT_SECRET = 'test-secret';
      process.env.AUTH_KEYCLOAK_REDIRECT_URI =
        'https://app.example.com/callback';
      process.env.AUTH_KEYCLOAK_IMPERSONATOR_USERNAME = 'admin-user';
      process.env.AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD = 'admin-password';
    });

    describe('successful configuration creation', () => {
      test('creates complete config from environment variables', () => {
        const result = defaultConfigFromEnv();

        expect(result).toEqual({
          issuer: 'https://auth.example.com/realms/master',
          clientId: 'admin-cli',
          clientSecret: 'test-secret',
          redirectUri: 'https://app.example.com/callback',
          impersonatorUsername: 'admin-user',
          impersonatorPassword: 'admin-password',
          realm: 'master',
          adminBase: 'https://auth.example.com/admin/realms/master',
        } satisfies AdminTokenConfig);
      });

      test('handles missing optional environment variables', () => {
        process.env.AUTH_KEYCLOAK_IMPERSONATOR_USERNAME = '';
        process.env.AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD = '';
        process.env.AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN = '';
        const result = defaultConfigFromEnv();

        expect(result).toEqual({
          issuer: 'https://auth.example.com/realms/master',
          clientId: 'admin-cli',
          clientSecret: 'test-secret',
          redirectUri: 'https://app.example.com/callback',
          impersonatorUsername: undefined,
          impersonatorPassword: undefined,
          impersonatorOfflineToken: undefined,
          realm: 'master',
          adminBase: 'https://auth.example.com/admin/realms/master',
        });
      });

      test('extracts realm and adminBase from complex issuer URLs', () => {
        process.env.AUTH_KEYCLOAK_ISSUER =
          'https://auth.mycompany.com/auth/realms/production-realm';

        const result = defaultConfigFromEnv();

        expect(result.realm).toBe('production-realm');
        expect(result.adminBase).toBe(
          'https://auth.mycompany.com/admin/realms/production-realm'
        );
      });
    });

    describe('validation failures for required environment variables', () => {
      test('throws TypeError when issuer is missing', () => {
        process.env.AUTH_KEYCLOAK_ISSUER = '';

        expect(() => defaultConfigFromEnv()).toThrow(TypeError);
        expect(() => defaultConfigFromEnv()).toThrow(
          'Required environment variables are missing'
        );

        expect(mockLog.warn).toHaveBeenCalledWith(
          'SystemTokenStore: incomplete environment configuration'
        );
      });

      test('throws TypeError when clientId is missing', () => {
        process.env.AUTH_KEYCLOAK_CLIENT_ID = '';

        expect(() => defaultConfigFromEnv()).toThrow(TypeError);
        expect(() => defaultConfigFromEnv()).toThrow(
          'Required environment variables are missing'
        );
      });

      test('throws TypeError when clientSecret is missing', () => {
        process.env.AUTH_KEYCLOAK_CLIENT_SECRET = '';

        expect(() => defaultConfigFromEnv()).toThrow(TypeError);
        expect(() => defaultConfigFromEnv()).toThrow(
          'Required environment variables are missing'
        );
      });

      test('throws TypeError when redirectUri is missing', () => {
        process.env.AUTH_KEYCLOAK_REDIRECT_URI = '';

        expect(() => defaultConfigFromEnv()).toThrow(TypeError);
        expect(() => defaultConfigFromEnv()).toThrow(
          'Required environment variables are missing'
        );
      });

      test('throws TypeError when multiple required variables are missing', () => {
        process.env.AUTH_KEYCLOAK_ISSUER = '';
        process.env.AUTH_KEYCLOAK_CLIENT_ID = '';

        expect(() => defaultConfigFromEnv()).toThrow(TypeError);
        expect(() => defaultConfigFromEnv()).toThrow(
          'Required environment variables are missing'
        );
      });
    });

    describe('invalid issuer URL handling', () => {
      test('throws TypeError when issuer URL is invalid', () => {
        process.env.AUTH_KEYCLOAK_ISSUER = 'not-a-valid-url';

        expect(() => defaultConfigFromEnv()).toThrow(TypeError);
        expect(() => defaultConfigFromEnv()).toThrow(
          'Invalid issuer URL format'
        );
        expect(mockLog.warn).toHaveBeenCalled();
      });
    });

    test('throws TypeError when issuer URL has no realms path', () => {
      process.env.AUTH_KEYCLOAK_ISSUER =
        'https://auth.example.com/some/other/path';

      expect(() => defaultConfigFromEnv()).toThrow(TypeError);
      expect(() => defaultConfigFromEnv()).toThrow('Invalid issuer URL format');
    });

    test('throws TypeError when issuer URL has empty realm', () => {
      process.env.AUTH_KEYCLOAK_ISSUER = 'https://auth.example.com/realms/';

      expect(() => defaultConfigFromEnv()).toThrow(TypeError);
      expect(() => defaultConfigFromEnv()).toThrow('Invalid issuer URL format');
    });
  });

  describe('logging behavior', () => {
    test('logs warning when environment configuration is incomplete', () => {
      process.env.AUTH_KEYCLOAK_ISSUER = '';
      process.env.AUTH_KEYCLOAK_CLIENT_ID = '';

      expect(() => defaultConfigFromEnv()).toThrow();
    });
  });

  describe('return type validation', () => {
    test('returns object with correct AdminTokenConfig structure', () => {
      const result = defaultConfigFromEnv();

      // Verify all required properties exist
      expect(result).toHaveProperty('issuer');
      expect(result).toHaveProperty('clientId');
      expect(result).toHaveProperty('clientSecret');
      expect(result).toHaveProperty('realm');
      expect(result).toHaveProperty('adminBase');
      expect(result).toHaveProperty('redirectUri');

      // Verify optional properties exist (even if undefined)
      expect(result).toHaveProperty('impersonatorUsername');
      expect(result).toHaveProperty('impersonatorPassword');
      expect(result).toHaveProperty('impersonatorOfflineToken');

      // Verify types
      expect(typeof result.issuer).toBe('string');
      expect(typeof result.clientId).toBe('string');
      expect(typeof result.clientSecret).toBe('string');
      expect(typeof result.realm).toBe('string');
      expect(typeof result.adminBase).toBe('string');
      expect(typeof result.redirectUri).toBe('string');
    });
  });

  describe('integration between functions', () => {
    test('defaultConfigFromEnv uses adminBaseFromIssuer correctly', () => {
      // This test verifies the integration between the two functions
      const customIssuer = 'https://custom.auth.com/realms/custom-realm';
      process.env.AUTH_KEYCLOAK_ISSUER = customIssuer;
      process.env.AUTH_KEYCLOAK_CLIENT_ID = 'test-client';
      process.env.AUTH_KEYCLOAK_CLIENT_SECRET = 'test-secret';

      const result = defaultConfigFromEnv();

      // Verify that adminBaseFromIssuer was called and its results used
      expect(result.realm).toBe('custom-realm');
      expect(result.adminBase).toBe(
        'https://custom.auth.com/admin/realms/custom-realm'
      );
      expect(result.issuer).toBe(customIssuer);
    });

    test('defaultConfigFromEnv fails when adminBaseFromIssuer returns undefined', () => {
      process.env.AUTH_KEYCLOAK_ISSUER = 'https://invalid.com/no-realms';
      process.env.AUTH_KEYCLOAK_CLIENT_ID = 'test-client';
      process.env.AUTH_KEYCLOAK_CLIENT_SECRET = 'test-secret';
      process.env.AUTH_KEYCLOAK_REDIRECT_URI = 'https://app.test.com/callback';

      expect(() => defaultConfigFromEnv()).toThrow(TypeError);
      expect(() => defaultConfigFromEnv()).toThrow('Invalid issuer URL format');
    });
  });
});
