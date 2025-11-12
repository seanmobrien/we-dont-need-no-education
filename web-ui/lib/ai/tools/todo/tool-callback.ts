import { log } from '@/lib/logger';
import {
  toolCallbackResultFactory,
  toolCallbackResultSchemaFactory,
} from '../utility';
import {
  getTodoManager,
  Todo,
  TodoList,
  TodoPriority,
  TodoStatus,
} from './todo-manager';
import { SEQUENTIAL_THINKING_TOOL_NAME } from '@/lib/ai/tools/sequentialthinking/tool-callback';
import z from 'zod';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { isError } from '@/lib/react-util/utility-methods';
import { auth } from '@/auth';

// Zod schema for Todo serialization
const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  completed: z.boolean(),
  status: z.enum(['pending', 'active', 'complete']),
  priority: z.enum(['high', 'medium', 'low']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const TodoListSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(['pending', 'active', 'complete']),
  priority: z.enum(['high', 'medium', 'low']),
  todos: z.array(TodoSchema),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

type TodoListLike = TodoList;

const DEFAULT_LIST_STATUS: TodoStatus = 'active';
const DEFAULT_LIST_PRIORITY: TodoPriority = 'medium';

// Helper to serialize todos
function serializeTodo(todo: Todo) {
  return {
    ...todo,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}

function serializeTodoList(list: TodoListLike) {
  return {
    id: list.id,
    title: list.title,
    description: list.description,
    status: list.status ?? DEFAULT_LIST_STATUS,
    priority: list.priority ?? DEFAULT_LIST_PRIORITY,
    todos: list.todos.map(serializeTodo),
    createdAt: list.createdAt?.toISOString(),
    updatedAt: list.updatedAt?.toISOString(),
  };
}

// Create Todo Tool
export const createTodoCallback = async ({
  listId,
  title,
  description,
  status,
  priority,
  todos,
}: {
  listId?: string;
  title: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  todos?: Array<{
    id?: string;
    title: string;
    description?: string;
    status?: TodoStatus;
    completed?: boolean;
    priority?: TodoPriority;
  }>;
}) => {
  try {
    // Get userId from session
    const session = await auth();
    const userId = session?.user?.id;

    log((l) =>
      l.info('createTodoList tool called', {
        listId,
        title,
        todoCount: todos?.length ?? 0,
        status,
        priority,
        userId,
      }),
    );

    const manager = getTodoManager();
    const list = await manager.upsertTodoList(
      {
        id: listId,
        title,
        description,
        status,
        priority,
        todos: todos?.map((todo) => ({
          id: todo.id,
          title: todo.title,
          description: todo.description,
          status: todo.status,
          completed: todo.completed,
          priority: todo.priority,
        })),
      },
      { session },
    );

    return toolCallbackResultFactory(serializeTodoList(list));
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'createTodo',
      log: true,
    });
    const message = `Failed to create todo list: ${isError(error) ? error.message : String(error)}`;
    return toolCallbackResultFactory(new Error(message), message);
  }
};

