import { render, screen, fireEvent } from '@/__tests__/test-utils';
import { VirtualizedChatDisplay } from '@/components/chat/virtualized-chat-display';
import { mockChatTurn, mockChatTurnWithTool, mockEmptyChat } from '../chat.mock-data';

// Mock the @tanstack/react-virtual library
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: jest.fn(),
}));

// Mock ChatTurnDisplay component
jest.mock('@/components/chat/chat-turn-display', () => ({
  ChatTurnDisplay: ({ turn, showTurnProperties, showMessageMetadata }: any) => {
    if (!turn) return null;
    return (
      <div data-testid={`turn-${turn.turnId}`} data-show-properties={showTurnProperties} data-show-metadata={showMessageMetadata}>
        Turn {turn.turnId} - {turn.modelName}
      </div>
    );
  },
}));

describe('VirtualizedChatDisplay', () => {
  const mockVirtualItem = {
    key: 'item-0',
    index: 0,
    start: 0,
    size: 200,
  };

  const mockRowVirtualizer = {
    getTotalSize: jest.fn(() => 400),
    getVirtualItems: jest.fn(() => [mockVirtualItem]),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { useVirtualizer } = jest.requireMock('@tanstack/react-virtual');
    useVirtualizer.mockReturnValue(mockRowVirtualizer);
    mockRowVirtualizer.getVirtualItems.mockReturnValue([mockVirtualItem]);
  });

  it('should render empty state when no turns provided', () => {
    render(<VirtualizedChatDisplay turns={[]} />);
    
    expect(screen.getByText('No messages found in this chat.')).toBeInTheDocument();
  });

  it('should render turn controls and virtualized content', () => {
    render(<VirtualizedChatDisplay turns={[mockChatTurn]} />);
    
    // Check controls are present
    expect(screen.getByLabelText(/Show Turn Properties/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Show Message Metadata/)).toBeInTheDocument();
    
    // Check that virtualizer was called with correct configuration
    const { useVirtualizer } = jest.requireMock('@tanstack/react-virtual');
    expect(useVirtualizer).toHaveBeenCalledWith({
      count: 1,
      getScrollElement: expect.any(Function),
      estimateSize: expect.any(Function),
      overscan: 2,
    });
  });

  it('should toggle turn properties switch', () => {
    render(<VirtualizedChatDisplay turns={[mockChatTurn]} />);
    
    const turnPropertiesSwitch = screen.getByLabelText(/Show Turn Properties/);
    expect(turnPropertiesSwitch).not.toBeChecked();
    
    fireEvent.click(turnPropertiesSwitch);
    
    // The switch should now be checked and passed to ChatTurnDisplay
    expect(turnPropertiesSwitch).toBeChecked();
  });

  it('should toggle message metadata switch', () => {
    render(<VirtualizedChatDisplay turns={[mockChatTurn]} />);
    
    const messageMetadataSwitch = screen.getByLabelText(/Show Message Metadata/);
    expect(messageMetadataSwitch).not.toBeChecked();
    
    fireEvent.click(messageMetadataSwitch);
    
    expect(messageMetadataSwitch).toBeChecked();
  });

  it('should pass correct props to ChatTurnDisplay', () => {
    mockRowVirtualizer.getVirtualItems.mockReturnValue([
      { ...mockVirtualItem, index: 0 },
    ]);
    
    render(<VirtualizedChatDisplay turns={[mockChatTurn]} />);
    
    const turnElement = screen.getByTestId('turn-1');
    expect(turnElement).toHaveAttribute('data-show-properties', 'false');
    expect(turnElement).toHaveAttribute('data-show-metadata', 'false');
  });

  it('should pass switched props to ChatTurnDisplay when toggles are enabled', () => {
    mockRowVirtualizer.getVirtualItems.mockReturnValue([
      { ...mockVirtualItem, index: 0 },
    ]);
    
    render(<VirtualizedChatDisplay turns={[mockChatTurn]} />);
    
    // Enable both toggles
    fireEvent.click(screen.getByLabelText(/Show Turn Properties/));
    fireEvent.click(screen.getByLabelText(/Show Message Metadata/));
    
    const turnElement = screen.getByTestId('turn-1');
    expect(turnElement).toHaveAttribute('data-show-properties', 'true');
    expect(turnElement).toHaveAttribute('data-show-metadata', 'true');
  });

  it('should handle multiple turns', () => {
    const turns = [mockChatTurn, mockChatTurnWithTool];
    mockRowVirtualizer.getVirtualItems.mockReturnValue([
      { ...mockVirtualItem, index: 0, key: 'item-0' },
      { ...mockVirtualItem, index: 1, key: 'item-1', start: 200 },
    ]);
    
    render(<VirtualizedChatDisplay turns={turns} />);
    
    const { useVirtualizer } = jest.requireMock('@tanstack/react-virtual');
    expect(useVirtualizer).toHaveBeenCalledWith({
      count: 2,
      getScrollElement: expect.any(Function),
      estimateSize: expect.any(Function),
      overscan: 2,
    });
  });

  it('should use custom height when provided', () => {
    render(<VirtualizedChatDisplay turns={[mockChatTurn]} height={800} />);
    
    // Check that the component renders with custom height
    expect(screen.getByTestId('turn-1')).toBeInTheDocument();
  });

  it('should test size estimation logic', () => {
    const turns = [mockChatTurn, mockChatTurnWithTool];
    render(<VirtualizedChatDisplay turns={turns} />);
    
    // Get the estimateSize function from the useVirtualizer call
    const virtualizerCall = jest.requireMock('@tanstack/react-virtual').useVirtualizer.mock.calls[0][0];
    const estimateSize = virtualizerCall.estimateSize;
    
    // Test size estimation for a turn
    const estimatedSize = estimateSize(0);
    expect(typeof estimatedSize).toBe('number');
    expect(estimatedSize).toBeGreaterThan(0);
    expect(estimatedSize).toBeLessThanOrEqual(1000); // Should be capped at 1000
  });

  it('should test size estimation with turn properties enabled', () => {
    const turns = [mockChatTurnWithTool]; // Has warnings and errors
    render(<VirtualizedChatDisplay turns={turns} />);
    
    // Enable turn properties
    fireEvent.click(screen.getByLabelText(/Show Turn Properties/));
    
    const virtualizerCall = jest.requireMock('@tanstack/react-virtual').useVirtualizer.mock.calls[0][0];
    const estimateSize = virtualizerCall.estimateSize;
    
    const estimatedSize = estimateSize(0);
    expect(estimatedSize).toBeGreaterThan(0);
  });

  it('should handle invalid turn index in size estimation', () => {
    render(<VirtualizedChatDisplay turns={[mockChatTurn]} />);
    
    const virtualizerCall = jest.requireMock('@tanstack/react-virtual').useVirtualizer.mock.calls[0][0];
    const estimateSize = virtualizerCall.estimateSize;
    
    // Test with invalid index
    const estimatedSize = estimateSize(999);
    expect(estimatedSize).toBe(200); // Should return default fallback
  });

  it('should calculate correct size for messages with content', () => {
    const turnWithLongContent = {
      ...mockChatTurn,
      messages: [{
        ...mockChatTurn.messages[0],
        content: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5',
      }],
    };
    
    render(<VirtualizedChatDisplay turns={[turnWithLongContent]} />);
    
    const virtualizerCall = jest.requireMock('@tanstack/react-virtual').useVirtualizer.mock.calls[0][0];
    const estimateSize = virtualizerCall.estimateSize;
    
    const estimatedSize = estimateSize(0);
    expect(estimatedSize).toBeGreaterThan(200); // Should be larger due to content
  });

  it('should apply correct styling to virtual items', () => {
    const virtualItem = {
      key: 'item-0',
      index: 0,
      start: 100,
      size: 200,
    };
    
    mockRowVirtualizer.getVirtualItems.mockReturnValue([virtualItem]);
    
    render(<VirtualizedChatDisplay turns={[mockChatTurn]} />);
    
    // Check that the virtual item has correct transform style
    const virtualizedItem = screen.getByTestId('turn-1').parentElement;
    expect(virtualizedItem).toHaveStyle('transform: translateY(100px)');
  });

  it('should render both empty state and virtualized content when appropriate', () => {
    // First render with empty turns
    const { rerender } = render(<VirtualizedChatDisplay turns={[]} />);
    expect(screen.getByText('No messages found in this chat.')).toBeInTheDocument();
    
    // Then rerender with turns
    rerender(<VirtualizedChatDisplay turns={[mockChatTurn]} />);
    expect(screen.queryByText('No messages found in this chat.')).not.toBeInTheDocument();
  });
});