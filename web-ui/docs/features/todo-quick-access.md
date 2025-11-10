# To-Do List Quick Access Feature

## Overview

This feature adds a lightweight to-do list viewer to the Chat Panel menu, providing quick access to personal task lists without leaving the chat interface.

## User Interface

### 1. Chat Panel Menu Integration

The "To-do lists" menu item appears in the Chat Panel menu, positioned between "Reset chat session" and the docking options.

### 2. Fly-out Submenu

When hovering over or tapping "To-do lists", a submenu appears showing all available todo lists with their item counts.

**Features:**
- Appears on hover with 300ms delay
- Shows list title and item count
- Disappears when mouse leaves (with 300ms delay)
- Displays loading spinner while fetching
- Shows "No todo lists available" if empty

### 3. Floating Todo Dialog

Clicking on a list opens a draggable, resizable dialog window with checkboxes for each item.

**Features:**
- Draggable by clicking and dragging the title bar
- Resizable from the bottom-right corner
- Minimum size: 300x200 pixels
- Maximum size: 800x800 pixels
- Checkbox toggles completion status instantly (optimistic UI)
- Completed items show strikethrough styling
- Displays item descriptions when available

## Technical Details

### API Endpoints

- **GET /api/todo/lists** - Returns all todo lists for the authenticated user
- **GET /api/todo/lists/[id]** - Returns a specific todo list by ID
- **PATCH /api/todo/items/[id]** - Updates a todo item's completion status

### React Hooks

- **useTodoLists(options)** - Fetches all todo lists with optional completion filter
- **useTodoList(id, options)** - Fetches a specific todo list
- **useToggleTodo()** - Mutation hook with optimistic UI updates

### Components

- **TodoListFlyout** - Displays hoverable submenu in chat menu
- **FloatingTodoDialog** - Renders draggable/resizable dialog with todo items

## Integration with Existing Systems

- **TodoManager**: Reuses the existing in-memory todo manager
- **MCP Tools**: Compatible with AI assistant's todo manipulation tools
- **Chat Panel**: Follows existing docking/floating dialog patterns
- **Material-UI**: Uses consistent MUI components and theming
- **React Query**: Standard data fetching and caching strategy

## Test Coverage

- 20 comprehensive tests covering API routes, components, and interactions
- All tests passing with proper mocking of dependencies
- Tests cover loading states, error handling, and user interactions
