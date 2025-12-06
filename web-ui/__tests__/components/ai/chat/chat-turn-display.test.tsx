import { render, screen, fireEvent, act } from '@/__tests__/test-utils';
import { ChatTurnDisplay } from '@/components/ai/chat/chat-turn-display';
import { mockChatTurn, mockChatTurnWithTool } from '../chat.mock-data';

// Mock ChatMessageDisplay component
jest.mock('@/components/ai/chat/chat-message-display', () => ({
  ChatMessageDisplay: ({ message, showMetadata }: any) => (
    <div
      data-testid={`message-${message.messageId}`}
      data-show-metadata={String(showMetadata)}
    >
      Message {message.messageId} - {message.role}: {message.content}
    </div>
  ),
}));

describe('ChatTurnDisplay', () => {
  it('should render turn header with basic information', () => {
    render(<ChatTurnDisplay turn={mockChatTurn} />);

    expect(screen.getByText('Turn 1')).toBeInTheDocument();
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
  });

  it('should render all messages in the turn', () => {
    render(<ChatTurnDisplay turn={mockChatTurn} />);

    // Should render both messages from mockChatTurn
    expect(screen.getByTestId('message-1')).toBeInTheDocument();
    expect(screen.getByTestId('message-2')).toBeInTheDocument();
  });

  it('should pass showMessageMetadata prop to ChatMessageDisplay', () => {
    render(<ChatTurnDisplay turn={mockChatTurn} showMessageMetadata={true} />);

    const messageElement = screen.getByTestId('message-1');
    expect(messageElement).toHaveAttribute('data-show-metadata', 'true');
  });

  it('should not show turn properties by default', () => {
    render(<ChatTurnDisplay turn={mockChatTurn} />);

    // Should not show temperature, latency, etc. by default
    expect(screen.queryByText(/Temperature:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Latency:/)).not.toBeInTheDocument();
  });

  it('should show turn properties when showTurnProperties is true and expanded', () => {
    render(<ChatTurnDisplay turn={mockChatTurn} showTurnProperties={true} />);

    // Need to click the settings icon to expand properties
    const settingsButton = screen.getByRole('button');
    fireEvent.click(settingsButton);

    // Should show turn properties section
    expect(screen.getByText(/Temperature:/)).toBeInTheDocument();
    expect(screen.getByText(/Top P:/)).toBeInTheDocument();
    expect(screen.getByText(/Latency:/)).toBeInTheDocument();
  });

  it('should display warnings when present', () => {
    render(<ChatTurnDisplay turn={mockChatTurn} showTurnProperties={true} />);

    // Need to click the settings icon to expand properties
    const settingsButton = screen.getByRole('button');
    fireEvent.click(settingsButton);

    // mockChatTurn has warnings
    expect(screen.getByText('Test warning')).toBeInTheDocument();
  });

  it('should display errors when present', () => {
    render(
      <ChatTurnDisplay turn={mockChatTurnWithTool} showTurnProperties={true} />,
    );

    // Need to click the settings icon to expand properties
    const settingsButton = screen.getByRole('button');
    fireEvent.click(settingsButton);

    // mockChatTurnWithTool has errors
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should format temperature correctly', () => {
    render(<ChatTurnDisplay turn={mockChatTurn} showTurnProperties={true} />);

    // Need to click the settings icon to expand properties
    const settingsButton = screen.getByRole('button');
    fireEvent.click(settingsButton);

    // Look for Temperature: 0.7 as it appears in the component
    expect(screen.getByText(/Temperature:.*0\.7/)).toBeInTheDocument();
  });

  it('should format top P correctly', () => {
    render(<ChatTurnDisplay turn={mockChatTurn} showTurnProperties={true} />);

    // Need to click the settings icon to expand properties
    const settingsButton = screen.getByRole('button');
    fireEvent.click(settingsButton);

    expect(screen.getByText(/Top P:.*0\.9/)).toBeInTheDocument();
  });

  it('should format latency in milliseconds', () => {
    render(<ChatTurnDisplay turn={mockChatTurn} showTurnProperties={true} />);

    // Latency should be visible in the header chips, not just in expanded properties
    expect(screen.getByText('5000ms')).toBeInTheDocument();
  });

  it('should handle null values gracefully', () => {
    const turnWithNulls = {
      ...mockChatTurn,
      temperature: null,
      topP: null,
      latencyMs: null,
      modelName: null,
      warnings: null,
      errors: null,
      metadata: null,
    };

    render(<ChatTurnDisplay turn={turnWithNulls} showTurnProperties={true} />);

    // Should render without crashing
    expect(screen.getByText('Turn 1')).toBeInTheDocument();
  });

  it('should show model name when available', () => {
    render(<ChatTurnDisplay turn={mockChatTurn} />);

    expect(screen.getByText('gpt-4')).toBeInTheDocument();
  });

  it('should handle turn without model name', () => {
    const turnWithoutModel = {
      ...mockChatTurn,
      modelName: null,
    };

    render(<ChatTurnDisplay turn={turnWithoutModel} />);

    expect(screen.getByText('Turn 1')).toBeInTheDocument();
    expect(screen.queryByText('gpt-4')).not.toBeInTheDocument();
  });

  it('should display metadata when available and properties are shown', () => {
    render(<ChatTurnDisplay turn={mockChatTurn} showTurnProperties={true} />);

    // Need to click the settings icon to expand properties
    const settingsButton = screen.getByRole('button');
    fireEvent.click(settingsButton);

    // mockChatTurn has metadata: { model_version: '4.0' }
    expect(screen.getByText(/model_version/)).toBeInTheDocument();
  });

  it('should format completion duration correctly', () => {
    render(<ChatTurnDisplay turn={mockChatTurn} showTurnProperties={true} />);

    // Need to click the settings icon to expand properties
    const settingsButton = screen.getByRole('button');
    fireEvent.click(settingsButton);

    // Should calculate duration between createdAt and completedAt
    // mockChatTurn: created at 10:00:00, completed at 10:00:05 = 5000ms
    expect(screen.getByText('5000ms')).toBeInTheDocument();
  });

  it('should handle incomplete turns', () => {
    const incompleteTurn = {
      ...mockChatTurn,
      completedAt: null,
    };

    render(<ChatTurnDisplay turn={incompleteTurn} showTurnProperties={true} />);

    // Need to click the settings icon to expand properties
    const settingsButton = screen.getByRole('button');
    fireEvent.click(settingsButton);

    expect(screen.getByText(/In\sprogress\.\.\./i)).toBeInTheDocument();
  });

  it('should expand and collapse properties section', () => {
    render(<ChatTurnDisplay turn={mockChatTurn} showTurnProperties={true} />);

    // Should have an expand button
    const settingsButton = screen.getByRole('button');
    expect(settingsButton).toBeInTheDocument();

    // Temperature should not be visible initially
    expect(screen.queryByText(/Temperature:/)).not.toBeVisible();

    // Click to expand
    act(() => fireEvent.click(settingsButton));
    expect(screen.getByText(/Temperature:/)).toBeVisible();
  });

  it('should render turn with multiple message types', () => {
    const mixedTurn = {
      ...mockChatTurn,
      messages: [
        mockChatTurn.messages[0], // user message
        mockChatTurn.messages[1], // assistant message
        {
          // tool message
          turnId: 1,
          messageId: 3,
          role: 'tool',
          content: 'Tool result',
          messageOrder: 3,
          toolName: 'test-tool',
          functionCall: null,
          statusId: 1,
          providerId: 'test-provider',
          metadata: null,
          toolInstanceId: null,
          optimizedContent: null,
        },
      ],
    };

    render(<ChatTurnDisplay turn={mixedTurn} />);

    expect(screen.getByTestId('message-1')).toBeInTheDocument();
    expect(screen.getByTestId('message-2')).toBeInTheDocument();
    expect(screen.getByTestId('message-3')).toBeInTheDocument();
  });

  it('should display proper timestamps', () => {
    render(<ChatTurnDisplay turn={mockChatTurn} showTurnProperties={true} />);

    // Need to click the settings icon to expand properties
    const settingsButton = screen.getByRole('button');
    fireEvent.click(settingsButton);

    // Should display formatted timestamps
    expect(screen.getByText(/Created:/)).toBeInTheDocument();
    expect(screen.getByText(/Completed:/)).toBeInTheDocument();
  });

  it('should handle empty messages array', () => {
    const emptyTurn = {
      ...mockChatTurn,
      messages: [],
    };

    render(<ChatTurnDisplay turn={emptyTurn} />);

    expect(screen.getByText('Turn 1')).toBeInTheDocument();
    // Should not crash when no messages present
  });

  it('should display status information when properties are shown', () => {
    render(<ChatTurnDisplay turn={mockChatTurn} showTurnProperties={true} />);

    // Need to click the settings icon to expand properties
    const settingsButton = screen.getByRole('button');
    fireEvent.click(settingsButton);

    // Should show status ID
    expect(screen.getByText(/Status ID:.*1/i)).toBeInTheDocument();
  });

  it('should handle warnings array properly', () => {
    const turnWithMultipleWarnings = {
      ...mockChatTurn,
      warnings: ['Warning 1', 'Warning 2', 'Warning 3'],
    };

    render(
      <ChatTurnDisplay
        turn={turnWithMultipleWarnings}
        showTurnProperties={true}
      />,
    );

    // Need to click the settings icon to expand properties
    const settingsButton = screen.getByRole('button');
    fireEvent.click(settingsButton);

    expect(screen.getByText('Warning 1')).toBeInTheDocument();
    expect(screen.getByText('Warning 2')).toBeInTheDocument();
    expect(screen.getByText('Warning 3')).toBeInTheDocument();
  });

  it('should handle errors array properly', () => {
    const turnWithMultipleErrors = {
      ...mockChatTurnWithTool,
      errors: ['Error 1', 'Error 2'],
    };

    render(
      <ChatTurnDisplay
        turn={turnWithMultipleErrors}
        showTurnProperties={true}
      />,
    );

    // Need to click the settings icon to expand properties
    const settingsButton = screen.getByRole('button');
    fireEvent.click(settingsButton);

    expect(screen.getByText('Error 1')).toBeInTheDocument();
    expect(screen.getByText('Error 2')).toBeInTheDocument();
  });
});
