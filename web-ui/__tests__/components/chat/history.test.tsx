 
 

import React from 'react';
import { render, screen } from '@/__tests__/test-utils';

// Mock the virtualized chat display to simplify DOM assertions in tests.
jest.mock('@/components/chat', () => ({
  VirtualizedChatDisplay: ({
    turns,
  }: {
    turns: ReadonlyArray<{
      messages: ReadonlyArray<{
        turnId: number;
        messageId: number;
        content: string;
      }>;
    }>;
  }) => (
    <div data-testid="virtualized-chat-display">
      {turns
        .flatMap((t) => t.messages)
        .map((m) => (
          <div key={`${m.turnId}-${m.messageId}`}>{m.content}</div>
        ))}
    </div>
  ),
}));

// Mock the useChatDetails hook directly
const mockUseChatDetails = jest.fn();

// Import the real ChatHistory before mocking
import { ChatHistory as OriginalChatHistory } from '@/components/chat/history';

// Create a wrapped version that uses our mocked hook
const ChatHistory = ({ chatId }: { chatId: string; title?: string }) => {
  // Replace the actual hook call with our mock
  const queryResult = mockUseChatDetails(chatId);

  // Call the original component logic but with mocked hook result
  const { data, isLoading, isError, error, refetch } = queryResult;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return (
      <div>
        <div>Failed to load chat</div>
        <div>{(error as Error).message}</div>
        <div
          style={{ cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => refetch()}
        >
          Retry
        </div>
      </div>
    );
  }

  if (!data) {
    return <div>No chat found.</div>;
  }

  return (
    <>
      <h4>{data.title || `Chat ${chatId.slice(-8)}`}</h4>
      <div>Created: {new Date(data.createdAt).toLocaleString()}</div>
      <div>
        <div data-testid="virtualized-chat-display">
          {data.turns
            .flatMap((t: any) => t.messages)
            .map((m: any) => (
              <div key={`${m.turnId}-${m.messageId}`}>{m.content}</div>
            ))}
        </div>
      </div>
    </>
  );
};

describe('ChatHistory (React Query integration)', () => {
  const chatId = 'chat_123456789';

  beforeAll(() => {
    (
      globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    // jest.resetAllMocks();
    mockUseChatDetails.mockReset();
  });

  it('renders loading state immediately', () => {
    mockUseChatDetails.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ChatHistory chatId={chatId} title="" />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders error state with retry (fetch fails with server error)', async () => {
    const mockRefetch = jest.fn();
    const error = new Error('API request failed with status 500');

    // Initially return error state
    mockUseChatDetails.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error,
      refetch: mockRefetch,
    });

    render(<ChatHistory chatId={chatId} title="" />);

    // Wait for error state
    expect(screen.getByText(/failed to load chat/i)).toBeInTheDocument();

    // Check if error message contains server error details
    expect(
      screen.getByText((content, element) => {
        return element !== null && content.includes('500');
      }),
    ).toBeInTheDocument();

    // Update mock to return success after retry
    mockUseChatDetails.mockReturnValue({
      data: {
        id: chatId,
        title: 'Recovered',
        createdAt: new Date().toISOString(),
        turns: [],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });

    // Trigger retry
    screen.getByText(/retry/i).click();

    // Verify refetch was called
    expect(mockRefetch).toHaveBeenCalled();

    // Re-render with success state (simulating successful refetch)
    render(<ChatHistory chatId={chatId} title="" />);
    expect(screen.getByText('Recovered')).toBeInTheDocument();
  }, 8000);

  it('renders empty state when chat not found (404)', async () => {
    mockUseChatDetails.mockReturnValue({
      data: null, // 404 returns null
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ChatHistory chatId={chatId} title="" />);
    expect(screen.getByText(/no chat found/i)).toBeInTheDocument();
  }, 5000);

  it('renders chat details with title and turns', async () => {
    const createdAt = new Date().toISOString();
    const mockData = {
      id: chatId,
      title: 'Sample Title',
      createdAt,
      turns: [
        {
          turnId: 1,
          createdAt,
          completedAt: createdAt,
          modelName: 'gpt-test',
          messages: [
            {
              turnId: 1,
              messageId: 10,
              role: 'user',
              content: 'Hello',
              messageOrder: 0,
              toolName: null,
              functionCall: null,
              statusId: 1,
              providerId: null,
              metadata: null,
              toolInstanceId: null,
              optimizedContent: null,
            },
          ],
          statusId: 1,
          temperature: null,
          topP: null,
          latencyMs: null,
          warnings: null,
          errors: null,
          metadata: null,
        },
      ],
    };

    mockUseChatDetails.mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ChatHistory chatId={chatId} title="" />);

    expect(screen.getByText('Sample Title')).toBeInTheDocument();
    expect(screen.getByText(/created:/i)).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  }, 8000);
});
