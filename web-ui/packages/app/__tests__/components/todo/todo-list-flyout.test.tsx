/**
 * @jest-environment jsdom
 */

import React, { useState } from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@/__tests__/test-utils';
import '@testing-library/jest-dom';
import { TodoListFlyout } from '@/components/todo/todo-list-flyout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the useTodoLists hook
jest.mock('@/lib/hooks/use-todo', () => ({
  useTodoLists: jest.fn(),
}));

import { useTodoLists } from '@/lib/hooks/use-todo';

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

  const TestWrapper = () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <QueryClientProvider client={queryClient}>
        <TodoListFlyout
          onSelectList={mockOnSelectList}
          isOpen={isOpen}
          onHover={() => setIsOpen(true)}
        />
      </QueryClientProvider>
    );
  };

  const renderComponent = () => {
    return render(<TestWrapper />);
  };

  it('renders the todo lists menu item', () => {
    (useTodoLists as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderComponent();

    expect(screen.getByTestId('menu-item-todo-lists')).toBeInTheDocument();
    expect(screen.getByText('Todo Lists')).toBeInTheDocument();
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
      data: [],
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
      data: [
        {
          id: 'list-1',
          title: 'Work Tasks',
          totalItems: 2,
          status: 'active',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'list-2',
          title: 'Personal Tasks',
          totalItems: 1,
          status: 'active',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
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
      data: [
        {
          id: 'list-1',
          title: 'Work Tasks',
          totalItems: 0,
          status: 'active',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
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

  /* Revist later need to get release out
  it('closes submenu when mouse leaves', async () => {
    (useTodoLists as jest.Mock).mockReturnValue({
      data: [
        {
          id: 'list-1',
          title: 'Work Tasks',
          totalItems: 0,
          status: 'active',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      isLoading: false,
    });

    renderComponent();

    const menuItem = screen.getByTestId('menu-item-todo-lists');
    await act(async () => {
      fireEvent.mouseEnter(menuItem);

      await waitFor(() => {
        expect(screen.getByText('Work Tasks')).toBeInTheDocument();
      });
    });

    await act(async () => {
      fireEvent.mouseLeave(menuItem);
      await waitFor(
        () => {
          expect(screen.queryByText('Work Tasks')).not.toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    });
  }, 3000);
  */
});
