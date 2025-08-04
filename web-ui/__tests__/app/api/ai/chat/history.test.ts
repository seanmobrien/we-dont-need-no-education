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
import { mockChatHistoryResponse } from '@/__tests__/components/chat.mock-data';

// Define mocks before they are used
const mockDbSelect = jest.fn();
const mockDbFrom = jest.fn();



// Mock modules
jest.mock('@/lib/drizzle-db', () => ({
  drizDbWithInit: jest.fn(),
}));

jest.mock('@/lib/drizzle-db/schema', () => ({
  schema: {
    chats: {
      id: 'id',
      title: 'title',
      userId: 'userId',
      createdAt: 'createdAt',
    },
  },
}));

jest.mock('@/lib/components/mui/data-grid/queryHelpers', () => ({
  selectForGrid: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  log: jest.fn(),
}));

jest.mock('@/lib/react-util', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn(),
  },
}));

// Import mocked dependencies
import { drizDbWithInit } from '@/lib/drizzle-db';
import { selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers';

describe('/api/ai/chat/history route', () => {
  const mockDb = {
    select: mockDbSelect,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock chain
    mockDbSelect.mockReturnValue({
      from: mockDbFrom,
    });
    mockDbFrom.mockReturnValue({});
    
    (drizDbWithInit as jest.Mock).mockResolvedValue(mockDb);
    (selectForGrid as jest.Mock).mockResolvedValue(mockChatHistoryResponse);
  });

  describe('GET', () => {
    it('should return chat history with pagination', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat/history?page=0&pageSize=10');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockChatHistoryResponse);
      expect(drizDbWithInit).toHaveBeenCalled();
      expect(mockDbSelect).toHaveBeenCalledWith({
        id: 'id',
        title: 'title',
        userId: 'userId',
        createdAt: 'createdAt',
      });
      expect(selectForGrid).toHaveBeenCalled();
    });

    it('should handle filtering and sorting parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat/history?page=0&pageSize=5&filterModel={"items":[{"field":"title","operator":"contains","value":"test"}]}&sortModel=[{"field":"created_at","sort":"asc"}]');
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(selectForGrid).toHaveBeenCalledWith({
        req: request,
        query: expect.any(Object),
        getColumn: expect.any(Function),
        columnMap: {
          id: 'id',
          title: 'title',
          userId: 'user_id',
          createdAt: 'created_at',
        },
        recordMapper: expect.any(Function),
        defaultSort: [{ field: 'created_at', sort: 'desc' }],
      });
    });

    it('should test column getter function', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat/history');
      
      await GET(request);
      
      const selectForGridCall = (selectForGrid as jest.Mock).mock.calls[0][0];
      const getColumn = selectForGridCall.getColumn;
      
      // Test column mapping
      expect(getColumn('id')).toBe('id');
      expect(getColumn('title')).toBe('title');
      expect(getColumn('user_id')).toBe('userId');
      expect(getColumn('created_at')).toBe('createdAt');
      expect(getColumn('invalid_column')).toBeUndefined();
    });

    it('should test record mapper function', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat/history');
      
      await GET(request);
      
      const selectForGridCall = (selectForGrid as jest.Mock).mock.calls[0][0];
      const recordMapper = selectForGridCall.recordMapper;
      
      const testRecord = {
        id: 'test-id',
        title: 'Test Title',
        userId: 123,
        createdAt: '2025-01-01T10:00:00Z',
      };
      
      const mappedRecord = recordMapper(testRecord);
      
      expect(mappedRecord).toEqual({
        id: 'test-id',
        title: 'Test Title',
        userId: 123,
        createdAt: '2025-01-01T10:00:00Z',
      });
    });

    it('should handle null title in record mapper', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat/history');
      
      await GET(request);
      
      const selectForGridCall = (selectForGrid as jest.Mock).mock.calls[0][0];
      const recordMapper = selectForGridCall.recordMapper;
      
      const testRecord = {
        id: 'test-id',
        title: null,
        userId: 123,
        createdAt: '2025-01-01T10:00:00Z',
      };
      
      const mappedRecord = recordMapper(testRecord);
      
      expect(mappedRecord).toEqual({
        id: 'test-id',
        title: null,
        userId: 123,
        createdAt: '2025-01-01T10:00:00Z',
      });
    });

    it('should handle database connection errors', async () => {
      (drizDbWithInit as jest.Mock).mockRejectedValue(new Error('Database connection failed'));
      
      const request = new NextRequest('http://localhost:3000/api/ai/chat/history');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal Server Error' });
    });

    it('should handle selectForGrid errors', async () => {
      (selectForGrid as jest.Mock).mockRejectedValue(new Error('Query failed'));
      
      const request = new NextRequest('http://localhost:3000/api/ai/chat/history');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal Server Error' });
    });

    it('should use default sort when no sort model provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat/history');
      
      await GET(request);
      
      const selectForGridCall = (selectForGrid as jest.Mock).mock.calls[0][0];
      expect(selectForGridCall.defaultSort).toEqual([{ field: 'created_at', sort: 'desc' }]);
    });

    it('should return empty results gracefully', async () => {
      (selectForGrid as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
        totalRowCount: 0,
      });
      
      const request = new NextRequest('http://localhost:3000/api/ai/chat/history');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        rows: [],
        rowCount: 0,
        totalRowCount: 0,
      });
    });
  });
});