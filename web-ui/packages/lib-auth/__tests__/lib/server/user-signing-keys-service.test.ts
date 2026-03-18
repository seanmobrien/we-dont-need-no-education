/* @jest-environment node */

import { DbDatabaseType, drizDb } from '@compliance-theater/database/orm';
import { ApiRequestError } from '@compliance-theater/send-api-request';

import { hideConsoleOutput } from '../../shared/test-utils';
import { userSigningKeysService } from '../../../src/lib/server/user-signing-keys-service';

describe('userSigningKeysService', () => {
  const validPublicKey =
    'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBALWGOW2ovUQ2hlsk+LbLFV/q3tNF4vAnCvaBVqqLsVlaZ8ZcWlpr59aj2J0zFGpqLBWtjZl/FgXWWlZHMa+o73sCAwEAAQ==';

  let mockDbInstance: jest.Mocked<DbDatabaseType>;

  const createMockRequest = (body: unknown): Pick<Request, 'json'> => {
    return {
      json: jest.fn().mockResolvedValue(body),
    };
  };

  beforeEach(() => {
    mockDbInstance = drizDb() as jest.Mocked<DbDatabaseType>;
  });

  describe('getKeys', () => {
    it('returns active keys for a user object', async () => {
      const mockKeys = [
        {
          id: 1,
          publicKey: 'key-1',
          effectiveDate: '2024-01-01T00:00:00Z',
          expirationDate: '2025-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      (mockDbInstance.query.userPublicKeys.findMany as jest.Mock).mockResolvedValue(
        mockKeys,
      );

      const result = await userSigningKeysService.getKeys({ id: '123' });

      expect(result).toEqual(mockKeys);
    });

    it('throws a 400 response for an invalid user ID', async () => {
      try {
        await userSigningKeysService.getKeys('not-a-number');
        fail('Expected getKeys to throw');
      } catch (error) {
        expect(ApiRequestError.isApiRequestError(error)).toBe(true);
        if (ApiRequestError.isApiRequestError(error)) {
          expect(error.response.status).toBe(400);
          await expect(error.response.json()).resolves.toEqual({
            success: false,
            error: 'Invalid user ID',
          });
        }
      }
    });
  });

  describe('getUploadRequest', () => {
    it('returns a validated request with the normalized user ID', async () => {
      const result = await userSigningKeysService.getUploadRequest(
        { id: '123' },
        createMockRequest({ publicKey: validPublicKey }),
      );

      expect(result).toEqual({
        userId: 123,
        publicKey: validPublicKey,
      });
    });

    it('throws a 400 response for an invalid request body', async () => {
      hideConsoleOutput().setup();

      try {
        await userSigningKeysService.getUploadRequest(123, createMockRequest({}));
        fail('Expected getUploadRequest to throw');
      } catch (error) {
        expect(ApiRequestError.isApiRequestError(error)).toBe(true);
        if (ApiRequestError.isApiRequestError(error)) {
          expect(error.response.status).toBe(400);
          await expect(error.response.json()).resolves.toEqual({
            success: false,
            error: 'Invalid request format',
          });
        }
      }
    });

    it('throws a 400 response for an invalid public key', async () => {
      try {
        await userSigningKeysService.getUploadRequest(
          123,
          createMockRequest({ publicKey: 'invalid-key' }),
        );
        fail('Expected getUploadRequest to throw');
      } catch (error) {
        expect(ApiRequestError.isApiRequestError(error)).toBe(true);
        if (ApiRequestError.isApiRequestError(error)) {
          expect(error.response.status).toBe(400);
          await expect(error.response.json()).resolves.toEqual({
            success: false,
            error: 'Invalid public key format',
          });
        }
      }
    });
  });

  describe('processKeyRequest', () => {
    it('returns the existing key when it is already registered', async () => {
      (mockDbInstance.query.userPublicKeys.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        publicKey: validPublicKey,
        effectiveDate: '2024-01-01T00:00:00Z',
        expirationDate: '2025-01-01T00:00:00Z',
      });

      const result = await userSigningKeysService.processKeyRequest({
        userId: 123,
        publicKey: validPublicKey,
      });

      expect(result).toEqual({
        success: true,
        message: 'Public key already registered',
        keyId: 1,
        effectiveDate: '2024-01-01T00:00:00Z',
        expirationDate: '2025-01-01T00:00:00Z',
      });
    });

    it('registers a new public key', async () => {
      (mockDbInstance.query.userPublicKeys.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      const returningMock = jest.fn().mockResolvedValue([
        {
          id: 1,
          effectiveDate: '2024-01-01T00:00:00Z',
          expirationDate: '2025-01-01T00:00:00Z',
        },
      ]);
      const valuesMock = jest.fn().mockReturnValue({ returning: returningMock });

      mockDbInstance.insert.mockImplementation(
        () =>
          ({
            values: valuesMock,
          }) as never,
      );

      const result = await userSigningKeysService.processKeyRequest({
        userId: 123,
        publicKey: validPublicKey,
      });

      expect(result).toEqual({
        success: true,
        message: 'Public key registered successfully',
        keyId: 1,
        effectiveDate: '2024-01-01T00:00:00Z',
        expirationDate: '2025-01-01T00:00:00Z',
      });
    });

    it('uses a custom expiration date when provided', async () => {
      (mockDbInstance.query.userPublicKeys.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      const returningMock = jest.fn().mockResolvedValue([
        {
          id: 1,
          effectiveDate: '2024-01-01T00:00:00Z',
          expirationDate: '2024-06-01T00:00:00Z',
        },
      ]);

      (mockDbInstance.insert as jest.Mock).mockImplementation(
        () =>
          ({
            values: jest.fn().mockReturnValue({ returning: returningMock }),
          }) as never,
      );

      const result = await userSigningKeysService.processKeyRequest({
        userId: 123,
        publicKey: validPublicKey,
        expirationDate: '2024-06-01T00:00:00Z',
      });

      expect(result.expirationDate).toBe('2024-06-01T00:00:00Z');
    });

    it('propagates unexpected database errors', async () => {
      (mockDbInstance.query.userPublicKeys.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        userSigningKeysService.processKeyRequest({
          userId: 123,
          publicKey: validPublicKey,
        }),
      ).rejects.toThrow('Database connection failed');
    });
  });
});