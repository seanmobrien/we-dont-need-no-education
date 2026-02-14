import { getRedisClient } from '@compliance-theater/redis';
import { log, LoggedError } from '@compliance-theater/logger';
const DEFAULT_TTL = 86400;
const DEFAULT_KEY_PREFIX = 'todo';
export class RedisStorageStrategy {
    config;
    redisClient = null;
    initPromise = null;
    constructor(config = {}) {
        this.config = {
            ttl: config.ttl ?? DEFAULT_TTL,
            keyPrefix: config.keyPrefix ?? DEFAULT_KEY_PREFIX,
            enableFallback: config.enableFallback ?? true,
        };
    }
    async ensureConnected() {
        if (this.redisClient) {
            return this.redisClient;
        }
        if (!this.initPromise) {
            this.initPromise = this.initializeRedis();
        }
        await this.initPromise;
        if (!this.redisClient) {
            throw new Error('Failed to initialize Redis client');
        }
        return this.redisClient;
    }
    async initializeRedis() {
        try {
            this.redisClient = await getRedisClient();
            log((l) => l.info('Redis storage strategy initialized'));
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'RedisStorageStrategy::initializeRedis',
            });
            throw error;
        }
    }
    getListKey(listId) {
        return `${this.config.keyPrefix}:list:${listId}`;
    }
    getListTodosKey(listId) {
        return `${this.config.keyPrefix}:list:${listId}:todos`;
    }
    getTodoKey(todoId) {
        return `${this.config.keyPrefix}:todo:${todoId}`;
    }
    getTodoToListKey(todoId) {
        return `${this.config.keyPrefix}:mapping:${todoId}`;
    }
    serializeTodo(todo) {
        return JSON.stringify({
            ...todo,
            createdAt: todo.createdAt.toISOString(),
            updatedAt: todo.updatedAt.toISOString(),
        });
    }
    deserializeTodo(data) {
        const parsed = JSON.parse(data);
        return {
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            updatedAt: new Date(parsed.updatedAt),
        };
    }
    serializeTodoListMetadata(list) {
        const { todos, ...metadata } = list;
        return JSON.stringify({
            ...metadata,
            createdAt: metadata.createdAt.toISOString(),
            updatedAt: metadata.updatedAt.toISOString(),
        });
    }
    deserializeTodoListMetadata(data) {
        const parsed = JSON.parse(data);
        return {
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            updatedAt: new Date(parsed.updatedAt),
        };
    }
    async getTodoIdsForList(redis, listId) {
        const listTodosKey = this.getListTodosKey(listId);
        return redis.zRange(listTodosKey, 0, -1);
    }
    async hydrateTodos(redis, listId, options) {
        const todoIds = await this.getTodoIdsForList(redis, listId);
        if (todoIds.length === 0) {
            return [];
        }
        const todoKeys = todoIds.map((id) => this.getTodoKey(id));
        const values = await redis.mGet(todoKeys);
        const todos = values
            .map((value) => value ? this.deserializeTodo(value) : undefined)
            .filter((value) => Boolean(value));
        if (options?.completed !== undefined) {
            return todos.filter((todo) => todo.completed === options.completed);
        }
        return todos;
    }
    async upsertTodoList(list) {
        try {
            const redis = await this.ensureConnected();
            const listKey = this.getListKey(list.id);
            const listTodosKey = this.getListTodosKey(list.id);
            const existingTodoIds = await this.getTodoIdsForList(redis, list.id);
            if (existingTodoIds.length > 0) {
                const incomingIds = new Set(list.todos.map((todo) => todo.id));
                const removedIds = existingTodoIds.filter((todoId) => !incomingIds.has(todoId));
                if (removedIds.length > 0) {
                    await Promise.all(removedIds.map((todoId) => this.deleteTodo(todoId)));
                }
            }
            await redis.set(listKey, this.serializeTodoListMetadata(list), {
                EX: this.config.ttl,
            });
            await Promise.all(list.todos.map((todo) => this.upsertTodo(todo, { list: list.id })));
            await redis.expire(listTodosKey, this.config.ttl);
            log((l) => l.debug('Todo list upserted to Redis', {
                listId: list.id,
                todoCount: list.todos.length,
            }));
            return list;
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'RedisStorageStrategy::upsertTodoList',
            });
            throw error;
        }
    }
    async getTodoList(listId, options) {
        try {
            const redis = await this.ensureConnected();
            const listKey = this.getListKey(listId);
            const data = await redis.get(listKey);
            if (!data) {
                return undefined;
            }
            const metadata = this.deserializeTodoListMetadata(data);
            const todos = await this.hydrateTodos(redis, listId, options);
            return {
                ...metadata,
                todos,
            };
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'RedisStorageStrategy::getTodoList',
            });
            throw error;
        }
    }
    async getTodoLists(options) {
        try {
            const redis = await this.ensureConnected();
            const pattern = `${this.config.keyPrefix}:list:${options.prefix}*`;
            const keys = [];
            for await (const keyChunk of redis.scanIterator({
                MATCH: pattern,
                COUNT: 100,
            })) {
                if (Array.isArray(keyChunk)) {
                    keys.push(...keyChunk);
                }
                else {
                    keys.push(keyChunk);
                }
            }
            const metadataKeys = keys.filter((key) => !key.endsWith(':todos'));
            if (metadataKeys.length === 0) {
                return [];
            }
            const values = await redis.mGet(metadataKeys);
            const entries = metadataKeys
                .map((key, index) => ({ key, value: values[index] }))
                .filter((entry) => entry.value !== null);
            const hydratedLists = await Promise.all(entries.map(async ({ key, value }) => {
                const listMetadata = this.deserializeTodoListMetadata(value);
                const listId = listMetadata.id ?? key.split(':').pop() ?? key;
                const todos = await this.hydrateTodos(redis, listId, {
                    completed: options.completed,
                });
                return {
                    ...listMetadata,
                    id: listId,
                    todos,
                };
            }));
            return hydratedLists;
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'RedisStorageStrategy::getTodoLists',
            });
            throw error;
        }
    }
    async deleteTodoList(listId) {
        try {
            const redis = await this.ensureConnected();
            const metadata = await redis.get(this.getListKey(listId));
            if (!metadata) {
                return false;
            }
            const todoIds = await this.getTodoIdsForList(redis, listId);
            if (todoIds.length > 0) {
                await Promise.all(todoIds.map((todoId) => this.deleteTodo(todoId)));
            }
            const deletedKeys = await redis.del([
                this.getListKey(listId),
                this.getListTodosKey(listId),
            ]);
            log((l) => l.debug('Todo list deleted from Redis', {
                listId,
                deleted: deletedKeys > 0,
            }));
            return true;
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'RedisStorageStrategy::deleteTodoList',
            });
            throw error;
        }
    }
    async upsertTodo(todo, options) {
        try {
            const redis = await this.ensureConnected();
            const listId = typeof options.list === 'string' ? options.list : options.list.id;
            const todoKey = this.getTodoKey(todo.id);
            const mappingKey = this.getTodoToListKey(todo.id);
            const listTodosKey = this.getListTodosKey(listId);
            await redis.set(todoKey, this.serializeTodo(todo), {
                EX: this.config.ttl,
            });
            await redis.set(mappingKey, listId, {
                EX: this.config.ttl,
            });
            await redis.zAdd(listTodosKey, {
                score: todo.createdAt.getTime(),
                value: todo.id,
            });
            await redis.expire(listTodosKey, this.config.ttl);
            log((l) => l.debug('Todo upserted to Redis', {
                todoId: todo.id,
                listId,
            }));
            return todo;
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'RedisStorageStrategy::upsertTodo',
            });
            throw error;
        }
    }
    async getTodo(todoId) {
        try {
            const redis = await this.ensureConnected();
            const todoKey = this.getTodoKey(todoId);
            const data = await redis.get(todoKey);
            if (!data) {
                return undefined;
            }
            return this.deserializeTodo(data);
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'RedisStorageStrategy::getTodo',
            });
            throw error;
        }
    }
    async getTodos(options) {
        try {
            const redis = await this.ensureConnected();
            const pattern = options?.prefix
                ? `${this.config.keyPrefix}:todo:${options.prefix}*`
                : `${this.config.keyPrefix}:todo:*`;
            const keys = [];
            for await (const keyChunk of redis.scanIterator({
                MATCH: pattern,
                COUNT: 100,
            })) {
                if (Array.isArray(keyChunk)) {
                    keys.push(...keyChunk);
                }
                else {
                    keys.push(keyChunk);
                }
            }
            if (keys.length === 0) {
                return [];
            }
            const values = await redis.mGet(keys);
            const todos = values
                .filter((value) => value !== null)
                .map((value) => this.deserializeTodo(value));
            if (options?.completed !== undefined) {
                return todos.filter((todo) => todo.completed === options.completed);
            }
            return todos;
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'RedisStorageStrategy::getTodos',
            });
            throw error;
        }
    }
    async deleteTodo(todoId) {
        try {
            const redis = await this.ensureConnected();
            const todoKey = this.getTodoKey(todoId);
            const mappingKey = this.getTodoToListKey(todoId);
            const listId = await redis.get(mappingKey);
            const results = await Promise.all([
                redis.del(todoKey),
                redis.del(mappingKey),
            ]);
            if (listId) {
                const listTodosKey = this.getListTodosKey(listId);
                await redis.zRem(listTodosKey, todoId);
            }
            log((l) => l.debug('Todo deleted from Redis', {
                todoId,
                deleted: results[0] > 0,
            }));
            return results[0] > 0;
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'RedisStorageStrategy::deleteTodo',
            });
            throw error;
        }
    }
    async getTodoToListMapping(todoId) {
        try {
            const redis = await this.ensureConnected();
            const mappingKey = this.getTodoToListKey(todoId);
            const listId = await redis.get(mappingKey);
            return listId ?? undefined;
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'RedisStorageStrategy::getTodoToListMapping',
            });
            throw error;
        }
    }
    async getCount(options) {
        try {
            const redis = await this.ensureConnected();
            const pattern = options?.prefix
                ? `${this.config.keyPrefix}:todo:${options.prefix}*`
                : `${this.config.keyPrefix}:todo:*`;
            let count = 0;
            for await (const keyChunk of redis.scanIterator({
                MATCH: pattern,
                COUNT: 100,
            })) {
                const batchCount = Array.isArray(keyChunk) ? keyChunk.length : 1;
                count += batchCount;
            }
            return count;
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'RedisStorageStrategy::getCount',
            });
            throw error;
        }
    }
    async clearAll(options) {
        try {
            const redis = await this.ensureConnected();
            const prefix = options?.prefix || '';
            const listPattern = prefix
                ? `${this.config.keyPrefix}:list:${prefix}*`
                : `${this.config.keyPrefix}:list:*`;
            const todoPattern = prefix
                ? `${this.config.keyPrefix}:todo:${prefix}*`
                : `${this.config.keyPrefix}:todo:*`;
            const mappingPattern = prefix
                ? `${this.config.keyPrefix}:mapping:${prefix}*`
                : `${this.config.keyPrefix}:mapping:*`;
            const membershipPattern = prefix
                ? `${this.config.keyPrefix}:list:${prefix}*:todos`
                : `${this.config.keyPrefix}:list:*:todos`;
            const listKeys = [];
            const todoKeys = [];
            const mappingKeys = [];
            const membershipKeys = [];
            for await (const keyChunk of redis.scanIterator({
                MATCH: listPattern,
                COUNT: 100,
            })) {
                if (Array.isArray(keyChunk)) {
                    listKeys.push(...keyChunk);
                }
                else {
                    listKeys.push(keyChunk);
                }
            }
            for await (const keyChunk of redis.scanIterator({
                MATCH: todoPattern,
                COUNT: 100,
            })) {
                if (Array.isArray(keyChunk)) {
                    todoKeys.push(...keyChunk);
                }
                else {
                    todoKeys.push(keyChunk);
                }
            }
            for await (const keyChunk of redis.scanIterator({
                MATCH: mappingPattern,
                COUNT: 100,
            })) {
                if (Array.isArray(keyChunk)) {
                    mappingKeys.push(...keyChunk);
                }
                else {
                    mappingKeys.push(keyChunk);
                }
            }
            for await (const keyChunk of redis.scanIterator({
                MATCH: membershipPattern,
                COUNT: 100,
            })) {
                if (Array.isArray(keyChunk)) {
                    membershipKeys.push(...keyChunk);
                }
                else {
                    membershipKeys.push(keyChunk);
                }
            }
            const allKeys = [
                ...listKeys,
                ...todoKeys,
                ...mappingKeys,
                ...membershipKeys,
            ];
            if (allKeys.length > 0) {
                await redis.del(allKeys);
            }
            log((l) => l.debug('Cleared all todos from Redis', {
                prefix,
                keysDeleted: allKeys.length,
                listsCleared: listKeys.length,
                todosCleared: todoKeys.length,
                matchesCleared: mappingKeys.length,
                membershipsCleared: membershipKeys.length,
            }));
            return {
                todosCleared: todoKeys.length,
                listsCleared: listKeys.length,
                matchesCleared: mappingKeys.length,
            };
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'RedisStorageStrategy::clearAll',
            });
            throw error;
        }
    }
    equals(other) {
        if (!(other instanceof RedisStorageStrategy)) {
            return false;
        }
        return (this.config.ttl === other.config.ttl &&
            this.config.keyPrefix === other.config.keyPrefix &&
            this.config.enableFallback === other.config.enableFallback);
    }
}
//# sourceMappingURL=redis-storage.js.map