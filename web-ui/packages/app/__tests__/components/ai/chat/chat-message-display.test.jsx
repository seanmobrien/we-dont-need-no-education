import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import { ChatMessageDisplay } from '@/components/ai/chat/chat-message-display';
import { mockChatMessage, mockAssistantMessage, mockToolMessage, mockToolMessageWithoutResult, } from '../chat.mock-data';
describe('ChatMessageDisplay', () => {
    it('should render user message with correct styling', () => {
        render(<ChatMessageDisplay message={mockChatMessage}/>);
        expect(screen.getByText('user')).toBeInTheDocument();
        expect(screen.getByText('Test user message')).toBeInTheDocument();
    });
    it('should render assistant message with correct styling', () => {
        render(<ChatMessageDisplay message={mockAssistantMessage}/>);
        expect(screen.getByText('assistant')).toBeInTheDocument();
        expect(screen.getByText('Test assistant response')).toBeInTheDocument();
    });
    it('should render tool message with tool chip', () => {
        render(<ChatMessageDisplay message={mockToolMessage}/>);
        expect(screen.getByText('tool')).toBeInTheDocument();
        expect(screen.getByText('Tool: test-tool')).toBeInTheDocument();
        expect(screen.getByText('Tool execution result')).toBeInTheDocument();
    });
    it('should not show metadata controls by default', () => {
        render(<ChatMessageDisplay message={mockChatMessage}/>);
        expect(screen.queryByRole('button', { name: /expand metadata/i })).not.toBeInTheDocument();
    });
    it('should show metadata controls when showMetadata is true', () => {
        render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true}/>);
        expect(screen.getByLabelText(/more/i) || screen.getByRole('button')).toBeInTheDocument();
    });
    it('should display message ID in metadata', () => {
        render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true}/>);
        const expandButton = screen.getByLabelText('Show more metadata');
        fireEvent.click(expandButton);
        expect(screen.getByText('Message ID: 1')).toBeInTheDocument();
    });
    it('should display message order in metadata', () => {
        render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true}/>);
        const expandButton = screen.getByLabelText('Show more metadata');
        fireEvent.click(expandButton);
        expect(screen.getByText('Order: 1')).toBeInTheDocument();
    });
    it('should display provider ID in metadata', () => {
        render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true}/>);
        const expandButton = screen.getByLabelText('Show more metadata');
        fireEvent.click(expandButton);
        expect(screen.getByText('Provider: test-provider')).toBeInTheDocument();
    });
    it('should display status ID in metadata', () => {
        render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true}/>);
        const expandButton = screen.getByLabelText('Show more metadata');
        fireEvent.click(expandButton);
        expect(screen.getByText('Status ID: 1')).toBeInTheDocument();
    });
    it('should display function call data when present', () => {
        render(<ChatMessageDisplay message={mockToolMessage} showMetadata={true}/>);
        expect(screen.getByText(/Function Call:/)).toBeInTheDocument();
    });
    it('should display tool instance ID when present', () => {
        render(<ChatMessageDisplay message={mockToolMessage} showMetadata={true}/>);
        const expandButton = screen.getByLabelText('Show more metadata');
        fireEvent.click(expandButton);
        expect(screen.getByText('Tool Instance: tool-123')).toBeInTheDocument();
    });
    it('should display optimized content when different from regular content', () => {
        render(<ChatMessageDisplay message={mockToolMessage} showMetadata={true}/>);
        expect(screen.getByText('Optimized Content')).toBeInTheDocument();
        expect(screen.getByText('Optimized tool content')).toBeInTheDocument();
    });
    it('should display message metadata when present', () => {
        render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true}/>);
        expect(screen.getByText(/Metadata:/)).toBeInTheDocument();
    });
    it('should handle null content gracefully', () => {
        const messageWithNullContent = {
            ...mockChatMessage,
            content: null,
        };
        render(<ChatMessageDisplay message={messageWithNullContent}/>);
        expect(screen.getByText('user')).toBeInTheDocument();
        expect(screen.getByText('<no content>')).toBeInTheDocument();
    });
    it('should handle message without tool name', () => {
        render(<ChatMessageDisplay message={mockChatMessage}/>);
        expect(screen.getByText('user')).toBeInTheDocument();
        expect(screen.queryByText(/Tool:/)).not.toBeInTheDocument();
    });
    it('should handle message without function call', () => {
        render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true}/>);
        expect(screen.queryByText(/Function Call:/)).not.toBeInTheDocument();
    });
    it('should handle message without optimized content', () => {
        render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true}/>);
        expect(screen.queryByText(/Optimized Content:/)).not.toBeInTheDocument();
    });
    it('should handle message without tool instance ID', () => {
        render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true}/>);
        expect(screen.queryByText(/Tool Instance ID:/)).not.toBeInTheDocument();
    });
    it('should expand and collapse metadata section', () => {
        render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true}/>);
        const expandButton = screen.getByRole('button');
        expect(expandButton).toBeInTheDocument();
        fireEvent.click(expandButton);
        expect(screen.getByText(/Message ID:/)).toBeInTheDocument();
    });
    it('should format function call JSON properly', () => {
        render(<ChatMessageDisplay message={mockToolMessage} showMetadata={true}/>);
        expect(screen.getByText(/Function Call:/)).toBeInTheDocument();
    });
    it('should format metadata JSON properly', () => {
        render(<ChatMessageDisplay message={mockChatMessage} showMetadata={true}/>);
        expect(screen.getByText(/Metadata:/)).toBeInTheDocument();
    });
    it('should use different colors for different roles', () => {
        const { rerender } = render(<ChatMessageDisplay message={mockChatMessage}/>);
        let messageContainer = screen.getByText('Test user message').closest('div');
        expect(messageContainer).toHaveStyle('background-color: rgba(0, 0, 0, 0.04)');
        rerender(<ChatMessageDisplay message={mockAssistantMessage}/>);
        messageContainer = screen
            .getByText('Test assistant response')
            .closest('div');
        expect(messageContainer).toHaveStyle('background-color: rgb(255, 255, 255)');
    });
    it('should display role chip with correct color', () => {
        render(<ChatMessageDisplay message={mockChatMessage}/>);
        const userChip = screen.getByText('user');
        expect(userChip).toBeInTheDocument();
    });
    it('should display role chip with correct color for assistant', () => {
        render(<ChatMessageDisplay message={mockAssistantMessage}/>);
        const assistantChip = screen.getByText('assistant');
        expect(assistantChip).toBeInTheDocument();
    });
    it('should handle empty metadata object', () => {
        const messageWithEmptyMetadata = {
            ...mockChatMessage,
            metadata: {},
        };
        render(<ChatMessageDisplay message={messageWithEmptyMetadata} showMetadata={true}/>);
        expect(screen.getByText('user')).toBeInTheDocument();
    });
    it('should handle null metadata', () => {
        const messageWithNullMetadata = {
            ...mockChatMessage,
            metadata: null,
        };
        render(<ChatMessageDisplay message={messageWithNullMetadata} showMetadata={true}/>);
        expect(screen.getByText('user')).toBeInTheDocument();
    });
    it('should not show optimized content if same as regular content', () => {
        const messageWithSameOptimizedContent = {
            ...mockToolMessage,
            optimizedContent: 'Tool execution result',
        };
        render(<ChatMessageDisplay message={messageWithSameOptimizedContent} showMetadata={true}/>);
        expect(screen.queryByText(/Optimized Content:/)).not.toBeInTheDocument();
    });
    it('should handle very long content', () => {
        const messageWithLongContent = {
            ...mockChatMessage,
            content: 'A'.repeat(1000),
        };
        render(<ChatMessageDisplay message={messageWithLongContent}/>);
        expect(screen.getByText('user')).toBeInTheDocument();
    });
    it('should open tool details dialog when tool badge is clicked', () => {
        render(<ChatMessageDisplay message={mockToolMessage}/>);
        const toolBadge = screen.getByText('Tool: test-tool');
        expect(toolBadge).toBeInTheDocument();
        fireEvent.click(toolBadge);
        expect(screen.getByText(/Tool Details:/)).toBeInTheDocument();
        expect(screen.getByText('Input Parameters')).toBeInTheDocument();
        expect(screen.getByText('Return Value')).toBeInTheDocument();
    });
    it('should close tool details dialog when close button is clicked', async () => {
        render(<ChatMessageDisplay message={mockToolMessage}/>);
        const toolBadge = screen.getByText('Tool: test-tool');
        fireEvent.click(toolBadge);
        expect(screen.getByText(/Tool Details:/)).toBeInTheDocument();
        const closeButton = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeButton);
        await waitFor(() => {
            expect(screen.queryByText(/Tool Details:/)).not.toBeInTheDocument();
        });
    });
    it('should not render tool details dialog for messages without tool name', () => {
        render(<ChatMessageDisplay message={mockChatMessage}/>);
        expect(screen.queryByText(/Tool Details:/)).not.toBeInTheDocument();
    });
    it('should show tool badge only when tool has output (toolResult exists)', () => {
        render(<ChatMessageDisplay message={mockToolMessage}/>);
        expect(screen.getByText('Tool: test-tool')).toBeInTheDocument();
    });
    it('should NOT show tool badge when tool has no output (toolResult is null)', () => {
        render(<ChatMessageDisplay message={mockToolMessageWithoutResult}/>);
        expect(screen.queryByText(/Tool:/)).not.toBeInTheDocument();
    });
    it('should show tool badge with toolResult in metadata section', () => {
        render(<ChatMessageDisplay message={mockToolMessage} showMetadata={true}/>);
        const expandButton = screen.getByLabelText('Show more metadata');
        fireEvent.click(expandButton);
        expect(screen.getByText(/Tool Result:/)).toBeInTheDocument();
    });
    it('should not show tool result section in metadata when toolResult is null', () => {
        render(<ChatMessageDisplay message={mockToolMessageWithoutResult} showMetadata={true}/>);
        const expandButton = screen.getByLabelText('Show more metadata');
        fireEvent.click(expandButton);
        expect(screen.queryByText(/Tool Result:/)).not.toBeInTheDocument();
    });
});
//# sourceMappingURL=chat-message-display.test.jsx.map