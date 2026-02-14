import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';
setupImpersonationMock();
import { finalizeAssistantMessage, completeChatTurn, generateChatTitle, markTurnAsError, handleFlush, DEFAULT_FLUSH_CONFIG, } from '@/lib/ai/middleware/chat-history/flush-handlers';
import { hideConsoleOutput } from '@/__tests__/test-utils-server';
import { withJestTestExtensions } from '@/__tests__/shared/jest.test-extensions';
const makeMockDb = () => withJestTestExtensions().makeMockDb();
jest.mock('@/lib/ai/middleware/chat-history/instrumentation', () => ({
    instrumentFlushOperation: jest.fn(async (fn) => {
        if (typeof fn === 'function') {
            try {
                return await fn();
            }
            catch (error) {
                return {
                    success: false,
                    processingTimeMs: 0,
                    textLength: 0,
                    error: error,
                };
            }
        }
        return {
            success: false,
            processingTimeMs: 0,
            textLength: 0,
            error: new Error('Invalid function provided to instrumentFlushOperation'),
        };
    }),
}));
jest.mock('@/lib/ai/middleware/chat-history/import-incoming-message', () => ({
    insertPendingAssistantMessage: jest.fn(),
    reserveTurnId: jest.fn(() => Promise.resolve(1)),
}));
let mockDbInstance;
describe('Flush Handlers - Compilation Fix Test', () => {
    let mockContext;
    let mockUpdate;
    const mockQuery = {
        chats: {
            findFirst: jest.fn(),
        },
    };
    beforeEach(() => {
        setupImpersonationMock();
        mockDbInstance = makeMockDb();
        mockContext = {
            chatId: 'chat-123',
            turnId: 1,
            messageId: 42,
            generatedText: 'Hello, how can I help you?',
            startTime: Date.now() - 1000,
        };
        mockUpdate = mockDbInstance.update;
        mockUpdate.mockReturnValue({
            set: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue(undefined),
            }),
        });
        mockQuery.chats.findFirst = mockDbInstance.query.chats
            .findFirst;
        mockQuery.chats.findFirst.mockResolvedValue(null);
    });
    describe('finalizeAssistantMessage', () => {
        it('should handle missing messageId gracefully', async () => {
            const contextWithoutMessageId = { ...mockContext, messageId: undefined };
            await expect(finalizeAssistantMessage(contextWithoutMessageId)).resolves.not.toThrow();
        });
        it('should handle missing messageId and generatedText gracefully', async () => {
            const contextWithoutMessage = {
                ...mockContext,
                messageId: undefined,
                generatedText: '',
            };
            await expect(finalizeAssistantMessage(contextWithoutMessage)).resolves.not.toThrow();
        });
    });
    describe('completeChatTurn', () => {
        it('should handle missing turnId gracefully', async () => {
            const contextWithoutTurnId = { ...mockContext, turnId: undefined };
            const latencyMs = 1000;
            await expect(completeChatTurn(contextWithoutTurnId, latencyMs)).resolves.not.toThrow();
        });
    });
    describe('generateChatTitle', () => {
        const mockConsole = hideConsoleOutput();
        beforeEach(() => {
            mockConsole.setup();
        });
        afterEach(() => {
            mockConsole.dispose();
        });
        it('should skip title generation for empty text', async () => {
            const contextWithEmptyText = { ...mockContext, generatedText: '' };
            await expect(generateChatTitle(contextWithEmptyText)).resolves.not.toThrow();
        });
        it('should skip title generation for whitespace text', async () => {
            const contextWithWhitespace = {
                ...mockContext,
                generatedText: '   \n\t  ',
            };
            await expect(generateChatTitle(contextWithWhitespace)).resolves.not.toThrow();
        });
    });
    describe('markTurnAsError', () => {
        const mockConsole = hideConsoleOutput();
        beforeEach(() => {
            mockConsole.setup();
        });
        afterEach(() => {
            mockConsole.dispose();
        });
        it('should handle missing turnId gracefully', async () => {
            const contextWithoutTurnId = { ...mockContext, turnId: undefined };
            const error = new Error('Test error');
            await expect(markTurnAsError(contextWithoutTurnId, error)).resolves.not.toThrow();
        });
        it('should handle valid context gracefully', async () => {
            const error = new Error('Processing failed');
            await expect(markTurnAsError(mockContext, error)).resolves.not.toThrow();
        });
    });
    describe('handleFlush', () => {
        it('should handle empty context gracefully', async () => {
            const emptyContext = { ...mockContext, generatedText: '' };
            await expect(handleFlush(emptyContext)).resolves.toBeDefined();
        });
        it('should use custom configuration', async () => {
            const customConfig = {
                autoGenerateTitle: false,
                maxTitleLength: 50,
                titleWordCount: 3,
            };
            await expect(handleFlush(mockContext, customConfig)).resolves.toBeDefined();
        });
    });
    describe('DEFAULT_FLUSH_CONFIG', () => {
        it('should export default configuration', () => {
            expect(DEFAULT_FLUSH_CONFIG).toMatchObject({
                batchSize: 10,
                compressionEnabled: false,
                enableMetrics: false,
                flushIntervalMs: 1000,
                maxTitleLength: 100,
                retryAttempts: 3,
                timeoutMs: 5000,
            });
        });
    });
    describe('Integration Tests', () => {
        it('should handle empty context workflow', async () => {
            const emptyContext = {
                chatId: 'empty-chat',
                turnId: undefined,
                messageId: undefined,
                generatedText: '',
                startTime: Date.now() - 100,
            };
            const result = await handleFlush(emptyContext);
            expect(result).toBeDefined();
            expect(typeof result.success).toBe('boolean');
            expect(typeof result.processingTimeMs).toBe('number');
            expect(typeof result.textLength).toBe('number');
        });
        it('should handle configuration variations', async () => {
            const customConfig = {
                autoGenerateTitle: false,
                maxTitleLength: 50,
                titleWordCount: 3,
            };
            const testContext = {
                chatId: 'config-test',
                turnId: undefined,
                messageId: undefined,
                generatedText: 'Short response',
                startTime: Date.now() - 50,
            };
            const result = await handleFlush(testContext, customConfig);
            expect(result).toBeDefined();
            expect(typeof result.success).toBe('boolean');
            expect(typeof result.textLength).toBe('number');
        });
    });
});
//# sourceMappingURL=flush-handlers-simple.test.js.map