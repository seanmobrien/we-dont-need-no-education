export const mockImpersonationServiceFactory = () => {
    return {
        getImpersonatedToken: jest.fn().mockResolvedValue('mock-token'),
        getUserContext: jest.fn().mockReturnValue({ userId: 'test-user' }),
        clearCache: jest.fn(),
        hasCachedToken: jest.fn().mockReturnValue(false),
    };
};
class MockImpersonationServiceCache {
    #mock;
    constructor(mock) {
        this.#mock = mock ?? mockImpersonationServiceFactory();
    }
    async getOrCreate() {
        return this.#mock;
    }
    invalidateUser() { }
    invalidateAudience() { }
    has() {
        return false;
    }
    clear() { }
    getStats() {
        return {
            totalEntries: 0,
            userCounts: 0,
            audienceCounts: 0,
            config: {},
        };
    }
    static getInstance() {
        const ret = jest.fn(() => new MockImpersonationServiceCache())();
        return ret;
    }
}
export const setupImpersonationMock = (mock) => {
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
//# sourceMappingURL=jest.mock-impersonation.js.map