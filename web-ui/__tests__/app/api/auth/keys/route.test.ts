/* @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 *
 * @fileoverview Tests for the auth keys API endpoint
 *
 * Tests the POST and GET endpoints for managing user public keys,
 * including validation, authentication, and database operations.
 *
 * @module __tests__/app/api/auth/keys/route.test.ts
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/auth/keys/route';
import { auth } from '@/auth';
import { drizDb } from '@/lib/drizzle-db';
import { hideConsoleOutput } from '@/__tests__/test-utils';

// Mock dependencies
jest.mock('@/auth');
jest.mock('@/lib/drizzle-db', () => {
  const actualSchema = jest.requireActual('/lib/drizzle-db/schema');
  return {
    drizDb: jest.fn(),
    schema: actualSchema.schema,
  };
});
jest.mock('@/lib/logger');
jest.mock('@/lib/react-util', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn((error) => error),
  },
}));

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockDrizDb = drizDb as jest.MockedFunction<typeof drizDb>;

// Mock database instance
const mockDbInstance = {
  query: {
    userPublicKeys: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
  insert: jest.fn(),
};

mockDrizDb.mockReturnValue(mockDbInstance as any);

const consoleSpy = hideConsoleOutput();

describe('/api/auth/keys', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.dispose();
  });

  describe('POST - Upload public key', () => {
    // A proper RSA public key in SPKI format (base64 encoded) - valid 512-bit test key
    const validPublicKey =
      'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBALWGOW2ovUQ2hlsk+LbLFV/q3tNF4vAnCvaBVqqLsVlaZ8ZcWlpr59aj2J0zFGpqLBWtjZl/FgXWWlZHMa+o73sCAwEAAQ==';

    const createMockRequest = (body: any) => {
      return {
        json: jest.fn().mockResolvedValue(body),
      } as unknown as NextRequest;
    };

    it('should successfully upload a new public key', async () => {
      // Mock authenticated session
      mockAuth.mockResolvedValue({
        user: { id: 123 },
      } as never);

      // Mock no existing key
      mockDbInstance.query.userPublicKeys.findFirst.mockResolvedValue(null);

      // Mock successful insertion - proper Drizzle chain: insert(table).values(data).returning(cols)
      const returningMock = jest.fn().mockResolvedValue([
        {
          id: 1,
          effectiveDate: '2024-01-01T00:00:00Z',
          expirationDate: '2025-01-01T00:00:00Z',
        },
      ]);

      const valuesMock = jest.fn().mockReturnValue({
        returning: returningMock,
      });

      // Mock insert as a function that accepts a table parameter and returns the values chain
      mockDbInstance.insert.mockImplementation(() => ({
        values: valuesMock,
      }));

      const request = createMockRequest({ publicKey: validPublicKey });
      const response = await POST(request);

      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: true,
        message: 'Public key registered successfully',
        keyId: 1,
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null as never);

      const request = createMockRequest({ publicKey: validPublicKey });
      const response = await POST(request);

      expect(response.status).toBe(401);

      const responseData = await response.json();
      expect(responseData).toEqual({
        success: false,
        error: 'Authentication required',
      });
    });

    it('should return 400 for invalid request format', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 123 },
      } as never);

      const request = createMockRequest({}); // Missing publicKey
      const response = await POST(request);

      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData).toEqual({
        success: false,
        error: 'Invalid request format',
      });
    });

    it('should return 400 for invalid user ID', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'invalid-id' },
      } as never);

      const request = createMockRequest({ publicKey: validPublicKey });
      const response = await POST(request);

      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData).toEqual({
        success: false,
        error: 'Invalid user ID',
      });
    });

    it('should return 400 for invalid public key format', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 123 },
      } as never);

      const request = createMockRequest({ publicKey: 'invalid-key' });
      const response = await POST(request);

      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData).toEqual({
        success: false,
        error: 'Invalid public key format',
      });
    });

    it('should return success when key already exists', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 123 },
      } as never);

      // Mock existing key
      mockDbInstance.query.userPublicKeys.findFirst.mockResolvedValue({
        id: 1,
        publicKey: validPublicKey,
        userId: 123,
      });

      const request = createMockRequest({ publicKey: validPublicKey });
      const response = await POST(request);

      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: true,
        message: 'Public key already registered',
        keyId: 1,
      });
    });

    it('should handle database errors gracefully', async () => {
      consoleSpy.setup();
      mockAuth.mockResolvedValue({
        user: { id: 123 },
      } as never);

      // Mock database error
      mockDbInstance.query.userPublicKeys.findFirst.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const request = createMockRequest({ publicKey: validPublicKey });
      const response = await POST(request);

      expect(response.status).toBe(500);

      const responseData = await response.json();
      expect(responseData).toEqual({
        success: false,
        error: 'Internal server error',
      });
    });

    it('should handle custom expiration date', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 123 },
      } as never);

      mockDbInstance.query.userPublicKeys.findFirst.mockResolvedValue(null);

      const returningMock = jest.fn().mockResolvedValue([
        {
          id: 1,
          effectiveDate: '2024-01-01T00:00:00Z',
          expirationDate: '2024-06-01T00:00:00Z',
        },
      ]);

      const valuesMock = jest.fn().mockReturnValue({
        returning: returningMock,
      });

      mockDbInstance.insert.mockImplementation(() => ({
        values: valuesMock,
      }));

      const customExpirationDate = '2024-06-01T00:00:00Z';
      const request = createMockRequest({
        publicKey: validPublicKey,
        expirationDate: customExpirationDate,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.expirationDate).toBe('2024-06-01T00:00:00Z');
    });
  });

  describe('GET - Retrieve user public keys', () => {
    it('should return user public keys when authenticated', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 123 },
      } as never);

      const mockKeys = [
        {
          id: 1,
          publicKey: 'key1',
          effectiveDate: '2024-01-01T00:00:00Z',
          expirationDate: '2025-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          publicKey: 'key2',
          effectiveDate: '2024-02-01T00:00:00Z',
          expirationDate: null,
          createdAt: '2024-02-01T00:00:00Z',
        },
      ];

      mockDbInstance.query.userPublicKeys.findMany.mockResolvedValue(mockKeys);

      const response = await GET();

      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toEqual({
        success: true,
        keys: mockKeys,
        count: 2,
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null as never);

      const response = await GET();

      expect(response.status).toBe(401);

      const responseData = await response.json();
      expect(responseData).toEqual({
        success: false,
        error: 'Authentication required',
      });
    });

    it('should return 400 for invalid user ID', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'invalid-id' },
      } as never);

      const response = await GET();

      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData).toEqual({
        success: false,
        error: 'Invalid user ID',
      });
    });

    it('should return empty array when no keys exist', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 123 },
      } as never);

      mockDbInstance.query.userPublicKeys.findMany.mockResolvedValue([]);

      const response = await GET();

      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toEqual({
        success: true,
        keys: [],
        count: 0,
      });
    });

    it('should handle database errors gracefully', async () => {
      consoleSpy.setup();
      mockAuth.mockResolvedValue({
        user: { id: 123 },
      } as never);

      mockDbInstance.query.userPublicKeys.findMany.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const response = await GET();

      expect(response.status).toBe(500);

      const responseData = await response.json();
      expect(responseData).toEqual({
        success: false,
        error: 'Internal server error',
      });
    });
  });
});
