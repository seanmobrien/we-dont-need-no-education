# Todo List MCP Tools

This directory contains the implementation of a Todo List management system exposed via Model Context Protocol (MCP).

## Overview

The Todo List MCP provides a simple, in-memory task management system that can be accessed by AI agents through MCP tools. It enables AI assistants to help users create, manage, and track todo items during conversations.

**User Segmentation:** The todo system automatically segments todos by signed-in user. Each user sees only their own isolated todo lists and items, with userId automatically extracted from the authenticated session.

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

All todo lists and items are automatically scoped to the signed-in user via session authentication:
- **Automatic UserId**: The userId is automatically extracted from the authenticated session using `auth()` 
- **Isolation**: Users see only their own todos and lists
- **Authorization**: Users cannot view, update, or delete items/lists belonging to other users
- **Per-User Default Lists**: Each user gets their own default list (e.g., `default-user-alice`)

### Implementation Details

The system uses Next.js authentication (`auth()` from `@/auth`) to automatically:
1. Extract the current user's ID from the session
2. Apply userId filtering to all list and item queries
3. Enforce authorization on all mutation operations (create, update, delete, toggle)

No userId parameter needs to be provided by callers - it's handled transparently by the authentication system.

### Backward Compatibility

The underlying TodoManager accepts an optional `userId` parameter for direct API usage:
- When userId is provided, lists/items are filtered to that user
- When userId is omitted, all todos/lists are returned (legacy behavior)
- Tool callbacks automatically use session-based userId

### Usage Examples

```typescript
// User-specific operations (userId automatically from session)
const list = await createTodoCallback({
  title: 'My Tasks',
  todos: [{ title: 'Review documents' }]
});

const myTodos = await getTodosCallback({});
const updated = await updateTodoCallback({ id: todoId, title: 'Updated' });

// Direct TodoManager usage with explicit userId (advanced)
const manager = getTodoManager();
const list = manager.upsertTodoList({
  title: 'Alice Tasks',
  userId: 'user-alice',
  todos: [{ title: 'Review documents' }]
});
const aliceTodos = manager.getTodos({ userId: 'user-alice' });
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
- `todos` (array, optional): Array of todo items to include in the list

**Output:**
- Complete todo list object with generated ID and timestamps

**Note:** userId is automatically extracted from the authenticated session.

### getTodos
Retrieves all todos, optionally filtered by completion status and/or user.

**Input:**
- `completed` (boolean, optional): Filter by completion status
  - `true`: Only completed todos
  - `false`: Only incomplete todos
  - omitted: All todos
- `listId` (string, optional): Return only the specified list

**Output:**
- Array of todo list objects (or single list if listId provided)

**Note:** Results are automatically filtered to the authenticated user's todos.

### updateTodo
Updates an existing todo item.

**Input:**
- `id` (string, required): The todo ID
- `title` (string, optional): New title
- `description` (string, optional): New description
- `completed` (boolean, optional): New completion status
- `status` (TodoStatus, optional): New status
- `priority` (TodoPriority, optional): New priority

**Output:**
- Updated todo object (or error if user doesn't own the todo)

**Note:** Authorization is automatically enforced using the authenticated user's ID.

### deleteTodo
Permanently deletes a todo item.

**Input:**
- `id` (string, required): The todo ID

**Output:**
- Success confirmation with the deleted ID (or error if user doesn't own the todo)

**Note:** Authorization is automatically enforced using the authenticated user's ID.

### toggleTodo
Toggles the completion status (complete ↔ incomplete).

**Input:**
- `id` (string, required): The todo ID

**Output:**
- Updated todo list object with toggled status

**Note:** Authorization is automatically enforced using the authenticated user's ID.

## Usage Example

When an AI assistant connects to the MCP endpoint at `/api/ai/tools/todo/[transport]`, it will have access to all five tools. The assistant can help users manage their todo list conversationally:

```
User: "Create a todo to review the quarterly report"
Assistant: [calls createTodo - userId auto-extracted from session]
          "I've created a todo for reviewing the quarterly report."

User: "What todos do I have?"
Assistant: [calls getTodos - automatically filtered to user's todos]
          "You have 1 todo: Review quarterly report (incomplete)"

User: "Mark it as done"
Assistant: [calls toggleTodo - authorization auto-enforced]
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

- **Automatic User Isolation**: UserId is automatically extracted from authenticated session via `auth()` 
- **Authorization**: Update/delete/toggle operations automatically verify userId matches owner
- **Session-Based Security**: All tool callbacks use session authentication - no manual userId handling required
- **Privacy Protection**: Users cannot access other users' todos even if they know the IDs

## Future Enhancements

Potential improvements could include:
- Persistent database storage with user_id foreign keys
- Due dates and priorities
- Tags and categories
- Subtasks and checklists
- Search and filtering capabilities
- Recurring todos
- Collaboration features (shared lists with permissions)
