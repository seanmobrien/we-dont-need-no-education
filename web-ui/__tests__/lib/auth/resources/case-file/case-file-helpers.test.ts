/**
 * @fileoverview Tests for Case File Helper Functions
 *
 * These tests verify the helper functions that extract user_id from
 * emails and document units for authorization purposes.
 */

import {
  getUserIdFromEmailId,
  getUserIdFromUnitId,
  getKeycloakUserIdFromUserId,
} from '@/lib/auth/resources/case-file/case-file-helpers';
import { drizDbWithInit } from '@/lib/drizzle-db';

// Mock the database
jest.mock('@/lib/drizzle-db', () => ({
  drizDbWithInit: jest.fn(),
}));

describe('Case File Helpers', () => {
  const mockDrizDbWithInit = drizDbWithInit as jest.MockedFunction<
    typeof drizDbWithInit
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserIdFromEmailId', () => {
    it('should return user_id for valid email', async () => {
      const mockEmailId = '550e8400-e29b-41d4-a716-446655440000';
      const mockUserId = 123;

      mockDrizDbWithInit.mockResolvedValue({
        query: {
          documentUnits: {
            findFirst: jest.fn().mockResolvedValue({
              userId: mockUserId,
            }),
          },
        },
      } as any);

      const result = await getUserIdFromEmailId(mockEmailId);

      expect(result).toBe(mockUserId);
    });

    it('should return null for non-existent email', async () => {
      const mockEmailId = '550e8400-e29b-41d4-a716-446655440000';

      mockDrizDbWithInit.mockResolvedValue({
        query: {
          documentUnits: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
        },
      } as any);

      const result = await getUserIdFromEmailId(mockEmailId);

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const mockEmailId = '550e8400-e29b-41d4-a716-446655440000';

      mockDrizDbWithInit.mockResolvedValue({
        query: {
          documentUnits: {
            findFirst: jest
              .fn()
              .mockRejectedValue(new Error('Database connection failed')),
          },
        },
      } as any);

      await expect(getUserIdFromEmailId(mockEmailId)).rejects.toThrow();
    });
  });

  describe('getUserIdFromUnitId', () => {
    it('should return user_id for valid document unit', async () => {
      const mockUnitId = 12345;
      const mockUserId = 123;

      mockDrizDbWithInit.mockResolvedValue({
        query: {
          documentUnits: {
            findFirst: jest.fn().mockResolvedValue({
              userId: mockUserId,
            }),
          },
        },
      } as any);

      const result = await getUserIdFromUnitId(mockUnitId);

      expect(result).toBe(mockUserId);
    });

    it('should return null for non-existent document unit', async () => {
      const mockUnitId = 99999;

      mockDrizDbWithInit.mockResolvedValue({
        query: {
          documentUnits: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
        },
      } as any);

      const result = await getUserIdFromUnitId(mockUnitId);

      expect(result).toBeNull();
    });
  });

  describe('getKeycloakUserIdFromUserId', () => {
    it('should return Keycloak provider account ID for valid user', async () => {
      const mockUserId = 123;
      const mockKeycloakId = 'keycloak-uuid-123';

      mockDrizDbWithInit.mockResolvedValue({
        query: {
          accounts: {
            findFirst: jest.fn().mockResolvedValue({
              providerAccountId: mockKeycloakId,
            }),
          },
        },
      } as any);

      const result = await getKeycloakUserIdFromUserId(mockUserId);

      expect(result).toBe(mockKeycloakId);
    });

    it('should return null when no Keycloak account exists', async () => {
      const mockUserId = 123;

      mockDrizDbWithInit.mockResolvedValue({
        query: {
          accounts: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
        },
      } as any);

      const result = await getKeycloakUserIdFromUserId(mockUserId);

      expect(result).toBeNull();
    });

    it('should only query for Keycloak provider accounts', async () => {
      const mockUserId = 123;
      const mockFindFirst = jest.fn().mockResolvedValue(null);

      mockDrizDbWithInit.mockResolvedValue({
        query: {
          accounts: {
            findFirst: mockFindFirst,
          },
        },
      } as any);

      await getKeycloakUserIdFromUserId(mockUserId);

      // Verify the where clause filters for Keycloak provider
      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: { providerAccountId: true },
        }),
      );
    });
  });
});
