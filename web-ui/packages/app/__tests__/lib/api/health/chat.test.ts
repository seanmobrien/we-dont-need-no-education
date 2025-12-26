/* @jest-environment node */

import { checkChatHealth } from '../../../../lib/api/health/chat';
import { getRedisClient } from '@/lib/redis-client';
import { setupDefaultTools } from '@/lib/ai/mcp/providers';
import { getMem0EnabledFlag } from '@/lib/ai/mcp/tool-flags';
import { hideConsoleOutput } from '@/__tests__/test-utils';

// Mock dependencies
jest.mock('@/lib/redis-client');
jest.mock('@/lib/ai/mcp/providers');
jest.mock('@/lib/ai/mcp/tool-flags');

const mockConsole = hideConsoleOutput();

describe('checkChatHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return healthy when all subsystems are healthy', async () => {
    // Mock Redis
    (getRedisClient as jest.Mock).mockResolvedValue({
      ping: jest.fn().mockResolvedValue('PONG'),
    });

    // Mock Tools
    (setupDefaultTools as jest.Mock).mockResolvedValue({
      isHealthy: true,
      providers: [{}, {}], // 2 providers
      tools: {
        tool1: {},
        tool2: {},
        tool3: {},
        tool4: {},
        tool5: {},
        tool6: {},
      }, // > 5 tools
      [Symbol.dispose]: jest.fn(),
    });

    // Mock Flags
    (getMem0EnabledFlag as jest.Mock).mockResolvedValue({ value: false }); // Mem0 disabled

    const result = await checkChatHealth();

    expect(result.status).toBe('healthy');
    expect(result.cache?.status).toBe('healthy');
    expect(result.queue?.status).toBe('healthy');
    expect(result.tools?.status).toBe('healthy');
  });

  it('should return error when Redis fails', async () => {
    mockConsole.setup();
    (getRedisClient as jest.Mock).mockRejectedValue(new Error('Redis down'));

    // Mock Tools (healthy)
    (setupDefaultTools as jest.Mock).mockResolvedValue({
      isHealthy: true,
      providers: [{}, {}],
      tools: {
        tool1: {},
        tool2: {},
        tool3: {},
        tool4: {},
        tool5: {},
        tool6: {},
      },
      [Symbol.dispose]: jest.fn(),
    });
    (getMem0EnabledFlag as jest.Mock).mockResolvedValue({ value: false });

    const result = await checkChatHealth();

    expect(result.status).toBe('error');
    expect(result.cache?.status).toBe('error');
  });

  it('should return warning when tools are insufficient', async () => {
    mockConsole.setup();
    (getRedisClient as jest.Mock).mockResolvedValue({
      ping: jest.fn().mockResolvedValue('PONG'),
    });

    // Mock Tools (insufficient providers)
    (setupDefaultTools as jest.Mock).mockResolvedValue({
      isHealthy: true,
      providers: [{}], // 1 provider, expected 2 (Client + First-party default base? No, default base is 1 without req)
      // Wait, checkChatHealth default base is 1. If req is missing (which it is here), expected is 1.
      // So 1 provider is OK.
      // Let's make it 0 providers.
      tools: {},
      [Symbol.dispose]: jest.fn(),
    });
    // Wait, if 0 providers, tools.length will be 0 <= 5, so warning.

    (getMem0EnabledFlag as jest.Mock).mockResolvedValue({ value: false });

    const result = await checkChatHealth();

    expect(result.status).toBe('warning');
    expect(result.tools?.status).toBe('warning');
  });
});
