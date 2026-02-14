import { GET } from '@/app/api/health/probe/[probe_type]/route';
import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';
jest.mock('@/lib/api/health/database', () => ({
    checkDatabaseHealth: jest.fn(),
}));
jest.mock('@/lib/api/health/memory', () => {
    const getMemoryHealthCache = jest.fn();
    const ensureMemoryCacheConfigured = jest.fn();
    const originalModule = jest.requireActual('@/lib/api/health/memory');
    return {
        ...originalModule,
        getMemoryHealthCache,
        ensureMemoryCacheConfigured,
    };
});
import { checkDatabaseHealth } from '@/lib/api/health/database';
import { getMemoryHealthCache } from '@/lib/api/health/memory';
const buildHealthyMemoryDetails = () => ({
    client_active: true,
    system_db_available: true,
    vector_enabled: true,
    vector_store_available: true,
    graph_enabled: true,
    graph_store_available: true,
    history_store_available: true,
    errors: [],
    auth_service: {
        healthy: true,
        enabled: true,
        server_url: 'https://auth.example.com',
        realm: 'default',
        client_id: 'client',
        auth_url: 'https://auth.example.com/auth',
        token_url: 'https://auth.example.com/token',
        jkws_url: 'https://auth.example.com/jwks',
    },
});
describe('health probe route', () => {
    const mockSpan = {
        setAttribute: jest.fn(),
        setStatus: jest.fn(),
        recordException: jest.fn(),
        end: jest.fn(),
    };
    beforeEach(() => {
    });
    it('returns ok for liveness', async () => {
        const res = await GET({}, {
            params: Promise.resolve({ probe_type: 'liveness' }),
            span: mockSpan,
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe('ok');
    });
    it('readiness returns ok when db is ok, 503 when db error', async () => {
        checkDatabaseHealth.mockResolvedValue({ status: 'healthy' });
        let res = await GET({}, {
            params: Promise.resolve({ probe_type: 'readiness' }),
            span: mockSpan,
        });
        expect(res.status).toBe(200);
        checkDatabaseHealth.mockResolvedValue({ status: 'error' });
        res = await GET({}, {
            params: Promise.resolve({ probe_type: 'readiness' }),
            span: mockSpan,
        });
        expect(res.status).toBe(503);
    });
    it('startup: both ok => ok and resets counter', async () => {
        checkDatabaseHealth.mockResolvedValue({ status: 'healthy' });
        const fakeMem = { details: buildHealthyMemoryDetails() };
        getMemoryHealthCache.mockReturnValue({ get: () => fakeMem });
        SingletonProvider.Instance.set('startup-failure-counter', { count: 5 });
        const res = await GET({}, {
            params: Promise.resolve({ probe_type: 'startup' }),
            span: mockSpan,
        });
        expect(res.status).toBe(200);
        expect(SingletonProvider.Instance.get('startup-failure-counter')).toBeUndefined();
    });
    it('startup: mem error and db ok below threshold => 503 then increments counter', async () => {
        checkDatabaseHealth.mockResolvedValue({ status: 'healthy' });
        getMemoryHealthCache.mockReturnValue({
            get: () => undefined,
        });
        const res = await GET({}, {
            params: Promise.resolve({ probe_type: 'startup' }),
            span: mockSpan,
        });
        expect(res.status).toBe(503);
        expect(SingletonProvider.Instance.get('startup-failure-counter')?.count).toBe(1);
    });
    it('startup: after threshold only db required (db ok => ok)', async () => {
        checkDatabaseHealth.mockResolvedValue({ status: 'healthy' });
        getMemoryHealthCache.mockReturnValue({
            get: () => undefined,
        });
        const counter = { count: 11 };
        SingletonProvider.Instance.set('startup-failure-counter', counter);
        const res = await GET({}, {
            params: Promise.resolve({ probe_type: 'startup' }),
            span: mockSpan,
        });
        expect(res.status).toBe(200);
    });
});
//# sourceMappingURL=probe.route.test.js.map