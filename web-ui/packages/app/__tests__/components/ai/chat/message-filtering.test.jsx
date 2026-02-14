import React from 'react';
import { render, screen, fireEvent, act, waitFor, } from '@/__tests__/test-utils';
import '@testing-library/jest-dom';
import { TestVirtualizedChat } from '@/components/ai/chat/test-virtualized-chat';
jest.mock('@/components/ai/chat/virtualized-chat-display', () => ({
    VirtualizedChatDisplay: ({ turns }) => (<div data-testid="virtualized-chat">
      {turns.map((turn, i) => (<div key={turn.turnId ?? i}/>))}
    </div>),
}));
describe('Message Filtering', () => {
    beforeEach(() => {
        global.ResizeObserver = jest.fn().mockImplementation(() => ({
            observe: jest.fn(),
            unobserve: jest.fn(),
            disconnect: jest.fn(),
        }));
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    it('renders filter controls and badges correctly', async () => {
        await act(async () => {
            render(<TestVirtualizedChat />);
        });
        await waitFor(() => {
            expect(screen.getByText('Message Filters')).toBeInTheDocument();
        });
        expect(screen.getByLabelText('Enable Filtering')).toBeInTheDocument();
        expect(screen.getByLabelText('Enable Filtering')).not.toBeChecked();
    });
    it('shows filter options when filtering is enabled', async () => {
        await act(async () => {
            render(<TestVirtualizedChat />);
        });
        await waitFor(() => {
            expect(screen.getByText('Message Filters')).toBeInTheDocument();
        });
        const enableSwitch = screen.getByLabelText('Enable Filtering');
        await act(async () => {
            fireEvent.click(enableSwitch);
        });
        await waitFor(() => {
            expect(screen.getByText('Filter Mode:')).toBeInTheDocument();
        });
        expect(screen.getByText('Single Turn')).toBeInTheDocument();
        expect(screen.getByText('Entire Chat')).toBeInTheDocument();
        expect(screen.getByText('Show messages of type:')).toBeInTheDocument();
        expect(screen.getByText('assistant')).toBeInTheDocument();
        expect(screen.getByText('system')).toBeInTheDocument();
        expect(screen.getByText('tool')).toBeInTheDocument();
        expect(screen.getByText('user')).toBeInTheDocument();
    });
    it('displays correct message counts in badges', async () => {
        await act(async () => {
            render(<TestVirtualizedChat />);
        });
        await waitFor(() => {
            expect(screen.getByText('Message Filters')).toBeInTheDocument();
        });
        const enableSwitch = screen.getByLabelText('Enable Filtering');
        await act(async () => {
            fireEvent.click(enableSwitch);
        });
        await waitFor(() => {
            expect(screen.getByText('assistant')).toBeInTheDocument();
        });
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getAllByText('1')).toHaveLength(2);
        expect(screen.getByText('3')).toBeInTheDocument();
    });
    it('filters messages when a badge is clicked', async () => {
        await act(async () => {
            render(<TestVirtualizedChat />);
        });
        await waitFor(() => {
            expect(screen.getByText('Message Filters')).toBeInTheDocument();
        });
        const enableSwitch = screen.getByLabelText('Enable Filtering');
        await act(async () => {
            fireEvent.click(enableSwitch);
        });
        await waitFor(() => {
            expect(screen.getByText('user')).toBeInTheDocument();
        });
        const userBadge = screen.getByText('user');
        await act(async () => {
            fireEvent.click(userBadge);
        });
        await waitFor(() => {
            expect(screen.getByText(/Showing 1 of 4 message types/)).toBeInTheDocument();
        });
        expect(screen.getByText('Clear All')).toBeInTheDocument();
    });
    it('clears filters when Clear All is clicked', async () => {
        await act(async () => {
            render(<TestVirtualizedChat />);
        });
        await waitFor(() => {
            expect(screen.getByText('Message Filters')).toBeInTheDocument();
        });
        const enableSwitch = screen.getByLabelText('Enable Filtering');
        await act(async () => {
            fireEvent.click(enableSwitch);
        });
        await waitFor(() => {
            expect(screen.getByText('user')).toBeInTheDocument();
        });
        const userBadge = screen.getByText('user');
        await act(async () => {
            fireEvent.click(userBadge);
        });
        await waitFor(() => {
            expect(screen.getByText('Clear All')).toBeInTheDocument();
        });
        const clearButton = screen.getByText('Clear All');
        await act(async () => {
            fireEvent.click(clearButton);
        });
        await waitFor(() => {
            expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
        });
    });
    it('switches between Single Turn and Entire Chat modes', async () => {
        await act(async () => {
            render(<TestVirtualizedChat />);
        });
        await waitFor(() => {
            expect(screen.getByText('Message Filters')).toBeInTheDocument();
        });
        const enableSwitch = screen.getByLabelText('Enable Filtering');
        await act(async () => {
            fireEvent.click(enableSwitch);
        });
        await waitFor(() => {
            expect(screen.getByText('Single Turn')).toBeInTheDocument();
        });
        expect(screen.getByText('Single Turn')).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('Entire Chat')).toHaveAttribute('aria-pressed', 'false');
        const entireChatButton = screen.getByText('Entire Chat');
        await act(async () => {
            fireEvent.click(entireChatButton);
        });
        await waitFor(() => {
            expect(screen.getByText('Entire Chat')).toHaveAttribute('aria-pressed', 'true');
        });
        expect(screen.getByText('Single Turn')).toHaveAttribute('aria-pressed', 'false');
    });
    it('shows different status messages for different filter modes', async () => {
        await act(async () => {
            render(<TestVirtualizedChat />);
        });
        await waitFor(() => {
            expect(screen.getByText('Message Filters')).toBeInTheDocument();
        });
        const enableSwitch = screen.getByLabelText('Enable Filtering');
        await act(async () => {
            fireEvent.click(enableSwitch);
        });
        await waitFor(() => {
            expect(screen.getByText('user')).toBeInTheDocument();
        });
        const userBadge = screen.getByText('user');
        await act(async () => {
            fireEvent.click(userBadge);
        });
        await waitFor(() => {
            expect(screen.getByText(/hiding individual messages/)).toBeInTheDocument();
        });
        const entireChatButton = screen.getByText('Entire Chat');
        await act(async () => {
            fireEvent.click(entireChatButton);
        });
        await waitFor(() => {
            expect(screen.getByText(/hiding entire turns without matching messages/)).toBeInTheDocument();
        });
    });
});
//# sourceMappingURL=message-filtering.test.jsx.map