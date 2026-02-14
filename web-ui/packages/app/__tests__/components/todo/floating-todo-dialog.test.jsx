import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import '@testing-library/jest-dom';
import { FloatingTodoDialog } from '@/components/todo/floating-todo-dialog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
jest.mock('react-draggable', () => ({
    __esModule: true,
    default: ({ children }) => (<div data-testid="draggable">{children}</div>),
}));
jest.mock('react-resizable', () => ({
    ResizableBox: ({ children }) => (<div data-testid="resizable-box">{children}</div>),
}));
jest.mock('@/lib/hooks/use-todo', () => ({
    useTodoList: jest.fn(),
    useToggleTodo: jest.fn(),
}));
import { useTodoList, useToggleTodo } from '@/lib/hooks/use-todo';
describe('FloatingTodoDialog', () => {
    const mockOnClose = jest.fn();
    const mockMutate = jest.fn();
    let queryClient;
    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
            },
        });
        jest.clearAllMocks();
        useToggleTodo.mockReturnValue({
            mutate: mockMutate,
        });
    });
    const renderComponent = (listId = 'list-1', open = true) => {
        return render(<QueryClientProvider client={queryClient}>
        <FloatingTodoDialog listId={listId} open={open} onClose={mockOnClose}/>
      </QueryClientProvider>, {
            chatPanel: true,
        });
    };
    it('does not render when closed', () => {
        useTodoList.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: null,
        });
        const { container } = renderComponent('list-1', false);
        expect(container.firstChild).toBeNull();
    });
    it('shows loading state when fetching list', () => {
        useTodoList.mockReturnValue({
            data: undefined,
            isLoading: true,
            error: null,
        });
        renderComponent();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
    it('shows error state when fetch fails', () => {
        useTodoList.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new Error('Failed to fetch'),
        });
        renderComponent();
        expect(screen.getByText('Failed to load todo list')).toBeInTheDocument();
    });
    it('shows empty state when list has no todos', () => {
        useTodoList.mockReturnValue({
            data: {
                id: 'list-1',
                title: 'Empty List',
                todos: [],
            },
            isLoading: false,
            error: null,
        });
        renderComponent();
        expect(screen.getByText('Empty List')).toBeInTheDocument();
        expect(screen.getByText('No items in this list')).toBeInTheDocument();
    });
    it('displays todo items with checkboxes', () => {
        useTodoList.mockReturnValue({
            data: {
                id: 'list-1',
                title: 'Work Tasks',
                todos: [
                    {
                        id: 'todo-1',
                        title: 'Task 1',
                        description: 'Description 1',
                        completed: false,
                    },
                    {
                        id: 'todo-2',
                        title: 'Task 2',
                        description: 'Description 2',
                        completed: true,
                    },
                ],
            },
            isLoading: false,
            error: null,
        });
        renderComponent();
        expect(screen.getByText('Work Tasks')).toBeInTheDocument();
        expect(screen.getByText('Task 1')).toBeInTheDocument();
        expect(screen.getByText('Description 1')).toBeInTheDocument();
        expect(screen.getByText('Task 2')).toBeInTheDocument();
        expect(screen.getByText('Description 2')).toBeInTheDocument();
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(2);
        expect(checkboxes[0]).not.toBeChecked();
        expect(checkboxes[1]).toBeChecked();
    });
    it('toggles todo completion when checkbox is clicked', async () => {
        useTodoList.mockReturnValue({
            data: {
                id: 'list-1',
                title: 'Work Tasks',
                todos: [
                    {
                        id: 'todo-1',
                        title: 'Task 1',
                        completed: false,
                    },
                ],
            },
            isLoading: false,
            error: null,
        });
        renderComponent();
        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);
        await waitFor(() => {
            expect(mockMutate).toHaveBeenCalledWith({
                itemId: 'todo-1',
                completed: true,
            });
        });
    });
    it('applies strikethrough to completed items', () => {
        useTodoList.mockReturnValue({
            data: {
                id: 'list-1',
                title: 'Work Tasks',
                todos: [
                    {
                        id: 'todo-1',
                        title: 'Completed Task',
                        completed: true,
                    },
                ],
            },
            isLoading: false,
            error: null,
        });
        renderComponent();
        const taskText = screen.getByText('Completed Task');
        expect(taskText).toHaveStyle({ textDecoration: 'line-through' });
    });
    it('calls onClose when close button is clicked', () => {
        useTodoList.mockReturnValue({
            data: {
                id: 'list-1',
                title: 'Work Tasks',
                todos: [],
            },
            isLoading: false,
            error: null,
        });
        renderComponent();
        const closeButton = screen.getByLabelText('Close dialog');
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
    });
    it('does not fetch when listId is null', () => {
        const mockUseTodoList = useTodoList;
        mockUseTodoList.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: null,
        });
        renderComponent(null);
        expect(mockUseTodoList).toHaveBeenCalledWith(null);
    });
});
//# sourceMappingURL=floating-todo-dialog.test.jsx.map