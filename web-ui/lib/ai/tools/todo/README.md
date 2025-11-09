# Todo List MCP Tools

This directory contains the implementation of a Todo List management system exposed via Model Context Protocol (MCP).

## Overview

The Todo List MCP provides a simple, in-memory task management system that can be accessed by AI agents through MCP tools. It enables AI assistants to help users create, manage, and track todo items during conversations.

**NEW:** The todo system now supports user segmentation, allowing each signed-in user to have their own isolated todo lists and items.

## Architecture

### Components

1. **TodoManager** (`todo-manager.ts`)
   - Singleton class managing an in-memory todo list
   - Provides CRUD operations for todo items
   - Each todo has: id, title, description, completed status, timestamps, **and optional userId**
   - Each todo list has: id, title, description, status, priority, todos array, timestamps, **and optional userId**

2. **Tool Callbacks** (`tool-callback.ts`)
   - Five tool implementations that wrap TodoManager operations
   - Proper error handling and logging
   - Zod schema validation for inputs/outputs
   - **Now supports userId parameter for user-specific operations**

3. **MCP Route** (`/app/api/ai/tools/todo/[transport]/route.ts`)
   - Exposes todo tools via MCP server
   - Supports both GET and POST methods
   - Follows established MCP handler patterns

## User Segmentation

### Overview

All todo lists and items can now be scoped to specific users via an optional `userId` field. When a `userId` is provided:
- Lists and items are filtered to show only those belonging to that user
- Users cannot view, update, or delete items/lists belonging to other users
- Each user gets their own default list (e.g., `default-user-alice`)

### Backward Compatibility

The `userId` field is **optional** throughout the API. Legacy usage without `userId` will continue to work:
- Todos without a userId can still be created and managed
- Methods without userId parameters return all todos/lists (legacy behavior)
- Existing code continues to function without modification

### Usage Examples

```typescript
// Create a user-specific todo list
const list = manager.upsertTodoList({
  title: 'Alice\'s Tasks',
  userId: 'user-alice',
  todos: [{ title: 'Review documents' }]
});

// Get todos for a specific user
const aliceTodos = manager.getTodos({ userId: 'user-alice' });
const aliceLists = manager.getTodoLists({ userId: 'user-alice' });

// Update with authorization check
manager.updateTodo(todoId, { title: 'Updated' }, { userId: 'user-alice' });

// Delete with authorization check
manager.deleteTodo(todoId, { userId: 'user-alice' });
```

## Available Tools

### createTodo
Creates a new todo item or list.

**Input:**
- `title` (string, required): The title of the todo list
- `description` (string, optional): Additional details
- `listId` (string, optional): Specific list ID to create/replace
- `status` (TodoStatus, optional): pending | active | complete
- `priority` (TodoPriority, optional): high | medium | low
- **`userId` (string, optional): User identifier to scope the list**
- `todos` (array, optional): Array of todo items to include in the list

**Output:**
- Complete todo list object with generated ID and timestamps

### getTodos
Retrieves all todos, optionally filtered by completion status and/or user.

**Input:**
- `completed` (boolean, optional): Filter by completion status
  - `true`: Only completed todos
  - `false`: Only incomplete todos
  - omitted: All todos
- `listId` (string, optional): Return only the specified list
- **`userId` (string, optional): Filter to only this user's todos/lists**

**Output:**
- Array of todo list objects (or single list if listId provided)

### updateTodo
Updates an existing todo item.

**Input:**
- `id` (string, required): The todo ID
- `title` (string, optional): New title
- `description` (string, optional): New description
- `completed` (boolean, optional): New completion status
- `status` (TodoStatus, optional): New status
- `priority` (TodoPriority, optional): New priority
- **`userId` (string, optional): Verify ownership before updating**

**Output:**
- Updated todo object (or error if userId doesn't match owner)

### deleteTodo
Permanently deletes a todo item.

**Input:**
- `id` (string, required): The todo ID
- **`userId` (string, optional): Verify ownership before deleting**

**Output:**
- Success confirmation with the deleted ID (or error if userId doesn't match)

### toggleTodo
Toggles the completion status (complete ↔ incomplete).

**Input:**
- `id` (string, required): The todo ID
- **`userId` (string, optional): Verify ownership before toggling**

**Output:**
- Updated todo list object with toggled status

## Usage Example

When an AI assistant connects to the MCP endpoint at `/api/ai/tools/todo/[transport]`, it will have access to all five tools. The assistant can help users manage their todo list conversationally:

```
User: "Create a todo to review the quarterly report"
Assistant: [calls createTodo with title="Review quarterly report", userId="user-123"]
          "I've created a todo for reviewing the quarterly report."

User: "What todos do I have?"
Assistant: [calls getTodos with userId="user-123"]
          "You have 1 todo: Review quarterly report (incomplete)"

User: "Mark it as done"
Assistant: [calls toggleTodo with the todo's id, userId="user-123"]
          "Great! I've marked 'Review quarterly report' as complete."
```

## Storage

**Note:** The current implementation uses **in-memory storage**. Todos are stored in a process-global singleton and will be lost when the server restarts. This is suitable for:
- Development and testing
- Temporary session-based task tracking
- Demonstrations

For production use with persistent storage, the TodoManager could be extended to:
- Store todos in the PostgreSQL database
- Use Redis for distributed caching
- Implement user-specific todo lists with authentication
- **Note:** When implementing persistent storage, add `user_id` columns to the database schema

## Testing

Comprehensive unit tests are available at `/__tests__/lib/ai/tools/todo.test.ts`:
- 27 test cases covering all CRUD operations
- **11 new tests for user segmentation and isolation**
- Tool callback validation
- Error handling scenarios
- Backward compatibility verification
- All tests passing ✓

Run tests with:
```bash
yarn test __tests__/lib/ai/tools/todo.test.ts
```

## Integration

The todo tools are automatically registered with the MCP server when the route is accessed. No additional configuration is needed beyond the standard MCP client setup used elsewhere in the application.

## Security Considerations

- **User Isolation**: When userId is provided, the system enforces strict isolation - users cannot access, modify, or delete each other's todos
- **Authorization**: Update, delete, and toggle operations verify userId matches the todo owner before proceeding
- **Privacy**: User-specific default lists use unique IDs (e.g., `default-user-alice`) to prevent conflicts

## Future Enhancements

Potential improvements could include:
- Persistent database storage with user_id foreign keys
- Due dates and priorities
- Tags and categories
- Subtasks and checklists
- Search and filtering capabilities
- Recurring todos
- Collaboration features (shared lists with permissions)
