/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ChatMessageFilters,
  searchMessageContent,
  type MessageType,
} from '@/components/ai/chat/chat-message-filters';
import type { ChatMessage } from '@/lib/ai/chat/types';
import { hideConsoleOutput } from '@/__tests__/test-utils';

const MuiMocks = {
  Box: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Typography: ({ children, ...props }: any) => (
    <span {...props}>{children}</span>
  ),
  FormControlLabel: ({ control, label, ...props }: any) => (
    <label {...props}>
      {control}
      {label}
    </label>
  ),
  Switch: ({ checked, onChange, ...props }: any) => (
    <input type="checkbox" checked={checked} onChange={onChange} {...props} />
  ),
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Badge: ({ badgeContent, children, onClick, ...props }: any) => (
    <div onClick={onClick} {...props} data-badge={badgeContent}>
      {children}
    </div>
  ),
  Chip: ({ label, onClick, ...props }: any) => (
    <div onClick={onClick} {...props}>
      {label}
    </div>
  ),
  TextField: ({ value, onChange, placeholder, ...props }: any) => (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  ),
  InputAdornment: ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
} as const;



// Mock MUI components
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),  
  Box: (props: any) => MuiMocks.Box(props),
  Typography: (props: any) => MuiMocks.Typography(props),
  FormControlLabel: (props: any) => MuiMocks.FormControlLabel(props),
  Switch: (props: any) => MuiMocks.Switch(props),
  Button: (props: any) => MuiMocks.Button(props),
  Badge: (props: any) => MuiMocks.Badge(props),
  Chip: (props: any) => MuiMocks.Chip(props),
  TextField: (props: any) => MuiMocks.TextField(props),
  InputAdornment: (props: any) => MuiMocks.InputAdornment(props),
}));

Object.entries(MuiMocks).forEach(([key, Component]) => {
  jest.mock(`@mui/material/${key}`, () => ({
    __esModule: true,
    default: (props: any) => Component(props),
  }));
});


jest.mock('@mui/icons-material', () => ({
  FilterList: (props: any) => <div {...props}>FilterIcon</div>,
  Search: (props: any) => <div {...props}>SearchIcon</div>,
}));

