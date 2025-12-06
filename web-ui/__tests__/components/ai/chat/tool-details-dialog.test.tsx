import { render, screen, fireEvent } from '@/__tests__/test-utils';
import { ToolDetailsDialog } from '@/components/ai/chat/tool-details-dialog';
import { mockToolMessage } from '../chat.mock-data';

describe('ToolDetailsDialog', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('should not render when open is false', () => {
    render(
      <ToolDetailsDialog
        open={false}
        onClose={mockOnClose}
        message={mockToolMessage}
      />,
    );

    expect(
      screen.queryByRole('dialog', { name: /tool details/i }),
    ).not.toBeInTheDocument();
  });

  it('should render when open is true', () => {
    render(
      <ToolDetailsDialog
        open={true}
        onClose={mockOnClose}
        message={mockToolMessage}
      />,
    );

    expect(screen.getByText(/Tool Details:/)).toBeInTheDocument();
    expect(screen.getByText('test-tool')).toBeInTheDocument();
  });

  it('should display input parameters section', () => {
    render(
      <ToolDetailsDialog
        open={true}
        onClose={mockOnClose}
        message={mockToolMessage}
      />,
    );

    expect(screen.getByText('Input Parameters')).toBeInTheDocument();
  });

  it('should display return value section', () => {
    render(
      <ToolDetailsDialog
        open={true}
        onClose={mockOnClose}
        message={mockToolMessage}
      />,
    );

    expect(screen.getByText('Return Value')).toBeInTheDocument();
  });

  it('should display function call data', () => {
    render(
      <ToolDetailsDialog
        open={true}
        onClose={mockOnClose}
        message={mockToolMessage}
      />,
    );

    // The function call object keys should be visible
    expect(screen.getByText('function:')).toBeInTheDocument();
    expect(screen.getByText('args:')).toBeInTheDocument();
  });

  it('should display tool result data', () => {
    render(
      <ToolDetailsDialog
        open={true}
        onClose={mockOnClose}
        message={mockToolMessage}
      />,
    );

    // The tool result object keys should be visible
    expect(screen.getByText('status:')).toBeInTheDocument();
    expect(screen.getByText('data:')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <ToolDetailsDialog
        open={true}
        onClose={mockOnClose}
        message={mockToolMessage}
      />,
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should handle message with no functionCall', () => {
    const messageWithoutFunctionCall = {
      ...mockToolMessage,
      functionCall: null,
    };

    render(
      <ToolDetailsDialog
        open={true}
        onClose={mockOnClose}
        message={messageWithoutFunctionCall}
      />,
    );

    expect(
      screen.getByText(/no input parameters recorded/i),
    ).toBeInTheDocument();
  });

  it('should handle message with no toolResult', () => {
    const messageWithoutToolResult = {
      ...mockToolMessage,
      toolResult: null,
    };

    render(
      <ToolDetailsDialog
        open={true}
        onClose={mockOnClose}
        message={messageWithoutToolResult}
      />,
    );

    expect(screen.getByText(/no return value recorded/i)).toBeInTheDocument();
  });

  it('should display primitive values inline', () => {
    const messageWithPrimitives = {
      ...mockToolMessage,
      toolResult: { count: 42 },
    };

    render(
      <ToolDetailsDialog
        open={true}
        onClose={mockOnClose}
        message={messageWithPrimitives}
      />,
    );

    // Primitive number should be displayed inline
    expect(screen.getByText(/count:/)).toBeInTheDocument();
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it('should handle tool name display', () => {
    render(
      <ToolDetailsDialog
        open={true}
        onClose={mockOnClose}
        message={mockToolMessage}
      />,
    );

    expect(screen.getByText('test-tool')).toBeInTheDocument();
  });

  it('should handle message with no tool name', () => {
    const messageWithoutToolName = {
      ...mockToolMessage,
      toolName: null,
    };

    render(
      <ToolDetailsDialog
        open={true}
        onClose={mockOnClose}
        message={messageWithoutToolName}
      />,
    );

    expect(screen.getByText('Unknown Tool')).toBeInTheDocument();
  });
});
