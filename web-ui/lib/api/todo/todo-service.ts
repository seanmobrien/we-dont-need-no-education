import { drizDbWithInit, schema } from '@/lib/drizzle-db';
import { eq, and } from 'drizzle-orm';
import { log } from '@/lib/logger';
import {
  TodoList,
  TodoItem,
  TodoListSummary,
  TodoListWithItems,
} from '@/data-models/api/todo';
import {
  CreateTodoListRequest,
  UpdateTodoListRequest,
  CreateTodoItemRequest,
  UpdateTodoItemRequest,
} from './todo-validation';

/**
 * TodoService provides business logic layer for todo list operations.
 * It bridges between the API layer and the data access layer, handling
 * user-scoped operations and data transformations.
 *
 * @example
 * ```typescript
 * const service = new TodoService();
 *
 * // Get all todo lists for a user
 * const lists = await service.getUserTodoLists(userId);
 *
 * // Create new todo list
 * const newList = await service.createTodoList({
 *   userId: 123,
 *   title: "My Tasks",
 *   description: "Personal tasks"
 * });
 * ```
 */
export class TodoService {
  /**
   * Retrieves all todo lists for a specific user
   *
   * @param userId - The user ID to fetch lists for
   * @returns Promise resolving to array of todo list summaries
   */
  async getUserTodoLists(userId: number): Promise<TodoListSummary[]> {
    try {
      const db = await drizDbWithInit();

      const lists = await db.query.todoLists.findMany({
        where: (lists, { eq }) => eq(lists.userId, userId),
        orderBy: (lists, { desc }) => [desc(lists.updatedAt)],
        with: {
          items: true,
        },
      });

      return lists.map((list) => ({
        listId: list.listId,
        userId: list.userId,
        title: list.title,
        description: list.description ?? undefined,
        status: list.status as 'pending' | 'active' | 'complete',
        priority: list.priority as 'high' | 'medium' | 'low',
        createdAt: new Date(list.createdAt),
        updatedAt: new Date(list.updatedAt),
        totalItems: list.items.length,
        completedItems: list.items.filter((item) => item.completed).length,
        pendingItems: list.items.filter((item) => !item.completed).length,
      }));
    } catch (error) {
      log((l) =>
        l.error({
          source: 'TodoService.getUserTodoLists',
          error,
          userId,
        }),
      );
      throw error;
    }
  }

  /**
   * Retrieves a specific todo list by ID
   *
   * @param listId - The list ID to retrieve
   * @param userId - The user ID for authorization
   * @returns Promise resolving to todo list or null
   */
  async getTodoListById(
    listId: string,
    userId: number,
  ): Promise<TodoListWithItems | null> {
    try {
      const db = await drizDbWithInit();

      const list = await db.query.todoLists.findFirst({
        where: (lists, { eq, and }) =>
          and(eq(lists.listId, listId), eq(lists.userId, userId)),
        with: {
          items: {
            orderBy: (items, { asc }) => [asc(items.createdAt)],
          },
        },
      });

      if (!list) {
        return null;
      }

      return {
        listId: list.listId,
        userId: list.userId,
        title: list.title,
        description: list.description ?? undefined,
        status: list.status as 'pending' | 'active' | 'complete',
        priority: list.priority as 'high' | 'medium' | 'low',
        createdAt: new Date(list.createdAt),
        updatedAt: new Date(list.updatedAt),
        items: list.items.map((item) => ({
          itemId: item.itemId,
          listId: item.listId,
          title: item.title,
          description: item.description ?? undefined,
          completed: item.completed,
          status: item.status as 'pending' | 'active' | 'complete',
          priority: item.priority as 'high' | 'medium' | 'low',
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        })),
      };
    } catch (error) {
      log((l) =>
        l.error({
          source: 'TodoService.getTodoListById',
          error,
          listId,
          userId,
        }),
      );
      throw error;
    }
  }

