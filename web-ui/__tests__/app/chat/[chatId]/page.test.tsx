/* eslint-disable @typescript-eslint/no-explicit-any */
/* @jest-environment jsdom */

// Mock drizzle-orm functions specifically for this test - must be before imports
jest.mock('drizzle-orm', () => ({
  ...jest.requireActual('drizzle-orm'),
  eq: jest.fn((field, value) => ({ type: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ type: 'and', conditions })),
}));

import { render, screen } from '@/__tests__/test-utils';
import ChatDetailPage from '@/app/chat/[chatId]/page';
import { notFound } from 'next/navigation';

// import { mockChatDetails, mockEmptyChat } from '@/__tests__/components/chat.mock-data';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

// Mock the auth module
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

// Mock the drizzle database
const mockDbSelect = jest.fn();
const mockDbFrom = jest.fn();
const mockDbWhere = jest.fn();
const mockDbLimit = jest.fn();
const mockDbLeftJoin = jest.fn();
const mockDbOrderBy = jest.fn();

const mockDb = {
  select: mockDbSelect,
};

jest.mock('@/lib/drizzle-db', () => ({
  drizDbWithInit: jest.fn(),
}));

jest.mock('@/lib/drizzle-db/schema', () => { 
  const orig = jest.requireActual('@/lib/drizzle-db/schema');  
  return {
    schema: orig.schema
  };
});


jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ field, value, type: 'eq' })),
  asc: jest.fn((field) => ({ field, direction: 'asc' })),
  and: jest.fn((...conditions) => ({ type: 'and', conditions })),
}));

// Mock the VirtualizedChatDisplay component
jest.mock('@/components/chat', () => ({
  VirtualizedChatDisplay: ({ turns }: any) => (
    <div data-testid="virtualized-chat-display" data-turn-count={turns.length}>
      Virtualized Chat Display with {turns.length} turns
    </div>
  ),
}));

// Mock the EmailDashboardLayout component
jest.mock('@/components/email-message/dashboard-layout/email-dashboard-layout', () => ({
  EmailDashboardLayout: ({ children, session }: any) => (
    <div data-testid="email-dashboard-layout" data-session={JSON.stringify(session)}>
      {children}
    </div>
  ),
}));

import { drizDbWithInit } from '@/lib/drizzle-db';
import { auth } from '@/auth';

