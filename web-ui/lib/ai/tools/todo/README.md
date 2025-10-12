# Todo List MCP Tools

This directory contains the implementation of a Todo List management system exposed via Model Context Protocol (MCP).

## Overview

The Todo List MCP provides a simple, in-memory task management system that can be accessed by AI agents through MCP tools. It enables AI assistants to help users create, manage, and track todo items during conversations.

## Architecture

### Components

1. **TodoManager** (`todo-manager.ts`)
   - Singleton class managing an in-memory todo list
   - Provides CRUD operations for todo items
   - Each todo has: id, title, description, completed status, timestamps

2. **Tool Callbacks** (`tool-callback.ts`)
   - Five tool implementations that wrap TodoManager operations
   - Proper error handling and logging
   - Zod schema validation for inputs/outputs

3. **MCP Route** (`/app/api/ai/tools/todo/[transport]/route.ts`)
   - Exposes todo tools via MCP server
   - Supports both GET and POST methods
   - Follows established MCP handler patterns

## Available Tools

### createTodo
Creates a new todo item.

**Input:**
- `title` (string, required): The title of the todo
- `description` (string, optional): Additional details

**Output:**
- Complete todo object with generated ID and timestamps

### getTodos
Retrieves all todos, optionally filtered by completion status.

**Input:**
- `completed` (boolean, optional): Filter by completion status
  - `true`: Only completed todos
  - `false`: Only incomplete todos
  - omitted: All todos

**Output:**
- Array of todo objects

### updateTodo
Updates an existing todo item.

**Input:**
- `id` (string, required): The todo ID
- `title` (string, optional): New title
- `description` (string, optional): New description
- `completed` (boolean, optional): New completion status

**Output:**
- Updated todo object

### deleteTodo
Permanently deletes a todo item.

**Input:**
- `id` (string, required): The todo ID

**Output:**
- Success confirmation with the deleted ID

### toggleTodo
Toggles the completion status (complete ↔ incomplete).

**Input:**
- `id` (string, required): The todo ID

**Output:**
- Updated todo object with toggled status

## Usage Example

When an AI assistant connects to the MCP endpoint at `/api/ai/tools/todo/[transport]`, it will have access to all five tools. The assistant can help users manage their todo list conversationally:

```
User: "Create a todo to review the quarterly report"
Assistant: [calls createTodo with title="Review quarterly report"]
          "I've created a todo for reviewing the quarterly report."

User: "What todos do I have?"
Assistant: [calls getTodos]
          "You have 1 todo: Review quarterly report (incomplete)"

User: "Mark it as done"
Assistant: [calls toggleTodo with the todo's id]
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

## Testing

Comprehensive unit tests are available at `/__tests__/lib/ai/tools/todo.test.ts`:
- 13 test cases covering all CRUD operations
- Tool callback validation
- Error handling scenarios
- All tests passing ✓

Run tests with:
```bash
yarn test __tests__/lib/ai/tools/todo.test.ts
```

## Integration

The todo tools are automatically registered with the MCP server when the route is accessed. No additional configuration is needed beyond the standard MCP client setup used elsewhere in the application.

## Future Enhancements

Potential improvements could include:
- Persistent database storage
- User-specific todo lists
- Due dates and priorities
- Tags and categories
- Subtasks and checklists
- Search and filtering capabilities
- Recurring todos
- Collaboration features
