import z from 'zod';

// Todo status enum
const todoStatusEnum = z.enum(['pending', 'active', 'complete']);

// Todo priority enum
const todoPriorityEnum = z.enum(['high', 'medium', 'low']);

// Todo Item schemas
export const createTodoItemRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  completed: z.boolean().optional(),
  status: todoStatusEnum.optional(),
  priority: todoPriorityEnum.optional(),
});

export const updateTodoItemRequestSchema = z
  .object({
    itemId: z.string().min(1, 'Invalid item ID'),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    completed: z.boolean().optional(),
    status: todoStatusEnum.optional(),
    priority: todoPriorityEnum.optional(),
  })
  .refine(
    (val) =>
      val.title !== undefined ||
      val.description !== undefined ||
      val.completed !== undefined ||
      val.status !== undefined ||
      val.priority !== undefined,
    {
      message: 'At least one field to update must be provided',
    },
  );

// Todo List schemas
export const createTodoListRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: todoStatusEnum.optional(),
  priority: todoPriorityEnum.optional(),
});

export const updateTodoListRequestSchema = z
  .object({
    listId: z.string().min(1, 'Invalid list ID'),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: todoStatusEnum.optional(),
    priority: todoPriorityEnum.optional(),
  })
  .refine(
    (val) =>
      val.title !== undefined ||
      val.description !== undefined ||
      val.status !== undefined ||
      val.priority !== undefined,
    {
      message: 'At least one field to update must be provided',
    },
  );

export type CreateTodoItemRequest = z.infer<
  typeof createTodoItemRequestSchema
>;
export type UpdateTodoItemRequest = z.infer<
  typeof updateTodoItemRequestSchema
>;
export type CreateTodoListRequest = z.infer<
  typeof createTodoListRequestSchema
>;
export type UpdateTodoListRequest = z.infer<
  typeof updateTodoListRequestSchema
>;

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  error: z.ZodError;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function validateCreateTodoList(
  raw: unknown,
): ValidationResult<CreateTodoListRequest> {
  const parsed = createTodoListRequestSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error };
  return { success: true, data: parsed.data };
}

export function validateUpdateTodoList(
  raw: unknown,
): ValidationResult<UpdateTodoListRequest> {
  const parsed = updateTodoListRequestSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error };
  return { success: true, data: parsed.data };
}

export function validateCreateTodoItem(
  raw: unknown,
): ValidationResult<CreateTodoItemRequest> {
  const parsed = createTodoItemRequestSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error };
  return { success: true, data: parsed.data };
}

export function validateUpdateTodoItem(
  raw: unknown,
): ValidationResult<UpdateTodoItemRequest> {
  const parsed = updateTodoItemRequestSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error };
  return { success: true, data: parsed.data };
}
