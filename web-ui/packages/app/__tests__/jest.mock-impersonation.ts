import type { ImpersonationService } from '@/lib/auth/impersonation';

// Mock ImpersonationService implementation
export const mockImpersonationServiceFactory = (): ImpersonationService => {
  return {
    getImpersonatedToken: jest.fn().mockResolvedValue('mock-token'),
    getUserContext: jest.fn().mockReturnValue({ userId: 'test-user' }),
    clearCache: jest.fn(),
    hasCachedToken: jest.fn().mockReturnValue(false),
  };
};

class MockImpersonationServiceCache {
  #mock: ImpersonationService;
  /**
   *
   */
  constructor(mock?: ImpersonationService) {
    this.#mock = mock ?? mockImpersonationServiceFactory();
  }

  public async getOrCreate() {
    return this.#mock;
  }
  public invalidateUser() {}
  public invalidateAudience() {}
  public has() {
    return false;
  }
  public clear() {}
  public getStats() {
    return {
      totalEntries: 0,
      userCounts: 0,
      audienceCounts: 0,
       
      config: {} as any,
    };
  }
  /**
   * Get the singleton instance of the cache.
   */
  public static getInstance(): MockImpersonationServiceCache {
    const ret = jest.fn(() => new MockImpersonationServiceCache())();
    return ret;
  }
}

export const setupImpersonationMock = (
  mock?: ImpersonationService,
): ImpersonationService => {
  const thisMock = mock ?? mockImpersonationServiceFactory();
  jest.mock('@/lib/auth/impersonation/impersonation-factory', () => ({
    fromRequest: jest.fn(async () => thisMock),
  }));
  jest.mock('@/lib/auth/impersonation', () => ({
    fromRequest: jest.fn(async () => thisMock),
    ImpersonationServiceCache: MockImpersonationServiceCache,
  }));

  return thisMock;
};
