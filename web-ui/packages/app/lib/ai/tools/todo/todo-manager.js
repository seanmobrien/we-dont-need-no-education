import { auth } from '@/auth';
import { log, logEvent } from '@compliance-theater/logger';
import { unauthorizedServiceResponse } from '@/lib/nextjs-util/server';
import { ApiRequestError } from '@compliance-theater/send-api-request';
import { globalRequiredSingletonAsync, SingletonProvider, } from '@compliance-theater/typescript/singleton-provider';
import { NextResponse } from 'next/server';
import { InMemoryStorageStrategy } from './storage';
import { isError, LoggedError } from '@compliance-theater/logger';
import { createStorageStrategyFromFlags } from './todo-manager-factory';
import { createStorageStrategy } from './storage/factory';
const DEFAULT_LIST_ID = 'default';
const DEFAULT_LIST_TITLE = 'Default Todo List';
const DEFAULT_LIST_DESCRIPTION = 'This is the default todo list.';
const DEFAULT_LIST_STATUS = 'active';
const DEFAULT_PRIORITY = 'medium';
const DEFAULT_ITEM_TITLE = 'New Task';
const DEFAULT_ITEM_DESCRIPTION = '';
export class TodoManager {
    storage;
    constructor(storage) {
        this.storage = storage ?? new InMemoryStorageStrategy();
        log((l) => l.debug('TodoManager instance created'));
    }
    async createTodo(title, description, options) {
        const list = await (options?.listId
            ? this.getTodoList(options.listId, {
                session: options?.session,
            })
            : this.ensureDefaultList({ session: options?.session }));
        if (!list) {
            throw new ApiRequestError('Unable to find or create default todo list', NextResponse.json({ error: 'Unable to find or create default todo list' }, { status: 405 }));
        }
        const todo = await this.createTodoRecord({
            title,
            description,
            status: options?.status,
            priority: options?.priority,
        }, list, options?.session);
        logEvent('info', 'TODO Item created', {
            itemId: todo.id,
            listId: list.id,
        });
        return todo;
    }
    static async #todoItemUpsertInsertFactory(todo, { session, now: nowFromProps, existing, }) {
        const now = nowFromProps ?? new Date();
        let toolId;
        let activeSession;
        if (todo.id) {
            const [validSession] = await TodoManager.validateTodoId({
                check: todo.id,
                session,
            });
            activeSession = validSession;
            toolId = todo.id;
        }
        else {
            const [id, validSession] = await TodoManager.generateTodoId({ session });
            activeSession = validSession;
            toolId = id;
        }
        const { status, completed } = TodoManager.#resolveStatusAndCompletion(existing ?? {
            status: todo.status || 'pending',
            completed: false,
        }, todo);
        return {
            title: todo.title ?? existing?.title ?? DEFAULT_ITEM_TITLE,
            description: todo.description ?? existing?.description ?? DEFAULT_ITEM_DESCRIPTION,
            priority: todo.priority ?? existing?.priority ?? 'medium',
            createdAt: now,
            updatedAt: now,
            id: toolId,
            status,
            completed,
            userId: activeSession.user.id,
        };
    }
    async upsertTodoList(input, { session } = {}) {
        if (!input) {
            throw new TypeError('TodoListUpsertInput is required');
        }
        const now = new Date();
        let activeSession;
        let listId;
        let existingList;
        if (input.id) {
            const sessionAndId = await TodoManager.validateTodoId({
                check: input.id,
                session,
            });
            activeSession = sessionAndId[0];
            listId = sessionAndId[1];
            existingList = await this.storage.getTodoList(input.id);
        }
        else {
            const sessionAndId = await TodoManager.generateTodoId({
                session,
                salt: 'list',
            });
            activeSession = sessionAndId[1];
            listId = sessionAndId[0];
        }
        const todos = await Promise.all((input.todos ?? []).map((t1) => TodoManager.#todoItemUpsertInsertFactory(t1, {
            session: activeSession,
            now,
            existing: existingList?.todos.find((et) => et.id === t1.id),
        })));
        return await this.storage.upsertTodoList({
            id: listId,
            title: input.title ?? existingList?.title ?? DEFAULT_LIST_TITLE,
            description: input.description ??
                existingList?.description ??
                DEFAULT_LIST_DESCRIPTION,
            status: input.status ?? existingList?.status ?? 'active',
            priority: input.priority ?? existingList?.priority ?? 'medium',
            todos: todos,
            createdAt: input.createdAt ?? existingList?.createdAt ?? now,
            updatedAt: input.updatedAt ?? now,
            userId: activeSession.user.id,
        });
    }
    async getTodoLists({ completed, session, } = {}) {
        const [prefix] = await TodoManager.generateTodoPrefix({
            session,
        });
        return await this.storage.getTodoLists({ completed: completed, prefix });
    }
    async getTodoList(id, { session }) {
        await TodoManager.validateTodoId({ check: id, session });
        return this.storage.getTodoList(id).then((x) => x ?? undefined);
    }
    async getTodos(completedOrOptions) {
        let completed;
        let activeSession;
        if (typeof completedOrOptions === 'boolean') {
            completed = completedOrOptions;
            activeSession = await auth();
        }
        else if (completedOrOptions) {
            completed = completedOrOptions.completed;
            activeSession = completedOrOptions.session ?? (await auth());
        }
        else {
            completed = undefined;
            activeSession = await auth();
        }
        if (!activeSession) {
            throw new ApiRequestError('No session available', unauthorizedServiceResponse({
                req: undefined,
                scopes: ['mcp-tools:read'],
            }));
        }
        const [prefix] = await TodoManager.generateTodoPrefix({
            session: activeSession,
        });
        return this.storage.getTodos({ completed, prefix });
    }
    async getTodo(id, { session } = {}) {
        await TodoManager.validateTodoId({ check: id, session });
        return this.storage.getTodo(id).then((x) => x ?? undefined);
    }
    async updateTodo(id, updates, options) {
        let activeSession = null;
        if (id) {
            const [ses] = await TodoManager.validateTodoId({
                check: id,
                session: options?.session,
            });
            activeSession = ses;
        }
        else {
            const [tempId, ses] = await TodoManager.generateTodoId({
                session: options?.session,
            });
            id = tempId;
            activeSession = ses;
        }
        const todo = await this.storage.getTodo(id);
        let actualListId;
        let list;
        if (options?.list) {
            list = options.list;
            actualListId = list.id;
        }
        else {
            const tryListId = options?.listId ??
                (await this.getListIdFromTodoId(id, { session: activeSession }));
            if (tryListId) {
                actualListId = tryListId;
                const tryList = await this.getTodoList(actualListId, {
                    session: activeSession,
                });
                if (tryList) {
                    list = tryList;
                }
                else {
                    return undefined;
                }
            }
            else {
                return undefined;
            }
        }
        TodoManager.validateTodoId({ check: list.id, session: activeSession });
        const { status: nextStatus, completed: nextCompleted } = TodoManager.#resolveStatusAndCompletion(todo ?? {
            status: updates.status ?? 'pending',
            completed: updates.completed || updates.status === 'complete',
        }, updates);
        const nextPriority = updates.priority ?? 'medium';
        const now = new Date();
        const updatedTodo = {
            ...(todo ?? {
                id,
                createdAt: now,
            }),
            title: updates.title ?? todo?.title ?? 'New TODO',
            description: updates.description ?? todo?.description ?? 'TODO Description',
            priority: nextPriority,
            status: nextStatus,
            completed: nextCompleted,
            updatedAt: now,
        };
        const idx = list.todos.findIndex((t) => t.id === id);
        if (idx !== -1) {
            list.todos[idx] = updatedTodo;
        }
        else {
            list.todos.push(updatedTodo);
        }
        list.updatedAt = updatedTodo.updatedAt;
        this.updateListStatus(list);
        await this.storage.upsertTodo(updatedTodo, { list });
        logEvent('info', 'TODO Item Updated', {
            userId: activeSession?.user?.id ?? 'anonymous',
            itemId: id,
            listId: list.id,
        });
        return updatedTodo;
    }
    async getListIdFromTodoId(id, { session } = {}) {
        const ret = await this.storage.getTodoToListMapping(id);
        if (ret) {
            await TodoManager.validateTodoId({ check: id, session });
        }
        return ret;
    }
    async deleteTodo(id, { session } = {}) {
        try {
            const [activeSession] = await TodoManager.validateTodoId({
                check: id,
                session,
            });
            const listId = await this.getListIdFromTodoId(id, {
                session: activeSession,
            });
            const list = listId
                ? await this.getTodoList(listId, { session: activeSession })
                : undefined;
            const result = await this.storage.deleteTodo(id);
            if (result) {
                logEvent('info', 'TODO Item deleted', {
                    userId: activeSession.user?.id ?? 'anonymous',
                    itemId: id,
                    listId: list?.id ?? '[none]',
                });
                if (list) {
                    const nextTodos = list.todos.filter((todo) => todo.id !== id);
                    if (nextTodos.length !== list.todos.length) {
                        list.todos = nextTodos;
                        list.updatedAt = new Date();
                        this.updateListStatus(list);
                        await this.storage.upsertTodoList(list);
                    }
                }
                return true;
            }
            return false;
        }
        catch (err) {
            LoggedError.isTurtlesAllTheWayDownBaby(err, {
                log: true,
                source: 'TodoManager.deleteTodo',
            });
            return false;
        }
    }
    async deleteTodoList(id, { session } = {}) {
        try {
            await TodoManager.validateTodoId({
                check: id,
                session,
            });
            return this.storage.deleteTodoList(id);
        }
        catch (err) {
            LoggedError.isTurtlesAllTheWayDownBaby(err, {
                log: true,
                source: 'TodoManager.deleteTodo',
            });
            return false;
        }
    }
    async toggleTodo(id, { session } = {}) {
        try {
            const [activeSession] = await TodoManager.validateTodoId({
                check: id,
                session,
            });
            const listId = await this.storage.getTodoToListMapping(id);
            const list = listId
                ? await this.getTodoList(listId, { session: activeSession })
                : undefined;
            const todo = await this.getTodo(id, { session: activeSession });
            if (!list) {
                if (todo) {
                    await this.storage.deleteTodo(id);
                }
                return undefined;
            }
            if (!todo) {
                log((l) => l.warn('Toggle requested for missing todo item', { id }));
                return list;
            }
            const { status: nextStatus, completed: nextCompleted } = this.advanceTodoState(todo);
            const updatedTodo = {
                ...todo,
                status: nextStatus,
                completed: nextCompleted,
                updatedAt: new Date(),
            };
            const idx = list.todos.findIndex((item) => item.id === id);
            if (idx !== -1) {
                list.todos[idx] = updatedTodo;
            }
            else {
                list.todos.push(updatedTodo);
            }
            list.updatedAt = updatedTodo.updatedAt;
            this.updateListStatus(list);
            await this.storage.upsertTodoList(list);
            logEvent('info', 'TODO Item toggled', {
                userId: activeSession.user?.id ?? 'anonymous',
                itemId: id,
                listId: list.id,
                status: updatedTodo.status,
                completed: updatedTodo.completed ? 'true' : 'false',
            });
            return list;
        }
        catch (err) {
            LoggedError.isTurtlesAllTheWayDownBaby(err, {
                log: true,
                source: 'TodoManager.toggleTodo',
            });
            return undefined;
        }
    }
    async clearAll({ session, } = {}) {
        try {
            const [prefix, activeSession] = await TodoManager.generateTodoPrefix({
                session,
            });
            const { todosCleared, listsCleared } = await this.storage.clearAll({
                prefix,
            });
            logEvent('info', 'TODO items and lists cleared for user', {
                userId: activeSession.user?.id ?? 'anonymous',
                todosCleared,
                listsCleared,
            });
            return true;
        }
        catch (err) {
            LoggedError.isTurtlesAllTheWayDownBaby(err, {
                log: true,
                source: 'TodoManager.clearAll',
            });
            return false;
        }
    }
    async getCount({ session, } = {}) {
        try {
            const [prefix] = await TodoManager.generateTodoPrefix({ session });
            return await this.storage.getCount({ prefix });
        }
        catch (err) {
            LoggedError.isTurtlesAllTheWayDownBaby(err, {
                log: true,
                source: 'TodoManager.getCount',
            });
            return -1;
        }
    }
    async createTodoRecord(input, list, session) {
        if (!list) {
            throw new TypeError('Todo list is required to create a todo item');
        }
        let activeSession = null;
        let inputId;
        if (input.id) {
            const [active] = await TodoManager.validateTodoId({
                check: input.id,
                session,
            });
            inputId = input.id;
            activeSession = active;
        }
        else {
            const [id, active] = await TodoManager.generateTodoId({
                suffix: undefined,
                session,
                salt: 'todo',
            });
            activeSession = active;
            inputId = id;
        }
        const now = new Date();
        const { status, completed } = this.resolveCreationStatusAndCompletion({
            status: input.status,
            completed: input.completed,
        });
        const createdAt = input.createdAt ?? now;
        const updatedAt = input.updatedAt ?? now;
        const todo = {
            id: inputId,
            title: input.title ?? 'Untitled Task',
            description: input.description,
            completed,
            status,
            priority: input.priority ?? 'medium',
            createdAt,
            updatedAt,
        };
        const result = await this.updateTodo(inputId, todo, {
            session: activeSession,
            list: list,
        });
        if (!result) {
            throw new ApiRequestError('Failed to create todo record', NextResponse.json({ error: 'Failed to create todo record' }, { status: 500 }));
        }
        return result;
    }
    static #resolveStatusAndCompletion(todo, updates) {
        let nextStatus = todo.status;
        let nextCompleted = todo.completed;
        if (updates.status) {
            nextStatus = updates.status;
            nextCompleted = updates.status === 'complete';
        }
        if (updates.completed !== undefined) {
            nextCompleted = updates.completed;
            nextStatus = updates.completed
                ? 'complete'
                : TodoManager.inferIncompleteStatus(nextStatus);
        }
        return { status: nextStatus, completed: nextCompleted };
    }
    resolveCreationStatusAndCompletion(options) {
        const statusFromInput = options?.status;
        const completedFromInput = options?.completed;
        if (statusFromInput) {
            return {
                status: statusFromInput,
                completed: completedFromInput !== undefined
                    ? completedFromInput
                    : statusFromInput === 'complete',
            };
        }
        if (completedFromInput !== undefined) {
            return {
                status: completedFromInput ? 'complete' : 'active',
                completed: completedFromInput,
            };
        }
        return { status: 'pending', completed: false };
    }
    inferIncompleteStatus(previousStatus) {
        if (previousStatus === 'complete') {
            return 'active';
        }
        return previousStatus;
    }
    static async generateTodoPrefix(options = {}) {
        const activeSession = options.session ?? (await auth());
        if (!activeSession) {
            throw new ApiRequestError('No session available', unauthorizedServiceResponse({
                req: undefined,
                scopes: ['mcp-tools:read'],
            }));
        }
        const userId = activeSession.user?.id;
        if (!userId) {
            throw new ApiRequestError('Session does not contain user information', unauthorizedServiceResponse({
                req: undefined,
                scopes: ['mcp-tools:read'],
            }));
        }
        const prefix = `todo::user-${userId}::`;
        return [prefix, activeSession];
    }
    static async generateTodoId(options = {}) {
        const [prefix, activeSession] = await this.generateTodoPrefix({
            session: options.session,
        });
        return [
            `${prefix}${Date.now()}${options.salt ? `:${options.salt}` : ''}-${options.suffix ?? Math.random().toString(36).substring(2, 9)}`,
            activeSession,
        ];
    }
    static async validateTodoId(options) {
        const [prefix, activeSession] = await this.generateTodoPrefix({
            session: options.session,
        });
        const isValid = options.check.startsWith(prefix);
        if (!isValid) {
            throw new ApiRequestError('User does not have access to this todo item', unauthorizedServiceResponse({
                req: undefined,
                scopes: ['mcp-tools:read'],
            }));
        }
        return [activeSession, options.check];
    }
    static inferIncompleteStatus(previousStatus) {
        if (previousStatus === 'complete') {
            return 'active';
        }
        return previousStatus;
    }
    advanceTodoState(todo) {
        switch (todo.status) {
            case 'pending':
                return { status: 'active', completed: false };
            case 'active':
                return { status: 'complete', completed: true };
            case 'complete':
            default:
                return { status: 'active', completed: false };
        }
    }
    updateListStatus(list) {
        const initialValue = list.status;
        const agg = list.todos.reduce((acc, todo) => {
            acc.total += 1;
            if (todo.completed) {
                acc.complete += 1;
            }
            else {
                acc[todo.status] += 1;
            }
            return acc;
        }, { complete: 0, active: 0, pending: 0, total: 0 });
        if (agg.total === 0) {
            list.status = 'pending';
        }
        else if (agg.complete === agg.total) {
            list.status = 'complete';
        }
        else if (agg.active > 0) {
            list.status = 'active';
        }
        else {
            list.status = 'pending';
        }
        return list.status !== initialValue;
    }
    async ensureDefaultList({ session, }) {
        const [prefix, activeSession] = await TodoManager.generateTodoPrefix({
            session,
        });
        const listId = `${prefix}${DEFAULT_LIST_ID}`;
        const existing = await this.storage.getTodoList(listId);
        if (existing) {
            return existing;
        }
        const now = new Date();
        const list = await this.upsertTodoList({
            id: listId,
            title: DEFAULT_LIST_TITLE,
            description: undefined,
            status: DEFAULT_LIST_STATUS,
            priority: DEFAULT_PRIORITY,
            todos: [],
            createdAt: now,
            updatedAt: now,
        }, { session: activeSession });
        if (isError(list)) {
            throw list;
        }
        return list;
    }
}
export const getTodoManager = async (strategy) => {
    const provider = SingletonProvider.Instance;
    const managerKey = Symbol.for('@noeducation/ai/TodoManager');
    const status = await createStorageStrategyFromFlags();
    if (status.stale) {
        provider.delete(managerKey);
    }
    return await globalRequiredSingletonAsync('@noeducation/ai/TodoManager', async () => {
        if (strategy) {
            log((l) => l.debug('TodoManager singleton instance created'));
            return new TodoManager(strategy);
        }
        const storageStrategy = await createStorageStrategy(status.strategy, status.config, InMemoryStorageStrategy.Instance);
        return new TodoManager(storageStrategy);
    }, {
        weakRef: true,
    });
};
export const resetTodoManager = () => {
    SingletonProvider.Instance.delete('@noeducation/ai/TodoManager');
    log((l) => l.debug('TodoManager singleton reset'));
};
//# sourceMappingURL=todo-manager.js.map