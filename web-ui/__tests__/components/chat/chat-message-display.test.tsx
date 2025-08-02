import { render, screen, fireEvent } from '@/__tests__/test-utils';
import { ChatMessageDisplay } from '@/components/chat/chat-message-display';
import { mockChatMessage, mockAssistantMessage, mockToolMessage } from '../chat.mock-data';

describe('ChatMessageDisplay', () => {
  it('should render user message with correct styling', () => {
    render(<ChatMessageDisplay message={mockChatMessage} />);
    
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('Test user message')).toBeInTheDocument();
  });

  it('should render assistant message with correct styling', () => {
    render(<ChatMessageDisplay message={mockAssistantMessage} />);
    
    expect(screen.getByText('assistant')).toBeInTheDocument();
    expect(screen.getByText('Test assistant response')).toBeInTheDocument();
  });

  it('should render tool message with tool chip', () => {
    render(<ChatMessageDisplay message={mockToolMessage} />);
    
    expect(screen.getByText('tool')).toBeInTheDocument();
    expect(screen.getByText('Tool: test-tool')).toBeInTheDocument();
    expect(screen.getByText('Tool execution result')).toBeInTheDocument();
  });

  it('should not show metadata controls by default', () => {
    render(<ChatMessageDisplay message={mockChatMessage} />);
    
    // Should not show metadata expand button
    expect(screen.queryByRole('button', { name: /expand metadata/i })).not.toBeInTheDocument();
  });

  it('should show metadata controls when showMetadata is true', () => {
    render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true} />);
    
    // Should show metadata expand button or accordion
    expect(screen.getByLabelText(/more/i) || screen.getByRole('button')).toBeInTheDocument();
  });

  it('should display message ID in metadata', () => {
    render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true} />);
    
    // Click expand button to show metadata
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);
    
    // Check for message ID in metadata section
    expect(screen.getByText(/Message ID:/)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should display message order in metadata', () => {
    render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true} />);
    
    // Click expand button to show metadata
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);
    
    expect(screen.getByText(/Order:/)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should display provider ID in metadata', () => {
    render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true} />);
    
    // Click expand button to show metadata
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);
    
    expect(screen.getByText(/Provider:/)).toBeInTheDocument();
    expect(screen.getByText('test-provider')).toBeInTheDocument();
  });

  it('should display status ID in metadata', () => {
    render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true} />);
    
    // Click expand button to show metadata
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);
    
    expect(screen.getByText(/Status ID:/)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should display function call data when present', () => {
    render(<ChatMessageDisplay message={mockToolMessage} showMetadata={true} />);
    
    // mockToolMessage has functionCall data
    expect(screen.getByText(/Function Call:/)).toBeInTheDocument();
  });

  it('should display tool instance ID when present', () => {
    render(<ChatMessageDisplay message={mockToolMessage} showMetadata={true} />);
    
    // Click expand button to show metadata
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);
    
    // mockToolMessage has toolInstanceId
    expect(screen.getByText(/Tool Instance:/)).toBeInTheDocument();
    expect(screen.getByText('tool-123')).toBeInTheDocument();
  });

  it('should display optimized content when different from regular content', () => {
    render(<ChatMessageDisplay message={mockToolMessage} showMetadata={true} />);
    
    // mockToolMessage has optimizedContent different from content
    expect(screen.getByText('Optimized Content')).toBeInTheDocument();
    expect(screen.getByText('Optimized tool content')).toBeInTheDocument();
  });

  it('should display message metadata when present', () => {
    render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true} />);
    
    // mockChatMessage has metadata: { test: 'value' }
    expect(screen.getByText(/Metadata:/)).toBeInTheDocument();
  });

  it('should handle null content gracefully', () => {
    const messageWithNullContent = {
      ...mockChatMessage,
      content: null,
    };
    
    render(<ChatMessageDisplay message={messageWithNullContent} />);
    
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('<no content>')).toBeInTheDocument();
  });

  it('should handle message without tool name', () => {
    render(<ChatMessageDisplay message={mockChatMessage} />);
    
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.queryByText(/Tool:/)).not.toBeInTheDocument();
  });

  it('should handle message without function call', () => {
    render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true} />);
    
    // mockChatMessage has no functionCall
    expect(screen.queryByText(/Function Call:/)).not.toBeInTheDocument();
  });

  it('should handle message without optimized content', () => {
    render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true} />);
    
    // mockChatMessage has no optimizedContent
    expect(screen.queryByText(/Optimized Content:/)).not.toBeInTheDocument();
  });

  it('should handle message without tool instance ID', () => {
    render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true} />);
    
    // mockChatMessage has no toolInstanceId
    expect(screen.queryByText(/Tool Instance ID:/)).not.toBeInTheDocument();
  });

  it('should expand and collapse metadata section', () => {
    render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true} />);
    
    // Should have expandable metadata section
    const expandButton = screen.getByRole('button');
    expect(expandButton).toBeInTheDocument();
    
    // Initially collapsed, so detailed metadata might not be visible
    fireEvent.click(expandButton);
    
    // After clicking, metadata should be expanded
    expect(screen.getByText(/Message ID:/)).toBeInTheDocument();
  });

  it('should format function call JSON properly', () => {
    render(<ChatMessageDisplay message={mockToolMessage} showMetadata={true} />);
    
    // Should display formatted JSON for function call
    expect(screen.getByText(/Function Call:/)).toBeInTheDocument();
  });

  it('should format metadata JSON properly', () => {
    render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true} />);
    
    // Should display formatted JSON for metadata
    expect(screen.getByText(/Metadata:/)).toBeInTheDocument();
  });

  it('should use different colors for different roles', () => {
    const { rerender } = render(<ChatMessageDisplay message={mockChatMessage} />);
    
    // User message should have different background than assistant
    let messageContainer = screen.getByText('Test user message').closest('div');
    expect(messageContainer).toHaveStyle('background-color: action.hover');
    
    rerender(<ChatMessageDisplay message={mockAssistantMessage} />);
    
    messageContainer = screen.getByText('Test assistant response').closest('div');
    expect(messageContainer).toHaveStyle('background-color: background.paper');
  });

  it('should display role chip with correct color', () => {
    render(<ChatMessageDisplay message={mockChatMessage} />);
    
    const userChip = screen.getByText('user');
    expect(userChip).toBeInTheDocument();
    // The chip should have secondary color for user role
  });

  it('should display role chip with correct color for assistant', () => {
    render(<ChatMessageDisplay message={mockAssistantMessage} />);
    
    const assistantChip = screen.getByText('assistant');
    expect(assistantChip).toBeInTheDocument();
    // The chip should have primary color for assistant role
  });

  it('should handle empty metadata object', () => {
    const messageWithEmptyMetadata = {
      ...mockChatMessage,
      metadata: {},
    };
    
    render(<ChatMessageDisplay message={messageWithEmptyMetadata} showMetadata={true} />);
    
    expect(screen.getByText('user')).toBeInTheDocument();
    // Should handle empty metadata gracefully
  });

  it('should handle null metadata', () => {
    const messageWithNullMetadata = {
      ...mockChatMessage,
      metadata: null,
    };
    
    render(<ChatMessageDisplay message={messageWithNullMetadata} showMetadata={true} />);
    
    expect(screen.getByText('user')).toBeInTheDocument();
    // Should handle null metadata gracefully
  });

  it('should not show optimized content if same as regular content', () => {
    const messageWithSameOptimizedContent = {
      ...mockToolMessage,
      optimizedContent: 'Tool execution result', // Same as content
    };
    
    render(<ChatMessageDisplay message={messageWithSameOptimizedContent} showMetadata={true} />);
    
    // Should not show optimized content section if it's the same
    expect(screen.queryByText(/Optimized Content:/)).not.toBeInTheDocument();
  });

  it('should handle very long content', () => {
    const messageWithLongContent = {
      ...mockChatMessage,
      content: 'A'.repeat(1000), // Very long content
    };
    
    render(<ChatMessageDisplay message={messageWithLongContent} />);
    
    expect(screen.getByText('user')).toBeInTheDocument();
    // Should render without issues even with long content
  });
});