  /**
   * Creates a new todo list
   *
   * @param data - The todo list data to create
   * @param userId - The user ID who owns this list
   * @returns Promise resolving to created todo list
   */
  async createTodoList(
    data: CreateTodoListRequest,
    userId: number,
  ): Promise<TodoList> {
    try {
      const db = await drizDbWithInit();

      const [created] = await db
        .insert(schema.todoLists)
        .values({
          userId,
          title: data.title,
          description: data.description,
          status: data.status ?? 'active',
          priority: data.priority ?? 'medium',
        })
        .returning();

      return {
        listId: created.listId,
        userId: created.userId,
        title: created.title,
        description: created.description ?? undefined,
        status: created.status as 'pending' | 'active' | 'complete',
        priority: created.priority as 'high' | 'medium' | 'low',
        createdAt: new Date(created.createdAt),
        updatedAt: new Date(created.updatedAt),
      };
    } catch (error) {
      log((l) =>
        l.error({
          source: 'TodoService.createTodoList',
          error,
          data,
          userId,
        }),
      );
      throw error;
    }
  }

  /**
   * Updates an existing todo list
   *
   * @param data - The todo list data to update
   * @param userId - The user ID for authorization
   * @returns Promise resolving to updated todo list or null
   */
  async updateTodoList(
    data: UpdateTodoListRequest,
    userId: number,
  ): Promise<TodoList | null> {
    try {
      const db = await drizDbWithInit();

      const updateData: Partial<typeof schema.todoLists.$inferInsert> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined)
        updateData.description = data.description;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.priority !== undefined) updateData.priority = data.priority;
      updateData.updatedAt = new Date().toISOString();

      const [updated] = await db
        .update(schema.todoLists)
        .set(updateData)
        .where(
          and(
            eq(schema.todoLists.listId, data.listId),
            eq(schema.todoLists.userId, userId),
          ),
        )
        .returning();

      if (!updated) {
        return null;
      }

