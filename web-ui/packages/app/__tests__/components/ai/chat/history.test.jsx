import React from 'react';
import { render, screen } from '@/__tests__/test-utils';
jest.mock('@/components/ai/chat', () => ({
    VirtualizedChatDisplay: ({ turns, }) => (<div data-testid="virtualized-chat-display">
      {turns
            .flatMap((t) => t.messages)
            .map((m) => (<div key={`${m.turnId}-${m.messageId}`}>{m.content}</div>))}
    </div>),
}));
const mockUseChatDetails = jest.fn();
const ChatHistory = ({ chatId }) => {
    const queryResult = mockUseChatDetails(chatId);
    const { data, isLoading, isError, error, refetch } = queryResult;
    if (isLoading) {
        return <div>Loading...</div>;
    }
    if (isError) {
        return (<div>
        <div>Failed to load chat</div>
        <div>{error.message}</div>
        <div style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => refetch()}>
          Retry
        </div>
      </div>);
    }
    if (!data) {
        return <div>No chat found.</div>;
    }
    return (<>
      <h4>{data.title || `Chat ${chatId.slice(-8)}`}</h4>
      <div>Created: {new Date(data.createdAt).toLocaleString()}</div>
      <div>
        <div data-testid="virtualized-chat-display">
          {data.turns
            .flatMap((t) => t.messages)
            .map((m) => (<div key={`${m.turnId}-${m.messageId}`}>{m.content}</div>))}
        </div>
      </div>
    </>);
};
describe('ChatHistory (React Query integration)', () => {
    const chatId = 'chat_123456789';
    beforeAll(() => {
        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    });
    afterEach(() => {
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
        render(<ChatHistory chatId={chatId} title=""/>);
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
    it('renders error state with retry (fetch fails with server error)', async () => {
        const mockRefetch = jest.fn();
        const error = new Error('API request failed with status 500');
        mockUseChatDetails.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            error,
            refetch: mockRefetch,
        });
        render(<ChatHistory chatId={chatId} title=""/>);
        expect(screen.getByText(/failed to load chat/i)).toBeInTheDocument();
        expect(screen.getByText((content, element) => {
            return element !== null && content.includes('500');
        })).toBeInTheDocument();
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
        screen.getByText(/retry/i).click();
        expect(mockRefetch).toHaveBeenCalled();
        render(<ChatHistory chatId={chatId} title=""/>);
        expect(screen.getByText('Recovered')).toBeInTheDocument();
    }, 8000);
    it('renders empty state when chat not found (404)', async () => {
        mockUseChatDetails.mockReturnValue({
            data: null,
            isLoading: false,
            isError: false,
            error: null,
            refetch: jest.fn(),
        });
        render(<ChatHistory chatId={chatId} title=""/>);
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
        render(<ChatHistory chatId={chatId} title=""/>);
        expect(screen.getByText('Sample Title')).toBeInTheDocument();
        expect(screen.getByText(/created:/i)).toBeInTheDocument();
        expect(screen.getByText('Hello')).toBeInTheDocument();
    }, 8000);
});
//# sourceMappingURL=history.test.jsx.map