describe('Chat Detail Page', () => {
  const mockSession = {
    user: {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  beforeEach(() => {
    //jest.clearAllMocks();
    //(auth as jest.Mock).mockResolvedValue(mockSession);
    (drizDbWithInit as jest.Mock).mockResolvedValue(mockDb);
    
    // Setup default mock chain
    mockDbSelect.mockReturnValue({
      from: mockDbFrom,
    });
    mockDbFrom.mockReturnValue({
      where: mockDbWhere,
    });
    mockDbWhere.mockReturnValue({
      limit: mockDbLimit,
    });
    mockDbLimit.mockResolvedValue([{
      id: 'chat123',
      title: 'Test Chat Title',
      createdAt: '2025-01-01T10:00:00Z',
    }]);
  });

  it('should render chat detail page with chat data', async () => {
    // Mock the turns and messages query
    const mockTurnsQuery = {
      from: jest.fn().mockReturnValue({
        leftJoin: mockDbLeftJoin,
      }),
    };
    mockDbLeftJoin.mockReturnValue({
      where: jest.fn().mockReturnValue({
        orderBy: mockDbOrderBy,
      }),
    });
    mockDbOrderBy.mockResolvedValue([
      {
        turnId: 1,
        createdAt: '2025-01-01T10:00:00Z',
        completedAt: '2025-01-01T10:00:05Z',
        modelName: 'gpt-4',
        turnStatusId: 1,
        temperature: 0.7,
        topP: 0.9,
        latencyMs: 5000,
        warnings: ['Test warning'],
        errors: null,
        turnMetadata: { model_version: '4.0' },
        messageId: 1,
        role: 'user',
        content: 'Test message',
        messageOrder: 1,
        toolName: null,
        functionCall: null,
        messageStatusId: 1,
        providerId: 'test-provider',
        messageMetadata: null,
        toolInstanceId: null,
        optimizedContent: null,
      },
    ]);

    // Setup additional select call for turns query
    mockDbSelect.mockReturnValueOnce({
      from: mockDbFrom,
    }).mockReturnValueOnce(mockTurnsQuery);

    const params = Promise.resolve({ chatId: 'chat123' });
    const ChatDetailPageComponent = await ChatDetailPage({ params });
    
    render(ChatDetailPageComponent);
    
    expect(screen.getByText('Test Chat Title')).toBeInTheDocument();
    expect(screen.getByTestId('virtualized-chat-display')).toBeInTheDocument();
  });

  it('should call notFound for invalid chat ID', async () => {
    mockDbLimit.mockResolvedValue([]); // No chat found
    
    const params = Promise.resolve({ chatId: 'invalid-chat' });
    
    // notFound() throws an error in Next.js, so we need to catch it
    try {
      await ChatDetailPage({ params });
      // If we reach here, the test should fail
      expect(true).toBe(false);
    } catch (error: unknown) {
      // notFound() throws a special Next.js error
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('NEXT_NOT_FOUND');
    }
    
    expect(notFound).toHaveBeenCalled();
  });

  it('should handle chat with no turns', async () => {
    // Mock empty turns query
    const mockTurnsQuery = {
      from: jest.fn().mockReturnValue({
        leftJoin: mockDbLeftJoin,
      }),
    };
    mockDbLeftJoin.mockReturnValue({
      where: jest.fn().mockReturnValue({
        orderBy: mockDbOrderBy,
      }),
    });
    mockDbOrderBy.mockResolvedValue([]); // No turns

    mockDbSelect.mockReturnValueOnce({
      from: mockDbFrom,
    }).mockReturnValueOnce(mockTurnsQuery);

    const params = Promise.resolve({ chatId: 'empty-chat' });
    const ChatDetailPageComponent = await ChatDetailPage({ params });
    
    render(ChatDetailPageComponent);
    
    expect(screen.getByTestId('virtualized-chat-display')).toHaveAttribute('data-turn-count', '0');
  });

  it('should display chat creation date', async () => {
    const mockTurnsQuery = {
      from: jest.fn().mockReturnValue({
        leftJoin: mockDbLeftJoin,
      }),
    };
    mockDbLeftJoin.mockReturnValue({
      where: jest.fn().mockReturnValue({
        orderBy: mockDbOrderBy,
      }),
    });
    mockDbOrderBy.mockResolvedValue([]);

    mockDbSelect.mockReturnValueOnce({
      from: mockDbFrom,
    }).mockReturnValueOnce(mockTurnsQuery);

    const params = Promise.resolve({ chatId: 'chat123' });
    const ChatDetailPageComponent = await ChatDetailPage({ params });
    
    render(ChatDetailPageComponent);
    
    expect(screen.getByText(/Created: 1\/1\/2025, \d+:00:00 AM/)).toBeInTheDocument();
  });

  it('should format null chat title correctly', async () => {
    mockDbLimit.mockResolvedValue([{
      id: 'chat123',
      title: null,
      createdAt: '2025-01-01T10:00:00Z',
    }]);

    const mockTurnsQuery = {
      from: jest.fn().mockReturnValue({
        leftJoin: mockDbLeftJoin,
      }),
    };
    mockDbLeftJoin.mockReturnValue({
      where: jest.fn().mockReturnValue({
        orderBy: mockDbOrderBy,
      }),
    });
    mockDbOrderBy.mockResolvedValue([]);

    mockDbSelect.mockReturnValueOnce({
      from: mockDbFrom,
    }).mockReturnValueOnce(mockTurnsQuery);

    const params = Promise.resolve({ chatId: 'chat123' });
    const ChatDetailPageComponent = await ChatDetailPage({ params });
    
    render(ChatDetailPageComponent);
    
    expect(screen.getByText('Chat chat123')).toBeInTheDocument();
  });

  it('should handle database connection errors', async () => {
    (drizDbWithInit as jest.Mock).mockRejectedValue(new Error('Database connection failed'));
    
    const params = Promise.resolve({ chatId: 'chat123' });
    
    // Should throw the error
    await expect(ChatDetailPage({ params })).rejects.toThrow('Database connection failed');
  });

  it('should pass session to EmailDashboardLayout', async () => {
    
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(mockSession);
    
    const mockTurnsQuery = {
      from: jest.fn().mockReturnValue({
        leftJoin: mockDbLeftJoin,
      }),
    };
    mockDbLeftJoin.mockReturnValue({
      where: jest.fn().mockReturnValue({
        orderBy: mockDbOrderBy,
      }),
    });
    mockDbOrderBy.mockResolvedValue([]);

    mockDbSelect.mockReturnValueOnce({
      from: mockDbFrom,
    }).mockReturnValueOnce(mockTurnsQuery);

    const params = Promise.resolve({ chatId: 'chat123' });
    const ChatDetailPageComponent = await ChatDetailPage({ params });
    
    render(ChatDetailPageComponent);
    
    const layoutElement = screen.getByTestId('email-dashboard-layout');
    expect(layoutElement).toHaveAttribute('data-session', JSON.stringify(mockSession));
  });

  it('should group messages by turn correctly', async () => {
    // Mock multiple messages for the same turn
    const mockTurnsQuery = {
      from: jest.fn().mockReturnValue({
        leftJoin: mockDbLeftJoin,
      }),
    };
    mockDbLeftJoin.mockReturnValue({
      where: jest.fn().mockReturnValue({
        orderBy: mockDbOrderBy,
      }),
    });
    mockDbOrderBy.mockResolvedValue([
      {
        turnId: 1,
        createdAt: '2025-01-01T10:00:00Z',
        completedAt: '2025-01-01T10:00:05Z',
        modelName: 'gpt-4',
        turnStatusId: 1,
        temperature: 0.7,
        topP: 0.9,
        latencyMs: 5000,
        warnings: null,
        errors: null,
        turnMetadata: null,
        messageId: 1,
        role: 'user',
        content: 'First message',
        messageOrder: 1,
        toolName: null,
        functionCall: null,
        messageStatusId: 1,
        providerId: 'test-provider',
        messageMetadata: null,
        toolInstanceId: null,
        optimizedContent: null,
      },
      {
        turnId: 1,
        createdAt: '2025-01-01T10:00:00Z',
        completedAt: '2025-01-01T10:00:05Z',
        modelName: 'gpt-4',
        turnStatusId: 1,
        temperature: 0.7,
        topP: 0.9,
        latencyMs: 5000,
        warnings: null,
        errors: null,
        turnMetadata: null,
        messageId: 2,
        role: 'assistant',
        content: 'Second message',
        messageOrder: 2,
        toolName: null,
        functionCall: null,
        messageStatusId: 1,
        providerId: 'test-provider',
        messageMetadata: null,
        toolInstanceId: null,
        optimizedContent: null,
      },
    ]);

    mockDbSelect.mockReturnValueOnce({
      from: mockDbFrom,
    }).mockReturnValueOnce(mockTurnsQuery);

    const params = Promise.resolve({ chatId: 'chat123' });
    const ChatDetailPageComponent = await ChatDetailPage({ params });
    
    render(ChatDetailPageComponent);
    
    // Should group both messages into one turn
    expect(screen.getByTestId('virtualized-chat-display')).toHaveAttribute('data-turn-count', '1');
  });

  it('should call auth function', async () => {
    const mockTurnsQuery = {
      from: jest.fn().mockReturnValue({
        leftJoin: mockDbLeftJoin,
      }),
    };
    mockDbLeftJoin.mockReturnValue({
      where: jest.fn().mockReturnValue({
        orderBy: mockDbOrderBy,
      }),
    });
    mockDbOrderBy.mockResolvedValue([]);

    mockDbSelect.mockReturnValueOnce({
      from: mockDbFrom,
    }).mockReturnValueOnce(mockTurnsQuery);

    const params = Promise.resolve({ chatId: 'chat123' });
    await ChatDetailPage({ params });
    
    expect(auth).toHaveBeenCalled();
  });

  it('should handle turns without messages', async () => {
    // Mock turn data with null message fields
    const mockTurnsQuery = {
      from: jest.fn().mockReturnValue({
        leftJoin: mockDbLeftJoin,
      }),
    };
    mockDbLeftJoin.mockReturnValue({
      where: jest.fn().mockReturnValue({
        orderBy: mockDbOrderBy,
      }),
    });
    mockDbOrderBy.mockResolvedValue([
      {
        turnId: 1,
        createdAt: '2025-01-01T10:00:00Z',
        completedAt: '2025-01-01T10:00:05Z',
        modelName: 'gpt-4',
        turnStatusId: 1,
        temperature: 0.7,
        topP: 0.9,
        latencyMs: 5000,
        warnings: null,
        errors: null,
        turnMetadata: null,
        messageId: null, // No message
        role: null,
        content: null,
        messageOrder: null,
        toolName: null,
        functionCall: null,
        messageStatusId: null,
        providerId: null,
        messageMetadata: null,
        toolInstanceId: null,
        optimizedContent: null,
      },
    ]);

    mockDbSelect.mockReturnValueOnce({
      from: mockDbFrom,
    }).mockReturnValueOnce(mockTurnsQuery);

    const params = Promise.resolve({ chatId: 'chat123' });
    const ChatDetailPageComponent = await ChatDetailPage({ params });
    
    render(ChatDetailPageComponent);
    
    // Should still create the turn but with empty messages
    expect(screen.getByTestId('virtualized-chat-display')).toHaveAttribute('data-turn-count', '1');
  });
});
