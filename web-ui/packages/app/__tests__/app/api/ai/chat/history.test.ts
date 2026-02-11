/* @jest-environment node */

/**
 * Chat History API Route Tests
 *
 * This test file covers the Drizzle ORM-based chat history endpoint (/api/ai/chat/history).
 * The tests provide comprehensive coverage for:
 * - GET: Listing chats with pagination, filtering, and sorting
 * - Error handling for database connection issues
 * - Proper drizzle query construction and record mapping
 */

import { GET } from '@/app/api/ai/chat/history/route';
import { NextRequest } from 'next/server';
// import { mockChatHistoryResponse } from '@/__tests__/components/chat.mock-data';
const mockChatHistoryResponse = {
  results: [
    {
      id: '1',
      title: 'Test Chat 1',
      userId: 1,
      createdAt: '2023-01-01T00:00:00Z',
      chatMetadata: { key: 'value' },
      totalTokens: 100,
      totalMessages: 10,
      totalTurns: 5,
    },
    {
      id: '2',
      title: 'Test Chat 2',
      userId: 2,
      createdAt: '2023-01-02T00:00:00Z',
      chatMetadata: { key: 'value' },
      totalTokens: 200,
      totalMessages: 20,
      totalTurns: 10,
    },
  ],
  totalCount: 2,
};
const columnMap = {
  chatMetadata: 'chat_metadata',
  createdAt: 'created_at',
  id: 'id',
  title: 'title',
  totalTokens: 'total_tokens',
  totalMessages: 'total_messages',
  totalTurns: 'total_turns',
  userId: 'user_id',
} as const;

jest.mock('@/lib/components/mui/data-grid/queryHelpers', () => ({
  selectForGrid: jest.fn(),
}));

jest.mock('@/lib/react-util', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn(),
  },
}));

// Import mocked dependencies
import { drizDbWithInit, drizDb } from '@compliance-theater/database';
import { selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers';
import { schema } from '@compliance-theater/database';
import { hideConsoleOutput } from '@/__tests__/test-utils-server';

const mockConsole = hideConsoleOutput();

describe('/api/ai/chat/history route', () => {
  const mockDb = drizDb() as any;
  mockDb.__setRows(mockChatHistoryResponse.results);
  /*{
    select: mockDbSelect,
  };*/

  beforeEach(() => {
    // jest.clearAllMocks();
    // (drizDbWithInit as jest.Mock).mockResolvedValue(mockDb);
    (selectForGrid as jest.Mock).mockResolvedValue(mockChatHistoryResponse);
  });
  afterEach(() => {
    mockConsole.dispose();
  });

  describe('GET', () => {
    it('should return chat history with pagination', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/chat/history?page=0&pageSize=10',
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockChatHistoryResponse);
      expect(selectForGrid).toHaveBeenCalled();
    });

    it('should handle filtering and sorting parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/chat/history?page=0&pageSize=5&filterModel={"items":[{"field":"title","operator":"contains","value":"test"}]}&sortModel=[{"field":"created_at","sort":"asc"}]',
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(selectForGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          req: request,
          getColumn: expect.any(Function),
          columnMap,
          recordMapper: expect.any(Function),
          defaultSort: [{ field: 'created_at', sort: 'desc' }],
        }),
      );
    });

    it('should test column getter function', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/chat/history',
      );

      await GET(request);

      const selectForGridCall = (selectForGrid as jest.Mock).mock.calls[0][0];
      const getColumn = selectForGridCall.getColumn;

      // Test column mapping
      expect(getColumn('id')).toBe(schema.chats.id);
      expect(getColumn('title')).toBe(schema.chats.title);
      expect(getColumn('user_id')).toBe(schema.chats.userId);
      expect(getColumn('created_at')).toBe(schema.chats.createdAt);
      expect(getColumn('invalid_column')).toBeUndefined();
    });

    it('should test record mapper function', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/chat/history',
      );

      await GET(request);

      const selectForGridCall = (selectForGrid as jest.Mock).mock.calls[0][0];
      const recordMapper = selectForGridCall.recordMapper;

      const testRecord = {
        id: '2',
        title: 'Test Chat 2',
        userId: 2,
        createdAt: '2023-01-02T00:00:00Z',
        chatMetadata: { key: 'value' },
        totalTokens: 200,
        totalMessages: 20,
        totalTurns: 10,
      };

      const mappedRecord = recordMapper(testRecord);

      expect(mappedRecord).toEqual({
        id: '2',
        title: 'Test Chat 2',
        userId: 2,
        createdAt: '2023-01-02T00:00:00Z',
        chatMetadata: { key: 'value' },
        totalTokens: 200,
        totalMessages: 20,
        totalTurns: 10,
      });
    });

    it('should handle null title in record mapper', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/chat/history',
      );

      await GET(request);

      const selectForGridCall = (selectForGrid as jest.Mock).mock.calls[0][0];
      const recordMapper = selectForGridCall.recordMapper;

      const testRecord = {
        id: '2',
        // title: 'Test Chat 2',
        userId: 2,
        createdAt: '2023-01-02T00:00:00Z',
        chatMetadata: { key: 'value' },
        totalTokens: 200,
        totalMessages: 20,
        totalTurns: 10,
      };

      const mappedRecord = recordMapper(testRecord);

      expect(mappedRecord).toEqual({
        id: '2',
        title: null,
        userId: 2,
        createdAt: '2023-01-02T00:00:00Z',
        chatMetadata: { key: 'value' },
        totalTokens: 200,
        totalMessages: 20,
        totalTurns: 10,
      });
    });

    it('should handle selectForGrid errors', async () => {
      mockConsole.setup();
      (selectForGrid as jest.Mock).mockRejectedValue(new Error('Query failed'));

      const request = new NextRequest(
        'http://localhost:3000/api/ai/chat/history',
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal Server Error' });
    });

    it('should use default sort when no sort model provided', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/chat/history',
      );

      await GET(request);

      const selectForGridCall = (selectForGrid as jest.Mock).mock.calls[0][0];
      expect(selectForGridCall.defaultSort).toEqual([
        { field: 'created_at', sort: 'desc' },
      ]);
    });

    it('should return empty results gracefully', async () => {
      (selectForGrid as jest.Mock).mockResolvedValue({
        results: [],
        totalCount: 0,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/ai/chat/history',
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        results: [],
        totalCount: 0,
      });
    });
  });
});
