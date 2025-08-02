/**
 * Mock data for chat-related tests
 */

export const mockChatSummary = {
  id: 'chat123',
  title: 'Test Chat Title',
  userId: 1,
  createdAt: '2025-01-01T10:00:00Z',
};

export const mockChatSummaries = [
  mockChatSummary,
  {
    id: 'chat456',
    title: 'Another Chat',
    userId: 1,
    createdAt: '2025-01-02T11:00:00Z',
  },
  {
    id: 'chat789',
    title: null, // Test null title
    userId: 1,
    createdAt: '2025-01-03T12:00:00Z',
  },
];

export const mockChatMessage = {
  turnId: 1,
  messageId: 1,
  role: 'user',
  content: 'Test user message',
  messageOrder: 1,
  toolName: null,
  functionCall: null,
  statusId: 1,
  providerId: 'test-provider',
  metadata: { test: 'value' },
  toolInstanceId: null,
  optimizedContent: null,
};

export const mockAssistantMessage = {
  turnId: 1,
  messageId: 2,
  role: 'assistant',
  content: 'Test assistant response',
  messageOrder: 2,
  toolName: null,
  functionCall: null,
  statusId: 1,
  providerId: 'test-provider',
  metadata: null,
  toolInstanceId: null,
  optimizedContent: null,
};

export const mockToolMessage = {
  turnId: 1,
  messageId: 3,
  role: 'tool',
  content: 'Tool execution result',
  messageOrder: 3,
  toolName: 'test-tool',
  functionCall: { function: 'test', args: { param: 'value' } },
  statusId: 1,
  providerId: 'test-provider',
  metadata: null,
  toolInstanceId: 'tool-123',
  optimizedContent: 'Optimized tool content',
};

export const mockChatTurn = {
  turnId: 1,
  createdAt: '2025-01-01T10:00:00Z',
  completedAt: '2025-01-01T10:00:05Z',
  modelName: 'gpt-4',
  messages: [mockChatMessage, mockAssistantMessage],
  statusId: 1,
  temperature: 0.7,
  topP: 0.9,
  latencyMs: 5000,
  warnings: ['Test warning'],
  errors: null,
  metadata: { model_version: '4.0' },
};

export const mockChatTurnWithTool = {
  turnId: 2,
  createdAt: '2025-01-01T10:01:00Z',
  completedAt: '2025-01-01T10:01:10Z',
  modelName: 'gpt-4',
  messages: [mockToolMessage],
  statusId: 1,
  temperature: 0.8,
  topP: 0.95,
  latencyMs: 10000,
  warnings: null,
  errors: ['Test error'],
  metadata: null,
};

export const mockChatDetails = {
  id: 'chat123',
  title: 'Test Chat Title',
  createdAt: '2025-01-01T10:00:00Z',
  turns: [mockChatTurn, mockChatTurnWithTool],
};

export const mockEmptyChat = {
  id: 'empty-chat',
  title: 'Empty Chat',
  createdAt: '2025-01-01T10:00:00Z',
  turns: [],
};

export const mockChatHistoryResponse = {
  rows: mockChatSummaries,
  rowCount: 3,
  totalRowCount: 3,
};