import { log } from '/lib/logger';
import {
  toolCallbackResultFactory,
  toolCallbackResultSchemaFactory,
} from '../utility';
import { getTodoManager, Todo } from './todo-manager';
import z from 'zod';
import { LoggedError } from '/lib/react-util/errors/logged-error';
import { isError } from '/lib/react-util/utility-methods';

// Zod schema for Todo serialization
const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  completed: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Helper to serialize todos
function serializeTodo(todo: Todo) {
  return {
    ...todo,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}

// Create Todo Tool
export const createTodoCallback = ({
  title,
  description,
}: {
  title: string;
  description?: string;
}) => {
  try {
    log((l) =>
      l.info('createTodo tool called', { title, description }),
    );

    const manager = getTodoManager();
    const todo = manager.createTodo(title, description);
    
    return toolCallbackResultFactory(serializeTodo(todo));
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'createTodo',
      log: true,
    });
    const message = `Failed to create todo: ${isError(error) ? error.message : String(error)}`;
    return toolCallbackResultFactory(new Error(message), message);
  }
};

export const createTodoConfig = {
  description: 'Create a new todo item with a title and optional description.',
  inputSchema: {
    title: z.string().describe('The title of the todo item'),
    description: z
      .string()
      .optional()
      .describe('Optional description for the todo item'),
  },
  outputSchema: toolCallbackResultSchemaFactory(TodoSchema),
  annotations: {
    title: 'Create Todo',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
} as const;

// Get Todos Tool
export const getTodosCallback = ({
  completed,
}: {
  completed?: boolean;
}) => {
  try {
    log((l) =>
      l.info('getTodos tool called', { completed }),
    );

    const manager = getTodoManager();
    const todos = manager.getTodos(completed);
    
    return toolCallbackResultFactory(todos.map(serializeTodo));
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'getTodos',
      log: true,
    });
    const message = `Failed to get todos: ${isError(error) ? error.message : String(error)}`;
    return toolCallbackResultFactory(new Error(message), message);
  }
};

export const getTodosConfig = {
  description:
    'Get all todos, optionally filtered by completion status. If completed is not specified, returns all todos.',
  inputSchema: {
    completed: z
      .boolean()
      .optional()
      .describe(
        'Optional filter - true for completed todos, false for incomplete todos, omit for all todos',
      ),
  },
  outputSchema: toolCallbackResultSchemaFactory(z.array(TodoSchema)),
  annotations: {
    title: 'Get Todos',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

// Update Todo Tool
export const updateTodoCallback = ({
  id,
  title,
  description,
  completed,
}: {
  id: string;
  title?: string;
  description?: string;
  completed?: boolean;
}) => {
  try {
    log((l) =>
      l.info('updateTodo tool called', { id, title, description, completed }),
    );

    const manager = getTodoManager();
    const todo = manager.updateTodo(id, { title, description, completed });
    
    if (!todo) {
      return toolCallbackResultFactory(
        new Error(`Todo with id ${id} not found`),
        `Todo with id ${id} not found`,
      );
    }
    
    return toolCallbackResultFactory(serializeTodo(todo));
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'updateTodo',
      log: true,
    });
    const message = `Failed to update todo: ${isError(error) ? error.message : String(error)}`;
    return toolCallbackResultFactory(new Error(message), message);
  }
};

export const updateTodoConfig = {
  description:
    'Update an existing todo item. You can update the title, description, and/or completion status.',
  inputSchema: {
    id: z.string().describe('The ID of the todo to update'),
    title: z.string().optional().describe('New title for the todo'),
    description: z
      .string()
      .optional()
      .describe('New description for the todo'),
    completed: z
      .boolean()
      .optional()
      .describe('New completion status for the todo'),
  },
  outputSchema: toolCallbackResultSchemaFactory(TodoSchema),
  annotations: {
    title: 'Update Todo',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

// Delete Todo Tool
export const deleteTodoCallback = ({
  id,
}: {
  id: string;
}) => {
  try {
    log((l) =>
      l.info('deleteTodo tool called', { id }),
    );

    const manager = getTodoManager();
    const result = manager.deleteTodo(id);
    
    if (!result) {
      return toolCallbackResultFactory(
        new Error(`Todo with id ${id} not found`),
        `Todo with id ${id} not found`,
      );
    }
    
    return toolCallbackResultFactory({ success: true, id });
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'deleteTodo',
      log: true,
    });
    const message = `Failed to delete todo: ${isError(error) ? error.message : String(error)}`;
    return toolCallbackResultFactory(new Error(message), message);
  }
};

export const deleteTodoConfig = {
  description: 'Delete a todo item by its ID.',
  inputSchema: {
    id: z.string().describe('The ID of the todo to delete'),
  },
  outputSchema: toolCallbackResultSchemaFactory(
    z.object({
      success: z.boolean(),
      id: z.string(),
    }),
  ),
  annotations: {
    title: 'Delete Todo',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

// Toggle Todo Completion Tool
export const toggleTodoCallback = ({
  id,
}: {
  id: string;
}) => {
  try {
    log((l) =>
      l.info('toggleTodo tool called', { id }),
    );

    const manager = getTodoManager();
    const todo = manager.toggleTodo(id);
    
    if (!todo) {
      return toolCallbackResultFactory(
        new Error(`Todo with id ${id} not found`),
        `Todo with id ${id} not found`,
      );
    }
    
    return toolCallbackResultFactory(serializeTodo(todo));
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'toggleTodo',
      log: true,
    });
    const message = `Failed to toggle todo: ${isError(error) ? error.message : String(error)}`;
    return toolCallbackResultFactory(new Error(message), message);
  }
};

export const toggleTodoConfig = {
  description:
    'Toggle the completion status of a todo item. If completed, it becomes incomplete; if incomplete, it becomes completed.',
  inputSchema: {
    id: z.string().describe('The ID of the todo to toggle'),
  },
  outputSchema: toolCallbackResultSchemaFactory(TodoSchema),
  annotations: {
    title: 'Toggle Todo',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
} as const;
