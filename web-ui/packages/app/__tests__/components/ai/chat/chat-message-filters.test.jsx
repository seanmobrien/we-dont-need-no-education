import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatMessageFilters, searchMessageContent, } from '@/components/ai/chat/chat-message-filters';
import { hideConsoleOutput } from '@/__tests__/test-utils';
const mockMessages = [
    {
        turnId: 1,
        messageId: 1,
        role: 'user',
        content: 'Hello, how are you?',
        messageOrder: 0,
        statusId: 1,
        providerId: 'test',
        toolInstanceId: null,
        optimizedContent: null,
    },
    {
        turnId: 1,
        messageId: 2,
        role: 'assistant',
        content: 'I am doing well, thank you for asking!',
        messageOrder: 1,
        statusId: 1,
        providerId: 'test',
        toolInstanceId: null,
        optimizedContent: null,
    },
    {
        turnId: 1,
        messageId: 3,
        role: 'system',
        content: 'System message',
        messageOrder: 2,
        statusId: 1,
        providerId: 'test',
        toolInstanceId: null,
        optimizedContent: null,
    },
    {
        turnId: 1,
        messageId: 4,
        role: 'tool',
        content: null,
        toolName: 'search_tool',
        toolResult: { results: ['result1', 'result2'] },
        messageOrder: 3,
        statusId: 1,
        providerId: 'test',
        toolInstanceId: 'tool-123',
        optimizedContent: null,
    },
];
describe('ChatMessageFilters', () => {
    const mockProps = {
        messages: mockMessages,
        enableFilters: false,
        onEnableFiltersChange: jest.fn(),
        activeTypeFilters: new Set(),
        onTypeFiltersChange: jest.fn(),
        contentFilter: '',
        onContentFilterChange: jest.fn(),
        title: 'Test Filters',
        size: 'medium',
        showStatusMessage: true,
    };
    const mockConsole = hideConsoleOutput();
    beforeEach(() => {
    });
    afterEach(() => {
        mockConsole.dispose();
    });
    it('renders filter controls with title and switch', () => {
        render(<ChatMessageFilters {...mockProps}/>);
        expect(screen.getByText('Test Filters')).toBeInTheDocument();
        expect(screen.getByText('Enable Filtering')).toBeInTheDocument();
        expect(screen.getByRole('switch')).not.toBeChecked();
    });
    it('shows filter options when filtering is enabled', () => {
        mockConsole.setup();
        const thisProps = {
            ...mockProps,
            enableFilters: true,
        };
        render(<ChatMessageFilters {...thisProps}/>);
        expect(screen.getByPlaceholderText('Search message content...')).toBeInTheDocument();
        expect(screen.getByText('Types:')).toBeInTheDocument();
        expect(screen.getByText('user')).toBeInTheDocument();
        expect(screen.getByText('assistant')).toBeInTheDocument();
        expect(screen.getByText('system')).toBeInTheDocument();
        expect(screen.getByText('tool')).toBeInTheDocument();
    });
    it('displays correct message counts in badges', () => {
        render(<ChatMessageFilters {...mockProps} enableFilters={true}/>);
        expect(screen.getByText('user').parentElement?.parentElement?.querySelector('.MuiBadge-badge')).toHaveTextContent('1');
        expect(screen.getByText('assistant')?.parentElement?.parentElement?.querySelector('.MuiBadge-badge')).toHaveTextContent('1');
        expect(screen.getByText('system')?.parentElement?.parentElement?.querySelector('.MuiBadge-badge')).toHaveTextContent('1');
        expect(screen.getByText('tool')?.parentElement?.parentElement?.querySelector('.MuiBadge-badge')).toHaveTextContent('1');
    });
    it('calls onTypeFiltersChange when badge is clicked', () => {
        const onTypeFiltersChange = jest.fn();
        render(<ChatMessageFilters {...mockProps} enableFilters={true} onTypeFiltersChange={onTypeFiltersChange}/>);
        fireEvent.click(screen.getByText('user'));
        expect(onTypeFiltersChange).toHaveBeenCalledWith(new Set(['user']));
    });
    it('calls onContentFilterChange when text is entered', () => {
        const onContentFilterChange = jest.fn();
        render(<ChatMessageFilters {...mockProps} enableFilters={true} onContentFilterChange={onContentFilterChange}/>);
        const input = screen.getByPlaceholderText('Search message content...');
        fireEvent.change(input, { target: { value: 'hello' } });
        expect(onContentFilterChange).toHaveBeenCalledWith('hello');
    });
    it('shows Clear All button when filters are active', () => {
        const activeFilters = new Set(['user', 'assistant']);
        render(<ChatMessageFilters {...mockProps} enableFilters={true} activeTypeFilters={activeFilters}/>);
        expect(screen.getByText('Clear All')).toBeInTheDocument();
    });
    it('shows Clear All button when content filter is active', () => {
        render(<ChatMessageFilters {...mockProps} enableFilters={true} contentFilter="test"/>);
        expect(screen.getByText('Clear All')).toBeInTheDocument();
    });
    it('calls clear functions when Clear All is clicked', () => {
        const onTypeFiltersChange = jest.fn();
        const onContentFilterChange = jest.fn();
        const activeFilters = new Set(['user']);
        render(<ChatMessageFilters {...mockProps} enableFilters={true} activeTypeFilters={activeFilters} contentFilter="test" onTypeFiltersChange={onTypeFiltersChange} onContentFilterChange={onContentFilterChange}/>);
        fireEvent.click(screen.getByText('Clear All'));
        expect(onTypeFiltersChange).toHaveBeenCalledWith(new Set());
        expect(onContentFilterChange).toHaveBeenCalledWith('');
    });
    it('shows status message when filters are active', () => {
        const activeFilters = new Set(['user', 'assistant']);
        render(<ChatMessageFilters {...mockProps} enableFilters={true} activeTypeFilters={activeFilters}/>);
        expect(screen.getByText('Showing 2 of 4 message types')).toBeInTheDocument();
    });
    it('shows combined status message for type and content filters', () => {
        const activeFilters = new Set(['user']);
        render(<ChatMessageFilters {...mockProps} enableFilters={true} activeTypeFilters={activeFilters} contentFilter="hello"/>);
        expect(screen.getByText('Filtering by content "hello" and 1 of 4 message types')).toBeInTheDocument();
    });
    it('shows content-only status message', () => {
        render(<ChatMessageFilters {...mockProps} enableFilters={true} contentFilter="hello"/>);
        expect(screen.getByText('Filtering by content "hello"')).toBeInTheDocument();
    });
    it('calls onEnableFiltersChange and clears filters when toggled off', () => {
        const onEnableFiltersChange = jest.fn();
        const onTypeFiltersChange = jest.fn();
        const onContentFilterChange = jest.fn();
        render(<ChatMessageFilters {...mockProps} enableFilters={true} onEnableFiltersChange={onEnableFiltersChange} onTypeFiltersChange={onTypeFiltersChange} onContentFilterChange={onContentFilterChange}/>);
        const checkbox = screen.getByRole('switch');
        fireEvent.click(checkbox);
        expect(onEnableFiltersChange).toHaveBeenCalledWith(false);
    });
    it('uses small size styling when size="small"', () => {
        render(<ChatMessageFilters {...mockProps} size="small" enableFilters={true}/>);
        expect(screen.getByText('Test Filters')).toBeInTheDocument();
    });
});
describe('searchMessageContent', () => {
    const testMessage = {
        turnId: 1,
        messageId: 1,
        role: 'user',
        content: 'Hello World',
        messageOrder: 0,
        statusId: 1,
        providerId: 'test',
        toolInstanceId: null,
        optimizedContent: 'Optimized Hello',
        toolName: 'test_tool',
        functionCall: { action: 'search', query: 'example' },
        toolResult: { status: 'success', data: 'result' },
    };
    it('returns true for empty search term', () => {
        expect(searchMessageContent(testMessage, '')).toBe(true);
        expect(searchMessageContent(testMessage, '   ')).toBe(true);
    });
    it('searches in content field', () => {
        expect(searchMessageContent(testMessage, 'hello')).toBe(true);
        expect(searchMessageContent(testMessage, 'world')).toBe(true);
        expect(searchMessageContent(testMessage, 'notfound')).toBe(false);
    });
    it('searches in optimizedContent field', () => {
        expect(searchMessageContent(testMessage, 'optimized')).toBe(true);
        expect(searchMessageContent(testMessage, 'OPTIMIZED')).toBe(true);
    });
    it('searches in toolName field', () => {
        expect(searchMessageContent(testMessage, 'test_tool')).toBe(true);
        expect(searchMessageContent(testMessage, 'tool')).toBe(true);
    });
    it('searches in functionCall JSON', () => {
        expect(searchMessageContent(testMessage, 'search')).toBe(true);
        expect(searchMessageContent(testMessage, 'example')).toBe(true);
        expect(searchMessageContent(testMessage, 'action')).toBe(true);
    });
    it('searches in toolResult JSON', () => {
        expect(searchMessageContent(testMessage, 'success')).toBe(true);
        expect(searchMessageContent(testMessage, 'result')).toBe(true);
        expect(searchMessageContent(testMessage, 'status')).toBe(true);
    });
    it('is case insensitive', () => {
        expect(searchMessageContent(testMessage, 'HELLO')).toBe(true);
        expect(searchMessageContent(testMessage, 'World')).toBe(true);
        expect(searchMessageContent(testMessage, 'SUCCESS')).toBe(true);
    });
    it('handles null values gracefully', () => {
        const messageWithNulls = {
            turnId: 1,
            messageId: 1,
            role: 'user',
            content: null,
            messageOrder: 0,
            statusId: 1,
            providerId: 'test',
            toolInstanceId: null,
            optimizedContent: null,
            toolName: null,
            functionCall: null,
            toolResult: null,
        };
        expect(searchMessageContent(messageWithNulls, 'anything')).toBe(false);
        expect(searchMessageContent(messageWithNulls, '')).toBe(true);
    });
    it('handles JSON stringify errors gracefully', () => {
        const messageWithCircularRef = {
            turnId: 1,
            messageId: 1,
            role: 'user',
            content: 'test',
            messageOrder: 0,
            statusId: 1,
            providerId: 'test',
            toolInstanceId: null,
            optimizedContent: null,
        };
        const circular = { test: 'value' };
        circular.self = circular;
        messageWithCircularRef.functionCall = circular;
        expect(searchMessageContent(messageWithCircularRef, 'test')).toBe(true);
        expect(searchMessageContent(messageWithCircularRef, 'notfound')).toBe(false);
    });
});
//# sourceMappingURL=chat-message-filters.test.jsx.map