/* @jest-environment node */
/**
 * Chat Details API Route Tests
 *
 * This test file covers the chat details endpoint (/api/ai/chat/history/[chatId]).
 * The tests provide comprehensive coverage for:
 * - GET: Fetching specific chat details with authentication
 * - Error handling for authentication, not found, and database errors
 * - Proper drizzle query construction and data transformation
 */

import { GET } from '/app/api/ai/chat/history/[chatId]/route';
import { NextRequest } from 'next/server';

// Define mocks before they are used
const mockDbSelect = jest.fn();
const mockDbFrom = jest.fn();
const mockDbWhere = jest.fn();
const mockDbLimit = jest.fn();
const mockDbLeftJoin = jest.fn();
const mockDbOrderBy = jest.fn();

// Mock modules
jest.mock('/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('/lib/drizzle-db', () => ({
  drizDbWithInit: jest.fn(),
}));

jest.mock('/lib/drizzle-db/schema', () => ({
  schema: {
    chats: {
      id: 'chats.id',
      title: 'chats.title',
      createdAt: 'chats.createdAt',
    },
    chatTurns: {
      turnId: 'chatTurns.turnId',
      chatId: 'chatTurns.chatId',
      createdAt: 'chatTurns.createdAt',
      completedAt: 'chatTurns.completedAt',
      modelName: 'chatTurns.modelName',
      statusId: 'chatTurns.statusId',
      temperature: 'chatTurns.temperature',
      topP: 'chatTurns.topP',
      latencyMs: 'chatTurns.latencyMs',
      warnings: 'chatTurns.warnings',
      errors: 'chatTurns.errors',
      metadata: 'chatTurns.metadata',
    },
    chatMessages: {
      messageId: 'chatMessages.messageId',
      chatId: 'chatMessages.chatId',
      turnId: 'chatMessages.turnId',
      role: 'chatMessages.role',
      content: 'chatMessages.content',
      messageOrder: 'chatMessages.messageOrder',
      toolName: 'chatMessages.toolName',
      functionCall: 'chatMessages.functionCall',
      statusId: 'chatMessages.statusId',
      providerId: 'chatMessages.providerId',
      metadata: 'chatMessages.metadata',
      toolInstanceId: 'chatMessages.toolInstanceId',
      optimizedContent: 'chatMessages.optimizedContent',
    },
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
  and: jest.fn(),
}));

jest.mock('/lib/react-util', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn(),
  },
}));

// Import mocked dependencies
import { auth } from '/auth';
import { drizDbWithInit } from '/lib/drizzle-db';
import { eq, and } from 'drizzle-orm';

