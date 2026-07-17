/**
 * TaskStatsManager 测试用例
 *
 * 验证任务统计管理器的统计功能。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskStatsManager } from '../../engine/TaskStatsManager.js';
import type { DatabaseAdapter } from '../../types/engine.js';

/** 内存 DatabaseAdapter mock */
function createMockDb(): DatabaseAdapter & { store: Map<string, any> } {
  const store = new Map<string, any>();
  return {
    store,
    async run(sql: string, params?: unknown[]) {
      // INSERT OR REPLACE into user_task_stats
      if (sql.includes('INSERT') || sql.includes('REPLACE')) {
        const userId = params?.[0] as string;
        store.set(userId, {
          userId: params?.[0],
          pending: params?.[1],
          completed: params?.[2],
          total: params?.[3],
          updatedAt: params?.[4],
        });
      }
      return { changes: 1, lastID: 0 };
    },
    async get<T>(sql: string, params?: unknown[]): Promise<T | undefined> {
      const userId = params?.[0] as string;
      return store.get(userId) as T | undefined;
    },
    async all<T>(): Promise<T[]> {
      return Array.from(store.values()) as T[];
    },
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
  };
}

describe('TaskStatsManager', () => {
  let manager: TaskStatsManager;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    manager = new TaskStatsManager(mockDb);
  });

  describe('onTaskCreated', () => {
    it('应该记录任务创建', async () => {
      await manager.onTaskCreated('user1');

      const stats = await manager.getStats('user1');
      expect(stats.pending).toBe(1);
    });

    it('应该累加待办数量', async () => {
      await manager.onTaskCreated('user1');
      await manager.onTaskCreated('user1');
      await manager.onTaskCreated('user1');

      const stats = await manager.getStats('user1');
      expect(stats.pending).toBe(3);
      expect(stats.total).toBe(3);
    });

    it('应该区分不同用户', async () => {
      await manager.onTaskCreated('user1');
      await manager.onTaskCreated('user2');

      const stats1 = await manager.getStats('user1');
      const stats2 = await manager.getStats('user2');
      expect(stats1.pending).toBe(1);
      expect(stats2.pending).toBe(1);
    });
  });

  describe('onTaskCompleted', () => {
    it('应该记录任务完成', async () => {
      await manager.onTaskCreated('user1');
      await manager.onTaskCompleted('user1');

      const stats = await manager.getStats('user1');
      expect(stats.pending).toBe(0);
      expect(stats.completed).toBe(1);
    });

    it('应该处理完成不存在的任务', async () => {
      // 不应该抛错（pending 最小为 0）
      await expect(manager.onTaskCompleted('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('onTaskRejected', () => {
    it('应该记录任务驳回（驳回计入 completed）', async () => {
      await manager.onTaskCreated('user1');
      await manager.onTaskRejected('user1');

      const stats = await manager.getStats('user1');
      expect(stats.pending).toBe(0);
      expect(stats.completed).toBe(1);
    });
  });

  describe('getStats', () => {
    it('应该返回用户统计数据', async () => {
      await manager.onTaskCreated('user1');
      await manager.onTaskCreated('user1');
      await manager.onTaskCompleted('user1');

      const stats = await manager.getStats('user1');
      expect(stats.userId).toBe('user1');
      expect(stats.pending).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.total).toBe(2);
    });
  });

  describe('getAllStats', () => {
    it('应该返回所有用户统计', async () => {
      await manager.onTaskCreated('user1');
      await manager.onTaskCreated('user2');
      await manager.onTaskCompleted('user1');

      const allStats = await manager.getAllStats();
      expect(allStats).toHaveLength(2);
    });
  });
});
