/* @jest-environment node */

import { getAccessibleUserIds } from '@/lib/auth/resources/case-file/case-file-helpers';
import { authorizationService } from '@/lib/auth/resources/authorization-service';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { hideConsoleOutput } from '@/__tests__/test-utils-server';

// Mock the authorization service
jest.mock('@/lib/auth/resources/authorization-service');

describe('getAccessibleUserIds', () => {
  const mockToken = 'mock-access-token';
  const mockGetUserEntitlements = jest.fn();

  beforeAll(() => {
    // Setup the mock implementation for the authorizationService factory
    (authorizationService as unknown as jest.Mock).mockImplementation(
      (callback) => {
        const mockService = {
          getUserEntitlements: mockGetUserEntitlements,
        };
        return callback(mockService);
      },
    );
  });

  beforeEach(() => {
    // jest.clearAllMocks();
    mockGetUserEntitlements.mockReset();
  });

  it('should return allowed user IDs from case-file resources', async () => {
    mockGetUserEntitlements.mockResolvedValue([
      { rsname: 'case-file:101', scopes: ['read'] },
      { rsname: 'case-file:102', scopes: ['write'] },
      { rsname: 'other-resource:999', scopes: ['read'] }, // Should be ignored
      { rsname: 'case-file:invalid', scopes: ['read'] }, // Should be ignored (NaN)
    ]);

    const result = await getAccessibleUserIds(mockToken);

    expect(result).toHaveLength(3);
    expect(result).toContain(101);
    expect(result).toContain(102);
    expect(result).toContain(123);
    expect(mockGetUserEntitlements).toHaveBeenCalledWith(mockToken);
  });

  it('should return the current user ID when no entitlements found', async () => {
    mockGetUserEntitlements.mockResolvedValue([]);

    const result = await getAccessibleUserIds(mockToken);

    expect(result).toEqual([123]);
  });

  it('should deduplicate user IDs', async () => {
    mockGetUserEntitlements.mockResolvedValue([
      { rsname: 'case-file:101', scopes: ['read'] },
      { rsname: 'case-file:101', scopes: ['write'] },
      { rsname: 'case-file:123', scopes: ['write'] },
    ]);

    const result = await getAccessibleUserIds(mockToken);

    expect(result).toEqual([101, 123]);
  });

  it('should handle errors gracefully by throwing LoggedError', async () => {
    hideConsoleOutput().setup();
    const error = new Error('Network error');
    mockGetUserEntitlements.mockRejectedValue(error);

    await expect(getAccessibleUserIds(mockToken)).rejects.toThrow(LoggedError);
  });
});
