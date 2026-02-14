import { wrapRouteRequest } from '@/lib/nextjs-util/server';
import { NextResponse } from 'next/server';
import { memoryClientFactory, } from '@/lib/ai/mem0/memoryclient-factory';
import { getMemoryHealthCache } from '@/lib/api/health/memory';
import { checkDatabaseHealth } from '@/lib/api/health/database';
import { env } from '@compliance-theater/env';
import { LoggedError } from '@compliance-theater/logger';
import { fromRequest } from '@/lib/auth/impersonation';
import { determineHealthStatus } from '@/lib/ai/mem0/lib/health-check';
import { checkChatHealth } from '@/lib/api/health/chat';
function transformMemoryResponse(resp) {
    const details = resp?.details;
    const status = details
        ? determineHealthStatus(details) === 'healthy'
            ? 'healthy'
            : determineHealthStatus(details) === 'warning'
                ? 'warning'
                : 'error'
        : 'error';
    return {
        status,
        db: { status: details?.system_db_available ? 'healthy' : 'error' },
        vectorStore: {
            status: details?.vector_store_available ? 'healthy' : 'error',
        },
        graphStore: {
            status: details?.graph_store_available ? 'healthy' : 'error',
        },
        historyStore: {
            status: details?.history_store_available ? 'healthy' : 'error',
        },
        authService: {
            status: details?.auth_service?.healthy ? 'healthy' : 'error',
        },
    };
}
async function checkMemoryHealth() {
    const cache = await getMemoryHealthCache();
    const cached = cache.get();
    if (cached) {
        return cached;
    }
    try {
        const memoryClient = await memoryClientFactory({
            impersonation: await fromRequest(),
        });
        const healthResponse = await memoryClient.healthCheck({
            strict: false,
            verbose: 1,
        });
        try {
            cache.set(healthResponse);
        }
        catch { }
        return healthResponse;
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'memory-health-check',
            context: {},
        });
        const fallback = {
            status: 'error',
            message: 'unavailable',
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
                errors: [],
            },
        };
        try {
            const cache = await getMemoryHealthCache();
            cache.set(fallback);
        }
        catch { }
        return fallback;
    }
}
export const GET = wrapRouteRequest(async () => {
    const memoryHealth = await Promise.race([
        checkMemoryHealth(),
        new Promise((resolve) => setTimeout(() => resolve({
            status: 'error',
            message: 'timeout',
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
                errors: [],
            },
        }), 15000)),
    ]);
    const databaseStatus = await checkDatabaseHealth();
    const chatHealth = await Promise.race([
        checkChatHealth(),
        new Promise((resolve) => setTimeout(() => resolve({
            status: 'error',
            tools: { status: 'error' },
            cache: { status: 'error' },
            queue: { status: 'error' },
        }), 180 * 1000)),
    ]);
    const healthCheckResponse = {
        server: env('NEXT_PUBLIC_HOSTNAME') ?? 'unknown',
        database: databaseStatus,
        chat: chatHealth,
        memory: transformMemoryResponse(memoryHealth),
    };
    return NextResponse.json(healthCheckResponse, { status: 200 });
});
//# sourceMappingURL=route.js.map