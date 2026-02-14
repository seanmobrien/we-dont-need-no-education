import z from 'zod';
const todoStatusEnum = z.enum(['pending', 'active', 'complete']);
const todoPriorityEnum = z.enum(['high', 'medium', 'low']);
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
    .refine((val) => val.title !== undefined ||
    val.description !== undefined ||
    val.completed !== undefined ||
    val.status !== undefined ||
    val.priority !== undefined, {
    message: 'At least one field to update must be provided',
});
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
    .refine((val) => val.title !== undefined ||
    val.description !== undefined ||
    val.status !== undefined ||
    val.priority !== undefined, {
    message: 'At least one field to update must be provided',
});
export function validateCreateTodoList(raw) {
    const parsed = createTodoListRequestSchema.safeParse(raw);
    if (!parsed.success)
        return { success: false, error: parsed.error };
    return { success: true, data: parsed.data };
}
export function validateUpdateTodoList(raw) {
    const parsed = updateTodoListRequestSchema.safeParse(raw);
    if (!parsed.success)
        return { success: false, error: parsed.error };
    return { success: true, data: parsed.data };
}
export function validateCreateTodoItem(raw) {
    const parsed = createTodoItemRequestSchema.safeParse(raw);
    if (!parsed.success)
        return { success: false, error: parsed.error };
    return { success: true, data: parsed.data };
}
export function validateUpdateTodoItem(raw) {
    const parsed = updateTodoItemRequestSchema.safeParse(raw);
    if (!parsed.success)
        return { success: false, error: parsed.error };
    return { success: true, data: parsed.data };
}
//# sourceMappingURL=todo-validation.js.map