export const createTodoConfig = {
  description: `## Purpose
Create or replace a Title IX / FERPA compliance task list. Provide the full set of todos the list should contain—existing lists with the same id are completely replaced.

## When to Use
- Establish the initial investigation or response plan for a case
- After using the ${SEQUENTIAL_THINKING_TOOL_NAME} tool to outline next steps
- Replace an outdated list after re-prioritizing work
- Sync cross-functional tasks (investigations, student care, documentation)
- Capture bulk updates from external planning tools or reports

## Guidance
1. Include every todo that should remain on the list; omitted items are removed when the list is replaced.
2. Use compliance-aware titles/descriptions (e.g., "Notify complainant of interim measures", "Log FERPA disclosure decision").
3. Align list status/priority with scheduling urgency so downstream reporting stays accurate.
4. Prefer stable ids when rewriting a list so existing task references remain valid for updates.
5. Store sensitive case details in secure systems and reference them by identifier instead of copying protected data.

## Success Criteria
- List metadata matches the case context and urgency
- Todos mirror the latest workflow state (status, completion, priority)
- Stakeholders can immediately act on the returned list without further clarification
`,
  inputSchema: {
    listId: z
      .string()
      .optional()
      .describe(
        'Optional identifier for the list. When provided, the existing list with this id is replaced.',
      ),
    title: z.string().describe('Title for the todo list.'),
    description: z
      .string()
      .optional()
      .describe(
        'Optional narrative explaining the list purpose or case context.',
      ),
    status: z
      .enum(['pending', 'active', 'complete'])
      .optional()
      .describe('Optional workflow status for the list.'),
    priority: z
      .enum(['high', 'medium', 'low'])
      .optional()
      .describe('Optional priority level for the list.'),
    todos: z
      .array(
        z.object({
          id: z
            .string()
            .optional()
            .describe(
              'Optional stable identifier for the todo. Provide when replacing lists to preserve references.',
            ),
          title: z.string().describe('Short, action-oriented task title.'),
          description: z
            .string()
            .optional()
            .describe('Context, evidence references, or follow-up notes.'),
          status: z
            .enum(['pending', 'active', 'complete'])
            .optional()
            .describe('Workflow status for the todo.'),
          completed: z
            .boolean()
            .optional()
            .describe('Optional completion flag. Defaults based on status.'),
          priority: z
            .enum(['high', 'medium', 'low'])
            .optional()
            .describe('Optional priority level for the todo.'),
        }),
      )
      .optional()
      .describe(
        'Complete set of todos for the list. Items not included here will be removed when replacing an existing list.',
      ),
  },
  outputSchema: toolCallbackResultSchemaFactory(TodoListSchema),
  annotations: {
    title: 'Create Todo List',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
} as const;

// Get Todos Tool
export const getTodosCallback = async ({
  completed,
  listId,
}: {
  completed?: boolean;
  listId?: string;
}) => {
  try {
    // Get userId from session
    const session = await auth();
    const userId = session?.user?.id;

    log((l) => l.info('getTodos tool called', { completed, listId, userId }));

    const manager = getTodoManager();

    if (listId) {
      const list =
        manager.getTodoList(listId, { completed }) ??
        manager.getTodoList(listId);

      if (!list) {
        const message = `Todo list with id ${listId} not found`;
        return toolCallbackResultFactory(new Error(message), message);
      }

      return toolCallbackResultFactory(serializeTodoList(list));
    }

    const lists = manager.getTodoLists({ completed });

    return toolCallbackResultFactory(
      lists.map((list) => serializeTodoList(list)),
    );
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
  description: `## Overview
Use this tool to read the current to-do list for the session. Check it proactively and frequently so you're always aware of the current task list.

## When to Use
- At the beginning of conversations to see what's pending
- Before starting new tasks to prioritize work
- When the user asks about previous tasks or plans
- Whenever you're uncertain about what to do next
- After completing tasks to update your understanding of remaining work
- After every few messages to ensure you're on track
- When working on tasks that benefit from a todo list

## Persistence Reminder
**CRITICAL:** Keep checking todos throughout the conversation. Do not assume you remember—always verify the current state. You cannot maintain context between conversations without reading todos.

## Instructions
### Comprehensive Coverage
This tool tracks all work types:
- ${SEQUENTIAL_THINKING_TOOL_NAME} and action-plan execution (documenting each step as you complete it)
- Title IX and FERPA compliance analysis, evidence gathering, and reporting
- Case documentation (timelines, complaints, violation narratives)
- Stakeholder coordination and follow-up actions
- Review cycles (compliance reviews, risk assessments, audit preparation)

### Skip Conditions
Only skip using this tool when:
- The user explicitly says "start fresh" or "ignore previous todos"
- You **just** updated todos (within the last 30 seconds)
- The request is a pure factual question with zero task implications
- You are starting a new conversation and todo-related context was provided in the request

## Usage Notes
- Leave the input blank to fetch every list, or provide optional filters:
  - \`completed\`: \`true\` for finished items, \`false\` for in-progress items, omit for everything
  - \`listId\`: return only the specified list; omit to retrieve all lists
- Responses may include multiple lists or a single list depending on the inputs
- Use the returned data to track progress and plan next steps
- If no todos exist yet, an empty list will be returned—immediately call \`todo_write\` to plan the requested work

## Response
Returns JSON with one of the following shapes:
- \`items\`: array of todo lists (default when no \`listId\` is supplied)
- \`value\`: single todo list object (when \`listId\` is provided)
- \`isError: true\` with optional message when a list cannot be found
Each todo list contains metadata plus a \`todos\` collection, and every todo includes \`id\`, \`content\`, \`status\`, \`priority\`, and \`adr\`.
`,
  inputSchema: {
    completed: z
      .boolean()
      .optional()
      .describe(
        'Optional filter - true for completed todos, false for incomplete todos, omit for all todos',
      ),
    listId: z
      .string()
      .optional()
      .describe(
        'Optional list identifier. When provided, returns only the matching todo list.',
      ),
  },
  outputSchema: {
    result: z.union([
      z.object({
        isError: z.literal(true),
        message: z.string().optional(),
        cause: z.any().optional(),
      }),
      z.object({
        isError: z.literal(false).optional(),
        value: TodoListSchema.optional(),
        items: z.undefined().optional(),
      }),
      z.object({
        isError: z.literal(false).optional(),
        items: z.array(TodoListSchema).optional(),
        value: z.undefined().optional(),
      }),
    ]),
  },
  annotations: {
    title: 'Get Todos',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

// Update Todo Tool
export const updateTodoCallback = async ({
  id,
  title,
  description,
  completed,
  status,
  priority,
}: {
  id: string;
  title?: string;
  description?: string;
  completed?: boolean;
  status?: TodoStatus;
  priority?: TodoPriority;
}) => {
  try {
    // Get userId from session
    const session = await auth();
    const userId = session?.user?.id;

    log((l) =>
      l.info(`update todo called`, {
        id,
        title,
        description,
        completed,
        status,
        priority,
        userId,
      }),
    );

    const manager = getTodoManager();
    const todo = manager.updateTodo(id, {
      title,
      description,
      completed,
      status,
      priority,
    });

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
  description: `## Purpose
Use this tool to update an existing task so the session stays aligned with Title IX and FERPA compliance workflows. Refreshing a task keeps investigators, coordinators, and support staff synced on the latest findings, deadlines, and follow-up steps.

## When to Update
- New evidence, interviews, or notifications affect a task's scope or urgency
- Case leads adjust responsibilities or need to record coordination notes
- A todo list needs to reflect cross-department work (investigations, documentation, student support)
- Status or priority changes would influence reporting cadences or escalation paths
- A user explicitly requests changes to a tracked task

## Workflow Guardrails
1. Review the current todo list first (prefer \`todo_read\`) so existing context isn't overwritten.
2. Confirm the correct list and item. Lists support our schema: \`status\` (pending | active | complete) and \`priority\` (high | medium | low).
3. Update only the fields that materially changed: title, description, status, completion, or priority. Leave untouched data out of the payload.
4. Capture compliance-sensitive notes in the description—summaries of incident details, FERPA access decisions, outreach commitments, or deadlines.
5. Follow the single in-progress rule: if you complete a task or change ownership, mark the next actionable item in the same list immediately.

## Field Reference
- **id**: Stable identifier for the todo item
- **title**: Short headline (e.g., "Review interim supportive measures")
- **description**: Context, decisions, evidence references, or follow-up reminders
- **status**: pending → active → complete; mirrors our workflow gating
- **completed**: Boolean mirror of \`status\` for downstream compatibility
- **priority**: High (urgent/compliance risk), Medium (time-bound), Low (monitor only)

## Compliance Tips
- Note Title IX deadlines (intake, investigation, resolution) directly in the task for visibility.
- Record stakeholder notifications or required approvals when they occur.

## Success Checklist
1. Read the latest list data.
2. Apply the focused changes.
3. Verify the task reflects the correct status/priority pair.
4. If the item is complete, queue any follow-up tasks in the same call.
5. Communicate notable changes back to the user or in the session summary.
`,
  inputSchema: {
    id: z.string().describe('The ID of the todo to update'),
    title: z.string().optional().describe('New title for the todo'),
    description: z.string().optional().describe('New description for the todo'),
    completed: z
      .boolean()
      .optional()
      .describe('New completion status for the todo'),
    status: z
      .enum(['pending', 'active', 'complete'])
      .optional()
      .describe('New status for the todo'),
    priority: z
      .enum(['high', 'medium', 'low'])
      .optional()
      .describe('New priority for the todo'),
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
export const deleteTodoCallback = async ({ id }: { id: string }) => {
  try {
    // Get userId from session
    const session = await auth();
    const userId = session?.user?.id;

    log((l) => l.info('deleteTodo tool called', { id, userId }));

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
export const toggleTodoCallback = async ({ id }: { id: string }) => {
  try {
    // Get userId from session
    const session = await auth();
    const userId = session?.user?.id;

    log((l) => l.info('toggleTodo tool called', { id, userId }));

    const manager = getTodoManager();
    const list = manager.toggleTodo(id);

    if (!list) {
      return toolCallbackResultFactory(
        new Error(`Todo with id ${id} not found`),
        `Todo with id ${id} not found`,
      );
    }

    return toolCallbackResultFactory(serializeTodoList(list));
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
    'Advance a todo through pending → active → complete and automatically update the parent list status (active when work starts, complete when all tasks finish).',
  inputSchema: {
    id: z.string().describe('The ID of the todo to toggle'),
  },
  outputSchema: toolCallbackResultSchemaFactory(TodoListSchema),
  annotations: {
    title: 'Toggle Todo',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
} as const;