      return {
        listId: updated.listId,
        userId: updated.userId,
        title: updated.title,
        description: updated.description ?? undefined,
        status: updated.status as 'pending' | 'active' | 'complete',
        priority: updated.priority as 'high' | 'medium' | 'low',
        createdAt: new Date(updated.createdAt),
        updatedAt: new Date(updated.updatedAt),
      };
    } catch (error) {
      log((l) =>
        l.error({
          source: 'TodoService.updateTodoList',
          error,
          data,
          userId,
        }),
      );
      throw error;
    }
  }

  /**
   * Deletes a todo list
   *
   * @param listId - The list ID to delete
   * @param userId - The user ID for authorization
   * @returns Promise resolving to boolean indicating success
   */
  async deleteTodoList(listId: string, userId: number): Promise<boolean> {
    try {
      const db = await drizDbWithInit();

      const [deleted] = await db
        .delete(schema.todoLists)
        .where(
          and(
            eq(schema.todoLists.listId, listId),
            eq(schema.todoLists.userId, userId),
          ),
        )
        .returning({ listId: schema.todoLists.listId });

      return !!deleted;
    } catch (error) {
      log((l) =>
        l.error({
          source: 'TodoService.deleteTodoList',
          error,
          listId,
          userId,
        }),
      );
      throw error;
    }
  }

  /**
   * Creates a new todo item in a list
   *
   * @param listId - The list ID to add the item to
   * @param data - The todo item data to create
   * @param userId - The user ID for authorization
   * @returns Promise resolving to created todo item or null if list not found
   */
  async createTodoItem(
    listId: string,
    data: CreateTodoItemRequest,
    userId: number,
  ): Promise<TodoItem | null> {
    try {
      const db = await drizDbWithInit();

      // Verify list belongs to user
      const list = await db.query.todoLists.findFirst({
        where: (lists, { eq, and }) =>
          and(eq(lists.listId, listId), eq(lists.userId, userId)),
      });

      if (!list) {
        return null;
      }

      const [created] = await db
        .insert(schema.todoItems)
        .values({
          listId,
          title: data.title,
          description: data.description,
          completed: data.completed ?? false,
          status: data.status ?? 'pending',
          priority: data.priority ?? 'medium',
        })
        .returning();

      // Update list's updatedAt
      await db
        .update(schema.todoLists)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(schema.todoLists.listId, listId));

      return {
        itemId: created.itemId,
        listId: created.listId,
        title: created.title,
        description: created.description ?? undefined,
        completed: created.completed,
        status: created.status as 'pending' | 'active' | 'complete',
        priority: created.priority as 'high' | 'medium' | 'low',
        createdAt: new Date(created.createdAt),
        updatedAt: new Date(created.updatedAt),
      };
    } catch (error) {
      log((l) =>
        l.error({
          source: 'TodoService.createTodoItem',
          error,
          listId,
          data,
          userId,
        }),
      );
      throw error;
    }
  }

  /**
   * Updates an existing todo item
   *
   * @param listId - The list ID containing the item
   * @param data - The todo item data to update
   * @param userId - The user ID for authorization
   * @returns Promise resolving to updated todo item or null
   */
  async updateTodoItem(
    listId: string,
    data: UpdateTodoItemRequest,
    userId: number,
  ): Promise<TodoItem | null> {
    try {
      const db = await drizDbWithInit();

      // Verify list belongs to user
      const list = await db.query.todoLists.findFirst({
        where: (lists, { eq, and }) =>
          and(eq(lists.listId, listId), eq(lists.userId, userId)),
      });

      if (!list) {
        return null;
      }

      const updateData: Partial<typeof schema.todoItems.$inferInsert> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined)
        updateData.description = data.description;
      if (data.completed !== undefined) updateData.completed = data.completed;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.priority !== undefined) updateData.priority = data.priority;
      updateData.updatedAt = new Date().toISOString();

      const [updated] = await db
        .update(schema.todoItems)
        .set(updateData)
        .where(
          and(
            eq(schema.todoItems.itemId, data.itemId),
            eq(schema.todoItems.listId, listId),
          ),
        )
        .returning();

      if (!updated) {
        return null;
      }

      // Update list's updatedAt
      await db
        .update(schema.todoLists)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(schema.todoLists.listId, listId));

      return {
        itemId: updated.itemId,
        listId: updated.listId,
        title: updated.title,
        description: updated.description ?? undefined,
        completed: updated.completed,
        status: updated.status as 'pending' | 'active' | 'complete',
        priority: updated.priority as 'high' | 'medium' | 'low',
        createdAt: new Date(updated.createdAt),
        updatedAt: new Date(updated.updatedAt),
      };
    } catch (error) {
      log((l) =>
        l.error({
          source: 'TodoService.updateTodoItem',
          error,
          listId,
          data,
          userId,
        }),
      );
      throw error;
    }
  }

  /**
   * Deletes a todo item
   *
   * @param listId - The list ID containing the item
   * @param itemId - The item ID to delete
   * @param userId - The user ID for authorization
   * @returns Promise resolving to boolean indicating success
   */
  async deleteTodoItem(
    listId: string,
    itemId: string,
    userId: number,
  ): Promise<boolean> {
    try {
      const db = await drizDbWithInit();

      // Verify list belongs to user
      const list = await db.query.todoLists.findFirst({
        where: (lists, { eq, and }) =>
          and(eq(lists.listId, listId), eq(lists.userId, userId)),
      });

      if (!list) {
        return false;
      }

      const [deleted] = await db
        .delete(schema.todoItems)
        .where(
          and(
            eq(schema.todoItems.itemId, itemId),
            eq(schema.todoItems.listId, listId),
          ),
        )
        .returning({ itemId: schema.todoItems.itemId });

      if (deleted) {
        // Update list's updatedAt
        await db
          .update(schema.todoLists)
          .set({ updatedAt: new Date().toISOString() })
          .where(eq(schema.todoLists.listId, listId));
      }

      return !!deleted;
    } catch (error) {
      log((l) =>
        l.error({
          source: 'TodoService.deleteTodoItem',
          error,
          listId,
          itemId,
          userId,
        }),
      );
      throw error;
    }
  }
}
