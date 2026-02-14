import { log } from '@compliance-theater/logger';
import { globalRequiredSingleton, SingletonProvider, } from '@compliance-theater/typescript';
const GLOBAL_INSTANCE = Symbol.for('@noeducation/ai/InMemoryStorageStrategy');
export class InMemoryStorageStrategy {
    todos = new Map();
    todoLists = new Map();
    todoToList = new Map();
    static get Instance() {
        return globalRequiredSingleton(GLOBAL_INSTANCE, () => new InMemoryStorageStrategy());
    }
    static resetInstance() {
        SingletonProvider.Instance.delete(GLOBAL_INSTANCE);
    }
    constructor({} = {}) {
        log((l) => l.warn('InMemoryStorageStrategy initialized with empty storage.'));
    }
    async upsertTodoList(list) {
        const existingList = this.todoLists.get(list.id);
        if (existingList) {
            existingList.todos
                .filter((todo) => !list.todos.some((t) => t.id === todo.id))
                .forEach((todo) => {
                if (todo.completed) {
                    list.todos = [todo, ...list.todos];
                }
                else {
                    this.todos.delete(todo.id);
                    this.todoToList.delete(todo.id);
                }
            });
        }
        this.todoLists.set(list.id, list);
        list.todos.forEach((todo) => {
            this.todos.set(todo.id, { ...todo });
            this.todoToList.set(todo.id, list.id);
        });
        return {
            ...list,
            todos: list.todos.map((todo) => ({ ...todo })),
        };
    }
    async getTodoList(listId, options) {
        const list = this.todoLists.get(listId);
        if (!list) {
            return undefined;
        }
        if (options?.completed !== undefined) {
            const filteredTodos = list.todos.filter((todo) => todo.completed === options.completed);
            return { ...list, todos: filteredTodos };
        }
        return list;
    }
    async getTodoLists(options) {
        const lists = Array.from(this.todoLists.values())
            .filter((list) => options?.prefix ? list.id.startsWith(options.prefix) : true)
            .map((list) => ({ ...list }));
        if (options?.completed !== undefined) {
            return lists.map((list) => ({
                ...list,
                todos: list.todos.filter((todo) => todo.completed === options.completed),
            }));
        }
        return lists;
    }
    async deleteTodoList(listId) {
        const list = this.todoLists.get(listId);
        if (!list) {
            return false;
        }
        list.todos.forEach((todo) => {
            this.todos.delete(todo.id);
            this.todoToList.delete(todo.id);
        });
        return this.todoLists.delete(listId);
    }
    async upsertTodo(todo, { list: listFromProps }) {
        let list;
        if (typeof listFromProps === 'string') {
            list = this.todoLists.get(listFromProps);
        }
        else {
            list = listFromProps;
        }
        this.todos.set(todo.id, todo);
        if (!list) {
            log((l) => l.warn(`Adding todo ${todo.id} to non-existent list ${(typeof listFromProps === 'string'
                ? listFromProps
                : listFromProps.id) ?? '[none]'}.`));
            return todo;
        }
        this.todoToList.set(todo.id, list.id);
        const existingIndex = list.todos.findIndex((t) => t.id === todo.id);
        if (existingIndex !== -1) {
            list.todos[existingIndex] = todo;
        }
        else {
            list.todos.push(todo);
        }
        this.todoLists.set(list.id, list);
        return todo;
    }
    async getTodo(todoId) {
        const ret = this.todos.get(todoId);
        return ret ? { ...ret } : undefined;
    }
    async getTodos({ completed, prefix, }) {
        if (!prefix) {
            throw new Error('Prefix is required to get todos.');
        }
        let todos = Array.from(this.todos.values()).filter((todo) => todo.id.startsWith(prefix));
        if (completed !== undefined) {
            todos = todos.filter((todo) => todo.completed === completed);
        }
        return todos.map((todo) => ({ ...todo }));
    }
    async deleteTodo(todoId) {
        const listId = this.todoToList.get(todoId);
        const list = listId ? this.todoLists.get(listId) : undefined;
        const result = this.todos.delete(todoId);
        this.todoToList.delete(todoId);
        if (list) {
            const nextTodos = list.todos.filter((todo) => todo.id !== todoId);
            if (nextTodos.length !== list.todos.length) {
                list.todos = nextTodos;
            }
        }
        return result;
    }
    async getTodoToListMapping(todoId) {
        return this.todoToList.get(todoId);
    }
    async getCount({ prefix }) {
        return Array.from(this.todos.keys()).filter((todoId) => todoId.startsWith(prefix)).length;
    }
    clearAll({ prefix }) {
        const clearMatches = (target) => {
            const removed = [];
            for (const key of target.keys()) {
                if (!prefix || key.startsWith(prefix)) {
                    removed.push(target.get(key));
                    target.delete(key);
                }
            }
            return removed;
        };
        const todosCleared = clearMatches(this.todos).length;
        const listsCleared = clearMatches(this.todoLists).length;
        const matchesCleared = clearMatches(this.todoToList).length;
        return Promise.resolve({ todosCleared, listsCleared, matchesCleared });
    }
    equals(other) {
        if (!(other instanceof InMemoryStorageStrategy)) {
            return false;
        }
        return true;
    }
}
//# sourceMappingURL=in-memory-storage.js.map