/* @jest-environment node */

import { NextRequest } from 'next/server';
import type { IUserSigningKeysService } from '@compliance-theater/types';
import { getServiceContainer } from '@compliance-theater/types/dependency-injection';
import { ApiRequestError } from '@compliance-theater/send-api-request';

import { POST, GET } from '../../../../../app/api/auth/keys/route';
import { withJestTestExtensions } from '../../../../shared/jest.test-extensions';

describe('/api/auth/keys route wrappers', () => {
  let signingKeysService: jest.Mocked<IUserSigningKeysService>;

  const createMockRequest = (body: unknown) => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  beforeEach(() => {
    signingKeysService = getServiceContainer().resolve<IUserSigningKeysService>(
      'userSigningKeys',
    ) as jest.Mocked<IUserSigningKeysService>;
  });

  describe('POST', () => {
    it('returns 401 when no authenticated user is present', async () => {
      withJestTestExtensions().session = null;

      const response = await POST(createMockRequest({ publicKey: 'key' }));

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        success: false,
        error: 'Authentication required',
      });
    });

    it('delegates upload parsing and processing to the signing key service', async () => {
      withJestTestExtensions().session!.user!.id = String(123);
      signingKeysService.getUploadRequest.mockResolvedValue({
        userId: 123,
        publicKey: 'uploaded-key',
      });
      signingKeysService.processKeyRequest.mockResolvedValue({
        success: true,
        message: 'Public key registered successfully',
        keyId: 1,
        effectiveDate: '2024-01-01T00:00:00Z',
        expirationDate: '2025-01-01T00:00:00Z',
      });

      const request = createMockRequest({ publicKey: 'uploaded-key' });
      const response = await POST(request);

      expect(signingKeysService.getUploadRequest).toHaveBeenCalledWith(
        withJestTestExtensions().session!.user,
        request,
      );
      expect(signingKeysService.processKeyRequest).toHaveBeenCalledWith({
        userId: 123,
        publicKey: 'uploaded-key',
      });
      await expect(response.json()).resolves.toMatchObject({
        success: true,
        message: 'Public key registered successfully',
        keyId: 1,
      });
    });

    it('returns service-provided ApiRequestError responses', async () => {
      withJestTestExtensions().session!.user!.id = String(123);
      signingKeysService.getUploadRequest.mockRejectedValue(
        new ApiRequestError(
          'Invalid request format',
          Response.json(
            { success: false, error: 'Invalid request format' },
            { status: 400 },
          ),
        ),
      );

      const response = await POST(createMockRequest({}));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        success: false,
        error: 'Invalid request format',
      });
    });
  });

  describe('GET', () => {
    it('returns 401 when no authenticated user is present', async () => {
      withJestTestExtensions().session = null;
      const request = createMockRequest(undefined);

      const response = await GET(request);

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        success: false,
        error: 'Authentication required',
      });
    });

    it('delegates key lookup to the signing key service', async () => {
      const mockKeys = [
        {
          id: 1,
          publicKey: 'key1',
          effectiveDate: '2024-01-01T00:00:00Z',
          expirationDate: '2025-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      withJestTestExtensions().session!.user!.id = String(123);
      signingKeysService.getKeys.mockResolvedValue(mockKeys);
      const request = createMockRequest(undefined);

      const response = await GET(request);

      expect(signingKeysService.getKeys).toHaveBeenCalledWith(
        withJestTestExtensions().session!.user,
      );
      await expect(response.json()).resolves.toEqual({
        success: true,
        keys: mockKeys,
        count: 1,
      });
    });

    it('returns service-provided ApiRequestError responses', async () => {
      withJestTestExtensions().session!.user!.id = String(123);
      signingKeysService.getKeys.mockRejectedValue(
        new ApiRequestError(
          'Invalid user ID',
          Response.json(
            { success: false, error: 'Invalid user ID' },
            { status: 400 },
          ),
        ),
      );
      const request = createMockRequest(undefined);

      const response = await GET(request);

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        success: false,
        error: 'Invalid user ID',
      });
    });
  });
});
