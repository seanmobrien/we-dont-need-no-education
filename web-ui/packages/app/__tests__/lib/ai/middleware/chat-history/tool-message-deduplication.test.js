import { upsertToolMessage } from '@/lib/ai/middleware/chat-history/import-incoming-message';
import { getNewMessages } from '@/lib/ai/middleware/chat-history/utility';
jest.mock('@compliance-theater/database', () => ({
    schema: {
        chatMessages: {
            chatMessageId: 'mocked-chat-message-id',
            messageId: 'mocked-message-id',
            turnId: 'mocked-turn-id',
            functionCall: 'mocked-function-call',
            toolResult: 'mocked-tool-result',
            metadata: 'mocked-metadata',
            optimizedContent: 'mocked-optimized-content',
            role: 'mocked-role-column',
            content: 'mocked-content-column',
            messageOrder: 'mocked-order-column',
            chatId: 'mocked-chatid-column',
            providerId: 'mocked-provider-id-column',
            toolName: 'mocked-tool-name-column',
        },
        chatToolCalls: {
            chatMessageId: 'mocked-tool-calls-message-id',
            input: 'mocked-tool-calls-input',
            output: 'mocked-tool-calls-output',
        },
        chatTool: {
            chatToolId: 'mocked-chat-tool-id',
            toolName: 'mocked-chat-tool-name',
        },
    },
}));
describe('Tool Message Deduplication', () => {
    let mockTx;
    let mockSelect;
    let mockUpdate;
    let mockSet;
    let mockWhere;
    beforeEach(() => {
        mockWhere = jest.fn().mockResolvedValue(undefined);
        mockSet = jest.fn().mockReturnValue({ where: mockWhere });
        mockUpdate = jest.fn().mockReturnValue({ set: mockSet });
        const mockFrom = jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([]),
                orderBy: jest.fn().mockResolvedValue([]),
            }),
            leftJoin: jest.fn().mockReturnThis(),
        });
        mockSelect = jest.fn().mockReturnValue({
            from: mockFrom,
        });
        mockTx = {
            select: mockSelect,
            update: mockUpdate,
        };
    });
    describe('upsertToolMessage', () => {
        it('should return null when providerId is not present', async () => {
            const chatId = 'chat-123';
            const turnId = 2;
            const toolRow = {
                role: 'tool',
                statusId: 1,
                providerId: null,
                toolName: 'testTool',
                functionCall: { args: { test: 'value' } },
            };
            const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);
            expect(result).toBeNull();
            expect(mockSelect).not.toHaveBeenCalled();
        });
        it('should return null when no existing message is found', async () => {
            const chatId = 'chat-123';
            const turnId = 2;
            const toolRow = {
                role: 'tool',
                statusId: 1,
                providerId: 'call_abc123',
                toolName: 'testTool',
                functionCall: { args: { test: 'value' } },
            };
            const mockLimit = jest.fn().mockResolvedValue([]);
            const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
            const mockFromClause = jest
                .fn()
                .mockReturnValue({ where: mockWhereClause });
            mockSelect.mockReturnValue({ from: mockFromClause });
            const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);
            expect(result).toBeNull();
            expect(mockSelect).toHaveBeenCalled();
            expect(mockUpdate).not.toHaveBeenCalled();
        });
        it('should skip update when current turn is not greater than modifiedTurnId', async () => {
            const chatId = 'chat-123';
            const turnId = 2;
            const toolRow = {
                role: 'tool',
                statusId: 1,
                providerId: 'call_abc123',
                toolName: 'testTool',
                toolResult: { result: 'success' },
            };
            const existingMessage = {
                chatMessageId: 'msg-uuid-123',
                messageId: 42,
                statusId: 1,
                turnId: 1,
                functionCall: { args: { test: 'value' } },
                toolResult: { result: 'success' },
                metadata: { modifiedTurnId: 3 },
                optimizedContent: 'existing content',
            };
            const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
            const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
            const mockFromClause = jest
                .fn()
                .mockReturnValue({ where: mockWhereClause });
            mockSelect.mockReturnValue({ from: mockFromClause });
            const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);
            expect(result).toBe(42);
            expect(mockUpdate).not.toHaveBeenCalled();
        });
        it('should update existing message when current turn is greater', async () => {
            const chatId = 'chat-123';
            const turnId = 4;
            const toolRow = {
                role: 'tool',
                statusId: 2,
                providerId: 'call_abc123',
                toolName: 'testTool',
                toolResult: { result: 'success' },
            };
            const existingMessage = {
                chatMessageId: 'msg-uuid-123',
                messageId: 42,
                turnId: 1,
                functionCall: { args: { test: 'value' } },
                toolResult: null,
                metadata: { modifiedTurnId: 2 },
                optimizedContent: 'existing content',
            };
            const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
            const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
            const mockFromClause = jest
                .fn()
                .mockReturnValue({ where: mockWhereClause });
            mockSelect.mockReturnValue({ from: mockFromClause });
            const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);
            expect(result).toBe(42);
            expect(mockUpdate).toHaveBeenCalled();
            expect(mockSet).toHaveBeenCalledWith({
                statusId: 2,
                functionCall: { args: { test: 'value' } },
                metadata: {
                    modifiedTurnId: 4,
                },
                optimizedContent: null,
                toolResult: { result: 'success' },
            });
        });
        it('should preserve existing functionCall when adding toolResult', async () => {
            const chatId = 'chat-123';
            const turnId = 3;
            const toolRow = {
                role: 'tool',
                statusId: 2,
                providerId: 'call_abc123',
                toolName: 'testTool',
                toolResult: { result: 'success' },
            };
            const existingMessage = {
                chatMessageId: 'msg-uuid-123',
                messageId: 42,
                statusId: 1,
                turnId: 1,
                functionCall: { args: { test: 'existing' } },
                toolResult: null,
                metadata: {},
                optimizedContent: null,
            };
            const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
            const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
            const mockFromClause = jest
                .fn()
                .mockReturnValue({ where: mockWhereClause });
            mockSelect.mockReturnValue({ from: mockFromClause });
            const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);
            expect(result).toBe(42);
            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
                toolResult: { result: 'success' },
                statusId: 2,
                functionCall: { args: { test: 'existing' } },
                metadata: { modifiedTurnId: 3 },
                optimizedContent: null,
            }));
            const setCallArgs = mockSet.mock.calls[0][0];
            expect(setCallArgs).toHaveProperty('functionCall', {
                args: { test: 'existing' },
            });
        });
        it('should add functionCall when it does not exist', async () => {
            const chatId = 'chat-123';
            const turnId = 3;
            const toolRow = {
                role: 'tool',
                providerId: 'call_abc123',
                statusId: 1,
                turnId: 1,
                toolName: 'testTool',
                functionCall: { args: { test: 'new' } },
            };
            const existingMessage = {
                chatMessageId: 'msg-uuid-123',
                messageId: 42,
                statusId: 1,
                functionCall: null,
                toolResult: null,
                metadata: {},
                optimizedContent: null,
            };
            const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
            const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
            const mockFromClause = jest
                .fn()
                .mockReturnValue({ where: mockWhereClause });
            mockSelect.mockReturnValue({ from: mockFromClause });
            const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);
            expect(result).toBe(42);
            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
                functionCall: { args: { test: 'new' } },
            }));
        });
    });
    describe('turnId validation - acceptance criteria tests', () => {
        it('should update existing record when current turnId > modifiedTurnId', async () => {
            const chatId = 'chat-123';
            const turnId = 3;
            const toolRow = {
                role: 'tool',
                statusId: 2,
                providerId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
                toolName: 'some_function',
                toolResult: { result: 'value' },
            };
            const existingMessage = {
                chatMessageId: 'msg-uuid-123',
                messageId: 123,
                turnId: 1,
                statusId: 1,
                functionCall: { arg1: 'value' },
                toolResult: null,
                metadata: { modifiedTurnId: 1 },
                optimizedContent: 'some content',
            };
            const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
            const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
            const mockFromClause = jest
                .fn()
                .mockReturnValue({ where: mockWhereClause });
            mockSelect.mockReturnValue({ from: mockFromClause });
            const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);
            expect(result).toBe(123);
            expect(mockUpdate).toHaveBeenCalled();
            expect(mockSet).toHaveBeenCalledWith({
                metadata: {
                    modifiedTurnId: 3,
                },
                statusId: 2,
                functionCall: { arg1: 'value' },
                optimizedContent: null,
                toolResult: { result: 'value' },
            });
        });
        it('should NOT update when current turnId <= modifiedTurnId', async () => {
            const chatId = 'chat-123';
            const turnId = 2;
            const toolRow = {
                role: 'tool',
                providerId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
                toolName: 'some_function',
                statusId: 1,
                toolResult: { result: 'value' },
            };
            const existingMessage = {
                chatMessageId: 'msg-uuid-123',
                messageId: 123,
                statusId: 1,
                turnId: 1,
                functionCall: { arg1: 'value' },
                toolResult: { result: 'other value' },
                metadata: { modifiedTurnId: 3 },
                optimizedContent: 'some content',
            };
            const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
            const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
            const mockFromClause = jest
                .fn()
                .mockReturnValue({ where: mockWhereClause });
            mockSelect.mockReturnValue({ from: mockFromClause });
            const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);
            expect(result).toBe(123);
            expect(mockUpdate).not.toHaveBeenCalled();
        });
    });
    describe('non-destructive merge - acceptance criteria tests', () => {
        it('should preserve existing functionCall when adding toolResult', async () => {
            const chatId = 'chat-123';
            const turnId = 2;
            const toolRow = {
                role: 'tool',
                providerId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
                toolName: 'some_function',
                statusId: 2,
                functionCall: null,
                toolResult: { result: 'value' },
            };
            const existingMessage = {
                chatMessageId: 'msg-uuid-123',
                messageId: 123,
                turnId: 1,
                functionCall: { arg1: 'value' },
                toolResult: null,
                metadata: { modifiedTurnId: 1 },
                optimizedContent: null,
            };
            const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
            const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
            const mockFromClause = jest
                .fn()
                .mockReturnValue({ where: mockWhereClause });
            mockSelect.mockReturnValue({ from: mockFromClause });
            const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);
            expect(result).toBe(123);
            expect(mockSet).toHaveBeenCalled();
            const setCallArgs = mockSet.mock.calls[0][0];
            expect(setCallArgs).toEqual(expect.objectContaining({
                statusId: 2,
                metadata: { modifiedTurnId: 2 },
                optimizedContent: null,
                functionCall: { arg1: 'value' },
                toolResult: { result: 'value' },
            }));
            expect(setCallArgs.functionCall).toEqual({ arg1: 'value' });
        });
        it('should add functionCall when it does not exist and not overwrite toolResult', async () => {
            const chatId = 'chat-123';
            const turnId = 2;
            const toolRow = {
                role: 'tool',
                statusId: 2,
                providerId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
                toolName: 'some_function',
                functionCall: { arg1: 'value' },
                toolResult: null,
            };
            const existingMessage = {
                chatMessageId: 'msg-uuid-123',
                messageId: 123,
                turnId: 1,
                functionCall: null,
                toolResult: { result: 'existing' },
                metadata: { modifiedTurnId: 1 },
                optimizedContent: null,
            };
            const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
            const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
            const mockFromClause = jest
                .fn()
                .mockReturnValue({ where: mockWhereClause });
            mockSelect.mockReturnValue({ from: mockFromClause });
            const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);
            expect(result).toBe(123);
            expect(mockSet).toHaveBeenCalled();
            const setCallArgs = mockSet.mock.calls[0][0];
            expect(setCallArgs).toEqual(expect.objectContaining({
                toolResult: { result: 'existing' },
                metadata: { modifiedTurnId: 2 },
                optimizedContent: null,
                statusId: 2,
                functionCall: { arg1: 'value' },
            }));
            expect(setCallArgs.toolResult).toEqual({ result: 'existing' });
        });
        it('should achieve the desired end goal: single record with both functionCall and toolResult', async () => {
            const chatId = 'chat-123';
            const turnId1 = 1;
            const toolCallRow = {
                role: 'tool',
                providerId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
                toolName: 'some_function',
                statusId: 1,
                functionCall: { arg1: 'value' },
                toolResult: null,
            };
            const mockLimit1 = jest.fn().mockResolvedValue([]);
            const mockWhereClause1 = jest.fn().mockReturnValue({ limit: mockLimit1 });
            const mockFromClause1 = jest
                .fn()
                .mockReturnValue({ where: mockWhereClause1 });
            mockSelect.mockReturnValue({ from: mockFromClause1 });
            const result1 = await upsertToolMessage(mockTx, chatId, turnId1, toolCallRow);
            expect(result1).toBeNull();
            expect(mockUpdate).not.toHaveBeenCalled();
            mockUpdate.mockClear();
            mockSet.mockClear();
            mockWhere.mockClear();
            mockSelect.mockClear();
            const turnId2 = 2;
            const toolResultRow = {
                role: 'tool',
                providerId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
                toolName: 'some_function',
                statusId: 1,
                functionCall: null,
                toolResult: { result: 'value' },
            };
            const existingMessage = {
                chatMessageId: 'msg-uuid-123',
                messageId: 123,
                statusId: 1,
                turnId: 1,
                functionCall: { arg1: 'value' },
                toolResult: null,
                metadata: { modifiedTurnId: 1 },
                optimizedContent: null,
            };
            const mockLimit2 = jest.fn().mockResolvedValue([existingMessage]);
            const mockWhereClause2 = jest.fn().mockReturnValue({ limit: mockLimit2 });
            const mockFromClause2 = jest
                .fn()
                .mockReturnValue({ where: mockWhereClause2 });
            mockSelect.mockReturnValue({ from: mockFromClause2 });
            const result2 = await upsertToolMessage(mockTx, chatId, turnId2, toolResultRow);
            expect(result2).toBe(123);
            expect(mockUpdate).toHaveBeenCalled();
            const setCallArgs = mockSet.mock.calls[0][0];
            expect(setCallArgs).toEqual(expect.objectContaining({
                functionCall: { arg1: 'value' },
                statusId: 1,
                metadata: { modifiedTurnId: 2 },
                optimizedContent: null,
                toolResult: { result: 'value' },
            }));
            expect(setCallArgs.functionCall).toEqual({ arg1: 'value' });
        });
        it('should properly handle truthy empty containers but ignore falsy primitives for toolResult', async () => {
            const truthyCases = [
                { value: [], description: 'empty array' },
                { value: {}, description: 'empty object' },
            ];
            for (const testCase of truthyCases) {
                const chatId = 'chat-123';
                const turnId = 2;
                const toolRow = {
                    role: 'tool',
                    statusId: 2,
                    providerId: 'call_falsy_test',
                    toolName: 'testTool',
                    toolResult: testCase.value,
                };
                const existingMessage = {
                    chatMessageId: 'msg-uuid-123',
                    messageId: 42,
                    turnId: 1,
                    functionCall: { args: { test: 'existing' } },
                    toolResult: null,
                    metadata: { modifiedTurnId: 1 },
                    optimizedContent: null,
                };
                const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
                const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
                const mockFromClause = jest
                    .fn()
                    .mockReturnValue({ where: mockWhereClause });
                mockSelect.mockReturnValue({ from: mockFromClause });
                const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);
                expect(result).toBe(42);
                expect(mockUpdate).toHaveBeenCalled();
                expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ toolResult: testCase.value }));
                mockLimit.mockClear();
                mockWhereClause.mockClear();
                mockFromClause.mockClear();
                mockSelect.mockClear();
                mockUpdate.mockClear();
                mockSet.mockClear();
            }
            const falsyCases = [
                { value: 0, description: 'numeric zero' },
                { value: false, description: 'boolean false' },
                { value: '', description: 'empty string' },
            ];
            for (const testCase of falsyCases) {
                const chatId = 'chat-123';
                const turnId = 2;
                const toolRow = {
                    role: 'tool',
                    statusId: 2,
                    providerId: 'call_falsy_test',
                    toolName: 'testTool',
                    toolResult: testCase.value,
                };
                const existingMessage = {
                    chatMessageId: 'msg-uuid-123',
                    messageId: 42,
                    turnId: 1,
                    functionCall: { args: { test: 'existing' } },
                    toolResult: null,
                    metadata: { modifiedTurnId: 1 },
                    optimizedContent: null,
                };
                const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
                const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
                const mockFromClause = jest
                    .fn()
                    .mockReturnValue({ where: mockWhereClause });
                mockSelect.mockReturnValue({ from: mockFromClause });
                const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);
                expect(result).toBe(42);
                expect(mockUpdate).toHaveBeenCalled();
            }
        });
        it('should NOT update toolResult when incoming value is null or undefined', async () => {
            const testCases = [
                { value: null, description: 'null' },
                { value: undefined, description: 'undefined' },
            ];
            for (const testCase of testCases) {
                const chatId = 'chat-123';
                const turnId = 2;
                const toolRow = {
                    role: 'tool',
                    statusId: 2,
                    providerId: 'call_null_test',
                    toolName: 'testTool',
                    toolResult: testCase.value,
                };
                const existingMessage = {
                    chatMessageId: 'msg-uuid-123',
                    messageId: 42,
                    turnId: 1,
                    functionCall: { args: { test: 'existing' } },
                    toolResult: { existing: 'result' },
                    metadata: { modifiedTurnId: 1 },
                    optimizedContent: null,
                };
                const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
                const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
                const mockFromClause = jest
                    .fn()
                    .mockReturnValue({ where: mockWhereClause });
                mockSelect.mockReturnValue({ from: mockFromClause });
                const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);
                expect(result).toBe(42);
                expect(mockUpdate).toHaveBeenCalled();
                mockLimit.mockClear();
                mockWhereClause.mockClear();
                mockFromClause.mockClear();
                mockSelect.mockClear();
                mockUpdate.mockClear();
                mockSet.mockClear();
            }
        });
    });
    describe('getNewMessages - tool message deduplication', () => {
        it('should filter out tool messages with existing provider IDs', async () => {
            const chatId = 'chat-123';
            const incomingMessages = [
                {
                    role: 'user',
                    content: [{ type: 'text', text: 'Call a tool' }],
                },
                {
                    role: 'assistant',
                    content: [
                        {
                            type: 'tool-call',
                            toolCallId: 'call_existing123',
                            toolName: 'testTool',
                            input: { type: 'text', value: 'result' },
                        },
                    ],
                },
                {
                    role: 'tool',
                    content: [
                        {
                            type: 'tool-result',
                            toolName: 'testTool',
                            toolCallId: 'call_existing123',
                            output: { type: 'text', value: 'result' },
                        },
                    ],
                },
                {
                    role: 'assistant',
                    content: [
                        {
                            type: 'tool-call',
                            toolCallId: 'call_new456',
                            toolName: 'newTool',
                            input: { type: 'text', value: 'result' },
                        },
                    ],
                },
            ];
            const existingMessages = [
                {
                    role: 'user',
                    content: 'Call a tool',
                    messageOrder: 1,
                    providerId: null,
                },
                {
                    role: 'tool',
                    content: null,
                    messageOrder: 2,
                    providerId: 'call_existing123',
                },
            ];
            const mockOrderBy = jest.fn().mockResolvedValue(existingMessages);
            const mockWhereClause = jest
                .fn()
                .mockReturnValue({ orderBy: mockOrderBy });
            const mockLeftJoin = jest.fn().mockReturnThis();
            const mockFromClause = jest.fn().mockReturnValue({
                leftJoin: mockLeftJoin,
                where: mockWhereClause,
            });
            mockSelect.mockReturnValue({ from: mockFromClause });
            const chainedMock = {
                leftJoin: mockLeftJoin,
                where: mockWhereClause,
            };
            mockLeftJoin.mockReturnValue(chainedMock);
            const result = await getNewMessages(mockTx, chatId, incomingMessages);
            expect(result).toHaveLength(1);
            expect(result.some((msg) => Array.isArray(msg.content) &&
                msg.content.some((part) => part.toolCallId === 'call_new456'))).toBe(true);
            expect(result.some((msg) => Array.isArray(msg.content) &&
                msg.content.some((part) => part.toolCallId === 'call_existing123'))).toBe(false);
        });
    });
    describe('stream handler integration - acceptance criteria tests', () => {
        it('should properly handle tool-call in stream with upsert logic', async () => {
            const chatId = 'chat-123';
            const turnId = 2;
            const toolCallChunk = {
                type: 'tool-call',
                toolCallId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
                toolName: 'some_function',
                input: '{"arg1": "value"}',
            };
            const mockLimit = jest.fn().mockResolvedValue([]);
            const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
            const mockFromClause = jest
                .fn()
                .mockReturnValue({ where: mockWhereClause });
            mockSelect.mockReturnValue({ from: mockFromClause });
            const toolRow = {
                statusId: 1,
                role: 'tool',
                content: '',
                toolName: toolCallChunk.toolName,
                functionCall: JSON.parse(toolCallChunk.input || '{}'),
                providerId: toolCallChunk.toolCallId,
                metadata: null,
                toolResult: null,
            };
            const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);
            expect(result).toBeNull();
        });
        it('should properly handle tool-result in stream with upsert logic', async () => {
            const chatId = 'chat-123';
            const turnId = 3;
            const existingMessage = {
                chatMessageId: 'msg-uuid-123',
                messageId: 123,
                statusId: 1,
                turnId: 1,
                functionCall: { arg1: 'value' },
                toolResult: null,
                metadata: { modifiedTurnId: 1 },
                optimizedContent: null,
            };
            const toolResultChunk = {
                type: 'tool-result',
                statusId: 2,
                toolCallId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
                toolName: 'some_function',
                output: { result: 'success' },
            };
            const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
            const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
            const mockFromClause = jest
                .fn()
                .mockReturnValue({ where: mockWhereClause });
            mockSelect.mockReturnValue({ from: mockFromClause });
            const toolRow = {
                statusId: 2,
                role: 'tool',
                content: '',
                functionCall: null,
                providerId: toolResultChunk.toolCallId,
                metadata: null,
                toolResult: JSON.stringify(toolResultChunk.output),
            };
            const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);
            expect(result).toBe(123);
            expect(mockUpdate).toHaveBeenCalled();
            expect(mockSet).toHaveBeenCalledWith({
                statusId: 2,
                functionCall: {
                    arg1: 'value',
                },
                metadata: {
                    modifiedTurnId: 3,
                },
                optimizedContent: null,
                toolResult: JSON.stringify(toolResultChunk.output),
            });
        });
    });
    describe('getNewMessages with turn-based update logic - acceptance criteria tests', () => {
        it('should include tool messages for update when currentTurnId > modifiedTurnId', async () => {
            const chatId = 'chat-123';
            const currentTurnId = 3;
            const incomingMessages = [
                {
                    role: 'tool',
                    content: [
                        {
                            type: 'tool-result',
                            toolName: 'testTool',
                            toolCallId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
                            output: { type: 'text', value: 'new result' },
                        },
                    ],
                },
            ];
            const existingMessages = [
                {
                    role: 'tool',
                    content: null,
                    messageOrder: 1,
                    providerId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
                    metadata: { modifiedTurnId: 1 },
                },
            ];
            const mockOrderBy = jest.fn().mockResolvedValue(existingMessages);
            const mockWhereClause = jest
                .fn()
                .mockReturnValue({ orderBy: mockOrderBy });
            const mockLeftJoin = jest.fn().mockReturnThis();
            const mockFromClause = jest.fn().mockReturnValue({
                leftJoin: mockLeftJoin,
                where: mockWhereClause,
            });
            mockSelect.mockReturnValue({ from: mockFromClause });
            const chainedMock = {
                leftJoin: mockLeftJoin,
                where: mockWhereClause,
            };
            mockLeftJoin.mockReturnValue(chainedMock);
            const result = await getNewMessages(mockTx, chatId, incomingMessages, currentTurnId);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                role: 'tool',
                content: [
                    {
                        type: 'tool-result',
                        toolCallId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
                    },
                ],
            });
        });
        it('should exclude tool messages when currentTurnId <= modifiedTurnId', async () => {
            const chatId = 'chat-123';
            const currentTurnId = 2;
            const incomingMessages = [
                {
                    role: 'tool',
                    content: [
                        {
                            type: 'tool-result',
                            toolCallId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
                            toolName: 'testTool',
                            output: { type: 'text', value: 'old result' },
                        },
                    ],
                },
            ];
            const existingMessages = [
                {
                    role: 'tool',
                    content: null,
                    messageOrder: 1,
                    providerId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
                    metadata: { modifiedTurnId: 3 },
                },
            ];
            const mockOrderBy = jest.fn().mockResolvedValue(existingMessages);
            const mockWhereClause = jest
                .fn()
                .mockReturnValue({ orderBy: mockOrderBy });
            const mockLeftJoin = jest.fn().mockReturnThis();
            const mockFromClause = jest.fn().mockReturnValue({
                leftJoin: mockLeftJoin,
                where: mockWhereClause,
            });
            mockSelect.mockReturnValue({ from: mockFromClause });
            const chainedMock = {
                leftJoin: mockLeftJoin,
                where: mockWhereClause,
            };
            mockLeftJoin.mockReturnValue(chainedMock);
            const result = await getNewMessages(mockTx, chatId, incomingMessages, currentTurnId);
            expect(result).toHaveLength(0);
        });
        it('should demonstrate the desired end goal: single record evolution', async () => {
            const chatId = 'chat-123';
            const turn1Messages = [
                {
                    role: 'assistant',
                    content: [
                        {
                            type: 'tool-call',
                            toolCallId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
                            toolName: 'some_function',
                            input: { type: 'text', value: 'test' },
                        },
                    ],
                },
            ];
            mockSelect.mockReturnValueOnce({
                from: jest.fn().mockReturnValue({
                    leftJoin: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnValue({
                        orderBy: jest.fn().mockResolvedValue([]),
                    }),
                }),
            });
            const turn1Result = await getNewMessages(mockTx, chatId, turn1Messages, 1);
            expect(turn1Result).toHaveLength(1);
            mockSelect.mockClear();
            const turn2Messages = [
                {
                    role: 'tool',
                    content: [
                        {
                            type: 'tool-result',
                            toolCallId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
                            toolName: 'some_function',
                            output: { type: 'text', value: 'value' },
                        },
                    ],
                },
            ];
            const existingMessages = [
                {
                    role: 'tool',
                    content: null,
                    messageOrder: 1,
                    providerId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
                    metadata: { modifiedTurnId: 1 },
                },
            ];
            const mockOrderBy = jest.fn().mockResolvedValue(existingMessages);
            const mockWhereClause = jest
                .fn()
                .mockReturnValue({ orderBy: mockOrderBy });
            const mockLeftJoin = jest.fn().mockReturnThis();
            const mockFromClause = jest.fn().mockReturnValue({
                leftJoin: mockLeftJoin,
                where: mockWhereClause,
            });
            mockSelect.mockReturnValue({ from: mockFromClause });
            mockLeftJoin.mockReturnValue({
                leftJoin: mockLeftJoin,
                where: mockWhereClause,
            });
            const turn2Result = await getNewMessages(mockTx, chatId, turn2Messages, 2);
            expect(turn2Result).toHaveLength(1);
            expect(turn2Result[0]).toMatchObject({
                role: 'tool',
                content: [
                    {
                        type: 'tool-result',
                        toolCallId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
                        toolName: 'some_function',
                        output: {
                            type: 'text',
                            value: 'value',
                        },
                    },
                ],
            });
        });
    });
});
//# sourceMappingURL=tool-message-deduplication.test.js.map