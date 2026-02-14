import InMemoryCache from './base-cache';
import { globalRequiredSingleton } from '@compliance-theater/typescript/singleton-provider';
import { getRedisClient } from '@compliance-theater/redis';
import { setupDefaultTools } from '@/lib/ai/mcp/providers';
import { getMem0EnabledFlag } from '@/lib/ai/mcp/tool-flags';
import { LoggedError } from '@compliance-theater/logger';
export class ChatHealthCache extends InMemoryCache {
    constructor() {
        super({
            ttlMs: 10 * 60 * 1000,
            getTtlMs: (value) => {
                if (value.status === 'error' || value.status === 'warning') {
                    return 30 * 1000;
                }
                return 10 * 60 * 1000;
            },
        });
    }
}
export const getChatHealthCache = () => globalRequiredSingleton('chat-health-cache', () => new ChatHealthCache(), {
    weakRef: false,
});
export const checkChatHealth = async (req) => {
    const cache = getChatHealthCache();
    const cached = cache.get();
    if (cached)
        return cached;
    let cacheStatus = 'healthy';
    try {
        const redis = await getRedisClient();
        await redis.ping();
    }
    catch (err) {
        LoggedError.isTurtlesAllTheWayDownBaby(err, {
            log: true,
            source: 'check-chat-health',
            message: 'Redis health check failed',
            extra: { cause: err },
        });
        cacheStatus = 'error';
    }
    const queueStatus = 'healthy';
    let toolsStatus = 'healthy';
    let toolProviders;
    try {
        toolProviders = await setupDefaultTools({
            req,
            user: undefined,
            chatHistoryId: 'health-check',
            memoryEnabled: true,
        });
        const tools = Array.from(new Set(Object.keys(toolProviders.tools)));
        const totalProviders = toolProviders.providers.length;
        const expectedBase = req ? 2 : 1;
        const mem0 = await getMem0EnabledFlag();
        const expectedProviders = expectedBase + (mem0.value ? 1 : 0);
        if (!toolProviders.isHealthy) {
            toolsStatus = 'error';
        }
        else if (totalProviders < expectedProviders) {
            toolsStatus = 'warning';
        }
        else if (tools.length <= 5) {
            toolsStatus = 'warning';
        }
        else {
            toolsStatus = 'healthy';
        }
    }
    catch (err) {
        LoggedError.isTurtlesAllTheWayDownBaby(err, {
            log: true,
            source: 'check-chat-health',
            message: 'Tools health check failed',
            extra: { cause: err },
        });
        toolsStatus = 'error';
    }
    finally {
        if (toolProviders) {
            try {
                toolProviders[Symbol.dispose]();
            }
            catch (e) {
                LoggedError.isTurtlesAllTheWayDownBaby(e, {
                    log: true,
                    source: 'check-chat-health',
                    message: 'Tools health check failed',
                });
            }
        }
    }
    let status = 'healthy';
    if (cacheStatus === 'error' || toolsStatus === 'error') {
        status = 'error';
    }
    else if (toolsStatus === 'warning') {
        status = 'warning';
    }
    const result = {
        status,
        cache: { status: cacheStatus },
        queue: { status: queueStatus },
        tools: { status: toolsStatus },
    };
    cache.set(result);
    return result;
};
//# sourceMappingURL=chat.js.map