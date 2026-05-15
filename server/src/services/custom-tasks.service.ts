import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { customTasks } from '../db/schema.js';

const MAX_CUSTOM_TASKS = 200; // per user per kernel

export class CustomTasksService {
  async list(userId: string, kernelId?: string) {
    const condition = kernelId
      ? and(eq(customTasks.userId, userId), eq(customTasks.kernelId, kernelId))
      : eq(customTasks.userId, userId);

    return db
      .select()
      .from(customTasks)
      .where(condition)
      .orderBy(desc(customTasks.createdAt));
  }

  async upsert(
    userId: string,
    taskId: string,
    kernelId: string,
    payload: Record<string, unknown>,
  ) {
    // Enforce limit before inserting new tasks
    const existing = await db
      .select({ taskId: customTasks.taskId })
      .from(customTasks)
      .where(and(eq(customTasks.userId, userId), eq(customTasks.kernelId, kernelId)));

    const isNew = !existing.some((r) => r.taskId === taskId);
    if (isNew && existing.length >= MAX_CUSTOM_TASKS) {
      throw new Error(`MAX_CUSTOM_TASKS: limit is ${MAX_CUSTOM_TASKS} per kernel`);
    }

    const [row] = await db
      .insert(customTasks)
      .values({ userId, taskId, kernelId, payload })
      .onConflictDoUpdate({
        target:  [customTasks.userId, customTasks.taskId],
        set:     { payload, kernelId, updatedAt: new Date() },
      })
      .returning();

    return row;
  }

  async delete(userId: string, taskId: string) {
    await db
      .delete(customTasks)
      .where(and(eq(customTasks.userId, userId), eq(customTasks.taskId, taskId)));
  }
}