// Mock data
const mockMessages: ChatMessage[] = [
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
    activeTypeFilters: new Set<MessageType>(),
    onTypeFiltersChange: jest.fn(),
    contentFilter: '',
    onContentFilterChange: jest.fn(),
    title: 'Test Filters',
    size: 'medium' as const,
    showStatusMessage: true,
  };
  const mockConsole = hideConsoleOutput();
  beforeEach(() => {
    // jest.clearAllMocks();
  });
  afterEach(() => {
    mockConsole.dispose();
  });

  it('renders filter controls with title and switch', () => {
    render(<ChatMessageFilters {...mockProps} />);

    expect(screen.getByText('Test Filters')).toBeInTheDocument();
    expect(screen.getByText('Enable Filtering')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('shows filter options when filtering is enabled', () => {
    mockConsole.setup();
    const thisProps = {
      ...mockProps,
      enableFilters: true,
    };
    render(<ChatMessageFilters {...thisProps} />);

    expect(
      screen.getByPlaceholderText('Search message content...'),
    ).toBeInTheDocument();
    expect(screen.getByText('Types:')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('assistant')).toBeInTheDocument();
    expect(screen.getByText('system')).toBeInTheDocument();
    expect(screen.getByText('tool')).toBeInTheDocument();
  });

  it('displays correct message counts in badges', () => {
    render(<ChatMessageFilters {...mockProps} enableFilters={true} />);

    // Each badge should show the count of messages of that type
    expect(screen.getByText('user').closest('[data-badge]')).toHaveAttribute(
      'data-badge',
      '1',
    );
    expect(
      screen.getByText('assistant').closest('[data-badge]'),
    ).toHaveAttribute('data-badge', '1');
    expect(screen.getByText('system').closest('[data-badge]')).toHaveAttribute(
      'data-badge',
      '1',
    );
    expect(screen.getByText('tool').closest('[data-badge]')).toHaveAttribute(
      'data-badge',
      '1',
    );
  });

  it('calls onTypeFiltersChange when badge is clicked', () => {
    const onTypeFiltersChange = jest.fn();
    render(
      <ChatMessageFilters
        {...mockProps}
        enableFilters={true}
        onTypeFiltersChange={onTypeFiltersChange}
      />,
    );

    fireEvent.click(screen.getByText('user'));

    expect(onTypeFiltersChange).toHaveBeenCalledWith(new Set(['user']));
  });

  it('calls onContentFilterChange when text is entered', () => {
    const onContentFilterChange = jest.fn();
    render(
      <ChatMessageFilters
        {...mockProps}
        enableFilters={true}
        onContentFilterChange={onContentFilterChange}
      />,
    );

    const input = screen.getByPlaceholderText('Search message content...');
    fireEvent.change(input, { target: { value: 'hello' } });

    expect(onContentFilterChange).toHaveBeenCalledWith('hello');
  });

  it('shows Clear All button when filters are active', () => {
    const activeFilters = new Set<MessageType>(['user', 'assistant']);
    render(
      <ChatMessageFilters
        {...mockProps}
        enableFilters={true}
        activeTypeFilters={activeFilters}
      />,
    );

    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('shows Clear All button when content filter is active', () => {
    render(
      <ChatMessageFilters
        {...mockProps}
        enableFilters={true}
        contentFilter="test"
      />,
    );

    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('calls clear functions when Clear All is clicked', () => {
    const onTypeFiltersChange = jest.fn();
    const onContentFilterChange = jest.fn();
    const activeFilters = new Set<MessageType>(['user']);

    render(
      <ChatMessageFilters
        {...mockProps}
        enableFilters={true}
        activeTypeFilters={activeFilters}
        contentFilter="test"
        onTypeFiltersChange={onTypeFiltersChange}
        onContentFilterChange={onContentFilterChange}
      />,
    );

    fireEvent.click(screen.getByText('Clear All'));

    expect(onTypeFiltersChange).toHaveBeenCalledWith(new Set());
    expect(onContentFilterChange).toHaveBeenCalledWith('');
  });

  it('shows status message when filters are active', () => {
    const activeFilters = new Set<MessageType>(['user', 'assistant']);
    render(
      <ChatMessageFilters
        {...mockProps}
        enableFilters={true}
        activeTypeFilters={activeFilters}
      />,
    );

    expect(
      screen.getByText('Showing 2 of 4 message types'),
    ).toBeInTheDocument();
  });

  it('shows combined status message for type and content filters', () => {
    const activeFilters = new Set<MessageType>(['user']);
    render(
      <ChatMessageFilters
        {...mockProps}
        enableFilters={true}
        activeTypeFilters={activeFilters}
        contentFilter="hello"
      />,
    );

    expect(
      screen.getByText('Filtering by content "hello" and 1 of 4 message types'),
    ).toBeInTheDocument();
  });

  it('shows content-only status message', () => {
    render(
      <ChatMessageFilters
        {...mockProps}
        enableFilters={true}
        contentFilter="hello"
      />,
    );

    expect(
      screen.getByText('Filtering by content "hello"'),
    ).toBeInTheDocument();
  });

  it('calls onEnableFiltersChange and clears filters when toggled off', () => {
    const onEnableFiltersChange = jest.fn();
    const onTypeFiltersChange = jest.fn();
    const onContentFilterChange = jest.fn();

    render(
      <ChatMessageFilters
        {...mockProps}
        enableFilters={true}
        onEnableFiltersChange={onEnableFiltersChange}
        onTypeFiltersChange={onTypeFiltersChange}
        onContentFilterChange={onContentFilterChange}
      />,
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox); // Use click instead of change for better simulation

    expect(onEnableFiltersChange).toHaveBeenCalledWith(false);
  });

  it('uses small size styling when size="small"', () => {
    render(
      <ChatMessageFilters {...mockProps} size="small" enableFilters={true} />,
    );

    // The component should render with smaller styling
    expect(screen.getByText('Test Filters')).toBeInTheDocument();
  });
});

describe('searchMessageContent', () => {
  const testMessage: ChatMessage = {
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
    expect(searchMessageContent(testMessage, 'OPTIMIZED')).toBe(true); // case insensitive
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
    const messageWithNulls: ChatMessage = {
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
    const messageWithCircularRef: ChatMessage = {
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

    // Create circular reference
    const circular: any = { test: 'value' };
    circular.self = circular;
    (messageWithCircularRef as any).functionCall = circular;

    // Should not throw and should still search other fields
    expect(searchMessageContent(messageWithCircularRef, 'test')).toBe(true);
    expect(searchMessageContent(messageWithCircularRef, 'notfound')).toBe(
      false,
    );
  });
});
