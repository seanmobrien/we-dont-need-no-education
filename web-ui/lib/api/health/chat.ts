import InMemoryCache from './base-cache';
import {
  HealthCheckStatusEntry,
  HealthCheckStatusCode,
} from '@/lib/hooks/types';
import { globalRequiredSingleton } from '@/lib/typescript/singleton-provider';
import { getRedisClient } from '@/lib/redis-client';
import { setupDefaultTools } from '@/lib/ai/mcp/providers';
import { getMem0EnabledFlag } from '@/lib/ai/mcp/tool-flags';
import { LoggedError } from '@/lib/react-util';
import type { NextRequest } from 'next/server';
import { ToolProviderSet } from '@/lib/ai/mcp/types';

type ChatHealthStatus = HealthCheckStatusEntry<'cache' | 'queue' | 'tools'>;

export class ChatHealthCache extends InMemoryCache<ChatHealthStatus> {
  constructor() {
    super({
      ttlMs: 10 * 60 * 1000, // 10 minutes for healthy
      getTtlMs: (value: ChatHealthStatus) => {
        if (value.status === 'error' || value.status === 'warning') {
          return 30 * 1000; // 30 seconds for error/warning
        }
        return 10 * 60 * 1000;
      },
    });
  }
}

export const getChatHealthCache = (): ChatHealthCache =>
  globalRequiredSingleton('chat-health-cache', () => new ChatHealthCache(), { weakRef: false });

export const checkChatHealth = async (
  req?: NextRequest,
): Promise<ChatHealthStatus> => {
  const cache = getChatHealthCache();
  const cached = cache.get();
  if (cached) return cached;

  // 1. Cache Subsystem (Redis)
  let cacheStatus: HealthCheckStatusCode = 'healthy';
  try {
    const redis = await getRedisClient();
    await redis.ping();
  } catch (err) {
    LoggedError.isTurtlesAllTheWayDownBaby(err, {
      log: true,
      source: 'check-chat-health',
      message: 'Redis health check failed',
      extra: { cause: err },
    });
    cacheStatus = 'error';
  }

  // 2. Queue Subsystem (Reserved)
  const queueStatus: HealthCheckStatusCode = 'healthy';

  // 3. Tools Subsystem
  let toolsStatus: HealthCheckStatusCode = 'healthy';
  let toolProviders: ToolProviderSet | undefined;
  try {
    toolProviders = await setupDefaultTools({
      req,
      user: undefined, // No user context for generic health check
      chatHistoryId: 'health-check',
      memoryEnabled: true,
    });

    const tools = Array.from(new Set<string>(Object.keys(toolProviders.tools)));
    const totalProviders = toolProviders.providers.length;

    // Calculate expected providers
    const expectedBase = req ? 2 : 1; // Client + First-party if req
    const mem0 = await getMem0EnabledFlag();
    const expectedProviders = expectedBase + (mem0.value ? 1 : 0);

    if (!toolProviders.isHealthy) {
      toolsStatus = 'error';
    } else if (totalProviders < expectedProviders) {
      toolsStatus = 'warning';
    } else if (tools.length <= 5) {
      toolsStatus = 'warning';
    } else {
      toolsStatus = 'healthy';
    }
  } catch (err) {
    LoggedError.isTurtlesAllTheWayDownBaby(err, {
      log: true,
      source: 'check-chat-health',
      message: 'Tools health check failed',
      extra: { cause: err },
    });
    toolsStatus = 'error';
  } finally {
    if (toolProviders) {
      try {
        toolProviders[Symbol.dispose]();
      } catch (e) {
        LoggedError.isTurtlesAllTheWayDownBaby(e, {
          log: true,
          source: 'check-chat-health',
          message: 'Tools health check failed',
        });
      }
    }
  }

  // Aggregate status
  let status: HealthCheckStatusCode = 'healthy';
  if (
    cacheStatus === 'error' ||
    toolsStatus === 'error'
  ) {
    status = 'error';
  } else if (
    toolsStatus === 'warning'
  ) {
    status = 'warning';
  }

  const result: ChatHealthStatus = {
    status,
    cache: { status: cacheStatus },
    queue: { status: queueStatus },
    tools: { status: toolsStatus },
  };

  cache.set(result);
  return result;
};
