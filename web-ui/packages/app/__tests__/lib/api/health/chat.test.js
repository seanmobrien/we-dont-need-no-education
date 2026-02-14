import { checkChatHealth } from '../../../../lib/api/health/chat';
import { getRedisClient } from '@compliance-theater/redis';
import { setupDefaultTools } from '@/lib/ai/mcp/providers';
import { getMem0EnabledFlag } from '@/lib/ai/mcp/tool-flags';
import { hideConsoleOutput } from '@/__tests__/test-utils-server';
jest.mock('@compliance-theater/redis');
jest.mock('@/lib/ai/mcp/providers');
jest.mock('@/lib/ai/mcp/tool-flags');
const mockConsole = hideConsoleOutput();
describe('checkChatHealth', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should return healthy when all subsystems are healthy', async () => {
        getRedisClient.mockResolvedValue({
            ping: jest.fn().mockResolvedValue('PONG'),
        });
        setupDefaultTools.mockResolvedValue({
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
        getMem0EnabledFlag.mockResolvedValue({ value: false });
        const result = await checkChatHealth();
        expect(result.status).toBe('healthy');
        expect(result.cache?.status).toBe('healthy');
        expect(result.queue?.status).toBe('healthy');
        expect(result.tools?.status).toBe('healthy');
    });
    it('should return error when Redis fails', async () => {
        mockConsole.setup();
        getRedisClient.mockRejectedValue(new Error('Redis down'));
        setupDefaultTools.mockResolvedValue({
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
        getMem0EnabledFlag.mockResolvedValue({ value: false });
        const result = await checkChatHealth();
        expect(result.status).toBe('error');
        expect(result.cache?.status).toBe('error');
    });
    it('should return warning when tools are insufficient', async () => {
        mockConsole.setup();
        getRedisClient.mockResolvedValue({
            ping: jest.fn().mockResolvedValue('PONG'),
        });
        setupDefaultTools.mockResolvedValue({
            isHealthy: true,
            providers: [{}],
            tools: {},
            [Symbol.dispose]: jest.fn(),
        });
        getMem0EnabledFlag.mockResolvedValue({ value: false });
        const result = await checkChatHealth();
        expect(result.status).toBe('warning');
        expect(result.tools?.status).toBe('warning');
    });
});
//# sourceMappingURL=chat.test.js.map