import { NextResponse } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { getTodoManager } from '@/lib/ai/tools/todo/todo-manager';
import { validateCreateTodoList, validateUpdateTodoList, } from '@/lib/api/todo/todo-validation';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
export const dynamic = 'force-dynamic';
export const GET = wrapRouteRequest(async () => {
    const todoManager = await getTodoManager();
    const lists = await todoManager.getTodoLists({});
    const listsWithCounts = lists.map((list) => ({
        ...list,
        totalItems: list.todos.length,
        completedItems: list.todos.filter((t) => t.completed).length,
        pendingItems: list.todos.filter((t) => !t.completed).length,
    }));
    return NextResponse.json({ data: listsWithCounts }, { status: 200 });
});
export const POST = wrapRouteRequest(async (req) => {
    try {
        const raw = await req.json();
        const validated = validateCreateTodoList(raw);
        if (!validated.success) {
            return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });
        }
        const todoManager = await getTodoManager();
        const createdList = await todoManager.upsertTodoList({
            title: validated.data.title,
            description: validated.data.description,
            status: validated.data.status,
            priority: validated.data.priority,
        });
        return NextResponse.json({
            message: 'Todo list created successfully',
            data: createdList,
        }, { status: 201 });
    }
    catch (error) {
        if (ValidationError.isValidationError(error)) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        throw error;
    }
});
export const PUT = wrapRouteRequest(async (req) => {
    try {
        const raw = await req.json();
        const validated = validateUpdateTodoList(raw);
        if (!validated.success) {
            return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });
        }
        const todoManager = await getTodoManager();
        const existingList = await todoManager.getTodoList(validated.data.listId, {});
        if (!existingList) {
            return NextResponse.json({ error: 'Todo list not found' }, { status: 404 });
        }
        const updatedList = await todoManager.upsertTodoList({
            id: validated.data.listId,
            title: validated.data.title ?? existingList.title,
            description: validated.data.description ?? existingList.description,
            status: validated.data.status ?? existingList.status,
            priority: validated.data.priority ?? existingList.priority,
            todos: existingList.todos,
            createdAt: existingList.createdAt,
        });
        return NextResponse.json({ message: 'Todo list updated successfully', data: updatedList }, { status: 200 });
    }
    catch (error) {
        if (ValidationError.isValidationError(error)) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        throw error;
    }
});
export const DELETE = wrapRouteRequest(async (req) => {
    const { listId } = await req.json();
    if (!listId) {
        return NextResponse.json({ error: 'List ID is required' }, { status: 400 });
    }
    const todoManager = await getTodoManager();
    const deleted = await todoManager.deleteTodoList(listId, {});
    if (!deleted) {
        return NextResponse.json({ error: 'Todo list not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Todo list deleted successfully' }, { status: 200 });
});
//# sourceMappingURL=route.js.map