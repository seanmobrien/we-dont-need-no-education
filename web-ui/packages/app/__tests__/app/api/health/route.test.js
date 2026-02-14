jest.mock('@/lib/auth/impersonation/impersonation-factory', () => {
    const impersonationService = {
        getImpersonatedToken: jest.fn().mockResolvedValue('impersonated-token'),
        getUserContext: jest
            .fn()
            .mockReturnValue({ userId: 'test-user', hash: 'hash123', accountId: 3 }),
        clearCache: jest.fn(),
        hasCachedToken: jest.fn().mockReturnValue(false),
    };
    return {
        fromRequest: jest.fn().mockResolvedValue(impersonationService),
        fromUserId: jest.fn().mockResolvedValue(impersonationService),
    };
});
jest.mock('@/lib/ai/mcp/providers', () => ({
    setupDefaultTools: jest.fn().mockResolvedValue({
        isHealthy: true,
        providers: [{}, {}],
        tools: { tool1: {}, tool2: {}, tool3: {}, tool4: {}, tool5: {}, tool6: {} },
        [Symbol.dispose]: jest.fn(),
    }),
}));
import { hideConsoleOutput } from '@/__tests__/test-utils-server';
import { GET } from '@/app/api/health/route';
jest.mock('@/lib/ai/mem0/memoryclient-factory', () => ({
    memoryClientFactory: jest.fn(() => Promise.resolve({
        healthCheck: jest.fn(),
    })),
}));
const mockConsole = hideConsoleOutput();
describe('app/api/health/route GET', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        mockConsole.dispose();
        jest.advanceTimersToNextTimer();
        jest.clearAllTimers();
        jest.useRealTimers();
    });
    it('returns memory warning status when some services are unavailable', async () => {
        const { memoryClientFactory, } = require('/lib/ai/mem0/memoryclient-factory');
        const mockHealthCheck = jest.fn().mockResolvedValue({
            details: {
                client_active: true,
                system_db_available: false,
                vector_enabled: true,
                vector_store_available: true,
                graph_enabled: true,
                graph_store_available: true,
                history_store_available: true,
                auth_service: {
                    healthy: true,
                    enabled: true,
                    server_url: 'https://auth.example.com',
                    realm: 'example',
                    client_id: 'test-client',
                    auth_url: 'https://auth.example.com/authorize',
                    token_url: 'https://auth.example.com/token',
                    jwks_url: 'https://auth.example.com/jwks',
                },
                errors: [],
            },
        });
        memoryClientFactory.mockResolvedValue({
            healthCheck: mockHealthCheck,
        });
        const res = await GET();
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toHaveProperty('memory');
        expect(json.memory.status).toBe('warning');
    });
    it('logs route processing (info) via wrapRouteRequest by default', async () => {
        const { memoryClientFactory, } = require('/lib/ai/mem0/memoryclient-factory');
        const { logger } = require('@compliance-theater/logger');
        memoryClientFactory.mockResolvedValue({
            healthCheck: jest.fn().mockResolvedValue({
                details: {
                    client_active: true,
                    system_db_available: true,
                    vector_enabled: true,
                    vector_store_available: true,
                    graph_enabled: true,
                    graph_store_available: true,
                    history_store_available: true,
                    auth_service: {
                        healthy: true,
                        enabled: true,
                        server_url: 'https://auth.example.com',
                        realm: 'example',
                        client_id: 'test-client',
                        auth_url: 'https://auth.example.com/authorize',
                        token_url: 'https://auth.example.com/token',
                        jwks_url: 'https://auth.example.com/jwks',
                    },
                    errors: [],
                },
            }),
        });
        const logInstance = await logger();
        await GET();
        expect(logInstance.info).toHaveBeenCalledWith(expect.stringContaining('Processing route request'), expect.any(Object));
    });
    it('caches error states to prevent cascading failures during outages', async () => {
        const { memoryClientFactory, } = require('/lib/ai/mem0/memoryclient-factory');
        const mockHealthCheck = jest.fn().mockResolvedValue({
            status: 'error',
            message: 'service unavailable',
            timestamp: new Date().toISOString(),
            service: 'mem0',
            mem0: {
                version: '0',
                build_type: 'unknown',
                build_info: '',
                verbose: {
                    mem0_version: '0',
                    build_details: { type: '', info: '', path: '' },
                    build_stamp: '',
                },
            },
            details: {
                client_active: false,
                system_db_available: false,
                vector_enabled: false,
                vector_store_available: false,
                graph_enabled: false,
                graph_store_available: false,
                history_store_available: false,
                auth_service: {
                    healthy: false,
                    enabled: false,
                    server_url: '',
                    realm: '',
                    client_id: '',
                    auth_url: '',
                    token_url: '',
                    jwks_url: '',
                },
                errors: ['Service unavailable'],
            },
        });
        memoryClientFactory.mockResolvedValue({
            healthCheck: mockHealthCheck,
        });
        await GET();
        expect(mockHealthCheck).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(5000);
        await GET();
        expect(mockHealthCheck).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(6000);
        await GET();
        expect(mockHealthCheck).toHaveBeenCalledTimes(2);
    });
    it('caches warning states with shorter TTL than ok states', async () => {
        const { memoryClientFactory, } = require('/lib/ai/mem0/memoryclient-factory');
        const mockHealthCheck = jest.fn().mockResolvedValue({
            status: 'warning',
            message: 'partial service availability',
            timestamp: new Date().toISOString(),
            service: 'mem0',
            mem0: {
                version: '1.0.0',
                build_type: 'production',
                build_info: '',
                verbose: {
                    mem0_version: '1.0.0',
                    build_details: { type: 'production', info: '', path: '' },
                    build_stamp: '',
                },
            },
            details: {
                client_active: true,
                system_db_available: false,
                vector_enabled: true,
                vector_store_available: true,
                graph_enabled: true,
                graph_store_available: true,
                history_store_available: true,
                auth_service: {
                    healthy: true,
                    enabled: true,
                    server_url: 'http://auth',
                    realm: 'test',
                    client_id: 'test',
                    auth_url: 'http://auth/auth',
                    token_url: 'http://auth/token',
                    jwks_url: 'http://auth/jwks',
                },
                errors: [],
            },
        });
        memoryClientFactory.mockResolvedValue({
            healthCheck: mockHealthCheck,
        });
        await GET();
        expect(mockHealthCheck).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(20000);
        await GET();
        expect(mockHealthCheck).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(15000);
        await GET();
        expect(mockHealthCheck).toHaveBeenCalledTimes(2);
    });
});
//# sourceMappingURL=route.test.js.map