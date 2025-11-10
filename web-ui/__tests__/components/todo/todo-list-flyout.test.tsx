/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import '@testing-library/jest-dom';
import { TodoListFlyout } from '@/components/todo/todo-list-flyout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the useTodoLists hook
jest.mock('@/lib/hooks/use-todo-lists', () => ({
  useTodoLists: jest.fn(),
}));

import { useTodoLists } from '@/lib/hooks/use-todo-lists';

describe('TodoListFlyout', () => {
  const mockOnSelectList = jest.fn();
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TodoListFlyout onSelectList={mockOnSelectList} />
      </QueryClientProvider>,
    );
  };

  it('renders the todo lists menu item', () => {
    (useTodoLists as jest.Mock).mockReturnValue({
      data: { lists: [] },
      isLoading: false,
    });

    renderComponent();
    
    expect(screen.getByTestId('menu-item-todo-lists')).toBeInTheDocument();
    expect(screen.getByText('To-do lists')).toBeInTheDocument();
  });

  it('shows loading state when fetching lists', async () => {
    (useTodoLists as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    renderComponent();
    
    // Hover over the menu item to open submenu
    const menuItem = screen.getByTestId('menu-item-todo-lists');
    fireEvent.mouseEnter(menuItem);

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('shows empty state when no lists are available', async () => {
    (useTodoLists as jest.Mock).mockReturnValue({
      data: { lists: [] },
      isLoading: false,
    });

    renderComponent();
    
    const menuItem = screen.getByTestId('menu-item-todo-lists');
    fireEvent.mouseEnter(menuItem);

    await waitFor(() => {
      expect(screen.getByText('No todo lists available')).toBeInTheDocument();
    });
  });

  it('displays todo lists when available', async () => {
    (useTodoLists as jest.Mock).mockReturnValue({
      data: {
        lists: [
          {
            id: 'list-1',
            title: 'Work Tasks',
            todos: [
              { id: 'todo-1', title: 'Task 1', completed: false },
              { id: 'todo-2', title: 'Task 2', completed: false },
            ],
          },
          {
            id: 'list-2',
            title: 'Personal Tasks',
            todos: [
              { id: 'todo-3', title: 'Task 3', completed: true },
            ],
          },
        ],
      },
      isLoading: false,
    });

    renderComponent();
    
    const menuItem = screen.getByTestId('menu-item-todo-lists');
    fireEvent.mouseEnter(menuItem);

    await waitFor(() => {
      expect(screen.getByText('Work Tasks')).toBeInTheDocument();
      expect(screen.getByText('Personal Tasks')).toBeInTheDocument();
      expect(screen.getByText('2 items')).toBeInTheDocument();
      expect(screen.getByText('1 item')).toBeInTheDocument();
    });
  });

  it('calls onSelectList when a list is clicked', async () => {
    (useTodoLists as jest.Mock).mockReturnValue({
      data: {
        lists: [
          {
            id: 'list-1',
            title: 'Work Tasks',
            todos: [],
          },
        ],
      },
      isLoading: false,
    });

    renderComponent();
    
    const menuItem = screen.getByTestId('menu-item-todo-lists');
    fireEvent.mouseEnter(menuItem);

    await waitFor(() => {
      expect(screen.getByText('Work Tasks')).toBeInTheDocument();
    });

    const listItem = screen.getByTestId('todo-list-item-list-1');
    fireEvent.click(listItem);

    expect(mockOnSelectList).toHaveBeenCalledWith('list-1');
  });

  it('closes submenu when mouse leaves', async () => {
    (useTodoLists as jest.Mock).mockReturnValue({
      data: {
        lists: [
          {
            id: 'list-1',
            title: 'Work Tasks',
            todos: [],
          },
        ],
      },
      isLoading: false,
    });

    renderComponent();
    
    const menuItem = screen.getByTestId('menu-item-todo-lists');
    fireEvent.mouseEnter(menuItem);

    await waitFor(() => {
      expect(screen.getByText('Work Tasks')).toBeInTheDocument();
    });

    fireEvent.mouseLeave(menuItem);

    // Wait for the timeout to close the menu
    await waitFor(
      () => {
        expect(screen.queryByText('Work Tasks')).not.toBeInTheDocument();
      },
      { timeout: 500 },
    );
  });
});