describe('/api/ai/chat/history/[chatId] route', () => {
  const mockDb = {
    select: mockDbSelect,
  };

  const mockChatResult = [
    {
      id: 'test-chat-id',
      title: 'Test Chat',
      createdAt: '2025-01-01T10:00:00Z',
    },
  ];

  const mockTurnsAndMessagesResult = [
    {
      turnId: 1,
      createdAt: '2025-01-01T10:00:00Z',
      completedAt: '2025-01-01T10:05:00Z',
      modelName: 'gpt-4',
      turnStatusId: 1,
      temperature: 0.7,
      topP: 1.0,
      latencyMs: 1500,
      warnings: [],
      errors: [],
      turnMetadata: {},
      messageId: 1,
      role: 'user',
      content: 'Hello',
      messageOrder: 1,
      toolName: null,
      functionCall: null,
      messageStatusId: 1,
      providerId: 'openai',
      messageMetadata: {},
      toolInstanceId: null,
      optimizedContent: null,
    },
    {
      turnId: 1,
      createdAt: '2025-01-01T10:00:00Z',
      completedAt: '2025-01-01T10:05:00Z',
      modelName: 'gpt-4',
      turnStatusId: 1,
      temperature: 0.7,
      topP: 1.0,
      latencyMs: 1500,
      warnings: [],
      errors: [],
      turnMetadata: {},
      messageId: 2,
      role: 'assistant',
      content: 'Hi there!',
      messageOrder: 2,
      toolName: null,
      functionCall: null,
      messageStatusId: 1,
      providerId: 'openai',
      messageMetadata: {},
      toolInstanceId: null,
      optimizedContent: null,
    },
  ];

  beforeEach(() => {
    // jest.clearAllMocks();

    // Setup default successful auth
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'test-user' } });

    // Reset call count for each test
    let callCount = 0;

    // Mock the select method to return different chains for different calls
    mockDbSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call for basic chat info
        return {
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue(mockChatResult),
            }),
          }),
        };
      } else {
        // Second call for turns and messages
        return {
          from: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockReturnValue(mockTurnsAndMessagesResult),
              }),
            }),
          }),
        };
      }
    });

    (drizDbWithInit as jest.Mock).mockResolvedValue(mockDb);
    (eq as jest.Mock).mockReturnValue('eq-condition');
    (and as jest.Mock).mockReturnValue('and-condition');
  });

  describe('GET', () => {
    it('should return chat details for authenticated user', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/chat/history/test-chat-id',
      );
      const params = Promise.resolve({ chatId: 'test-chat-id' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        id: 'test-chat-id',
        title: 'Test Chat',
        createdAt: '2025-01-01T10:00:00Z',
        turns: [
          {
            turnId: 1,
            createdAt: '2025-01-01T10:00:00Z',
            completedAt: '2025-01-01T10:05:00Z',
            modelName: 'gpt-4',
            statusId: 1,
            temperature: 0.7,
            topP: 1.0,
            latencyMs: 1500,
            warnings: [],
            errors: [],
            metadata: {},
            messages: [
              {
                turnId: 1,
                messageId: 1,
                role: 'user',
                content: 'Hello',
                messageOrder: 1,
                toolName: 'null',
                functionCall: null,
                statusId: 1,
                providerId: 'openai',
                metadata: {},
                toolInstanceId: 'null',
                optimizedContent: null,
              },
              {
                turnId: 1,
                messageId: 2,
                role: 'assistant',
                content: 'Hi there!',
                messageOrder: 2,
                toolName: 'null',
                functionCall: null,
                statusId: 1,
                providerId: 'openai',
                metadata: {},
                toolInstanceId: 'null',
                optimizedContent: null,
              },
            ],
          },
        ],
      });
      expect(auth).toHaveBeenCalled();
      expect(drizDbWithInit).toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated requests', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/ai/chat/history/test-chat-id',
      );
      const params = Promise.resolve({ chatId: 'test-chat-id' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized - session required' });
    });

    it('should return 404 for non-existent chat', async () => {
      // Override the first call to return empty result
      let callCount = 0;
      mockDbSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue([]), // Empty result for chat query
              }),
            }),
          };
        } else {
          return {
            from: jest.fn().mockReturnValue({
              leftJoin: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                  orderBy: jest
                    .fn()
                    .mockReturnValue(mockTurnsAndMessagesResult),
                }),
              }),
            }),
          };
        }
      });

      const request = new NextRequest(
        'http://localhost:3000/api/ai/chat/history/non-existent-id',
      );
      const params = Promise.resolve({ chatId: 'non-existent-id' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Chat not found' });
    });

    it('should handle chat with null title', async () => {
      const mockChatWithNullTitle = [
        {
          id: 'test-chat-id',
          title: null,
          createdAt: '2025-01-01T10:00:00Z',
        },
      ];

      let callCount = 0;
      mockDbSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue(mockChatWithNullTitle),
              }),
            }),
          };
        } else {
          return {
            from: jest.fn().mockReturnValue({
              leftJoin: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                  orderBy: jest.fn().mockReturnValue([]), // No turns
                }),
              }),
            }),
          };
        }
      });

      const request = new NextRequest(
        'http://localhost:3000/api/ai/chat/history/test-chat-id',
      );
      const params = Promise.resolve({ chatId: 'test-chat-id' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe(null);
      expect(data.turns).toEqual([]);
    });

    it('should handle chat with no turns', async () => {
      let callCount = 0;
      mockDbSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue(mockChatResult),
              }),
            }),
          };
        } else {
          return {
            from: jest.fn().mockReturnValue({
              leftJoin: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                  orderBy: jest.fn().mockReturnValue([]), // No turns/messages
                }),
              }),
            }),
          };
        }
      });

      const request = new NextRequest(
        'http://localhost:3000/api/ai/chat/history/test-chat-id',
      );
      const params = Promise.resolve({ chatId: 'test-chat-id' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.turns).toEqual([]);
    });

    it('should handle database connection errors', async () => {
      (drizDbWithInit as jest.Mock).mockRejectedValue(
        new Error('Database connection failed'),
      );

      const request = new NextRequest(
        'http://localhost:3000/api/ai/chat/history/test-chat-id',
      );
      const params = Promise.resolve({ chatId: 'test-chat-id' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal Server Error' });
    });

    it('should handle authentication errors', async () => {
      (auth as jest.Mock).mockRejectedValue(
        new Error('Auth service unavailable'),
      );

      const request = new NextRequest(
        'http://localhost:3000/api/ai/chat/history/test-chat-id',
      );
      const params = Promise.resolve({ chatId: 'test-chat-id' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal Server Error' });

      //expect(data).toEqual({ error: 'An error occurred', status: 500 });
    });

    it('should handle chat with null createdAt', async () => {
      const mockChatWithNullCreatedAt = [
        {
          id: 'test-chat-id',
          title: 'Test Chat',
          createdAt: null,
        },
      ];

      let callCount = 0;
      mockDbSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue(mockChatWithNullCreatedAt),
              }),
            }),
          };
        } else {
          return {
            from: jest.fn().mockReturnValue({
              leftJoin: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                  orderBy: jest.fn().mockReturnValue([]),
                }),
              }),
            }),
          };
        }
      });

      const request = new NextRequest(
        'http://localhost:3000/api/ai/chat/history/test-chat-id',
      );
      const params = Promise.resolve({ chatId: 'test-chat-id' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      ); // ISO string pattern
    });
  });
});
