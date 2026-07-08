/**
 * 用户任务统计管理器
 *
 * 参考 NocoBase 的 userWorkflowTasks 表，
 * 跟踪每个用户的待办/已办任务数量。
 *
 * 存储：user_tasks/user_{userId}.json
 */

import type { DatabaseAdapter } from '../types/engine';

/** 用户任务统计 */
export interface UserTaskStats {
  /** 用户 ID */
  userId: string;
  /** 待办数 */
  pending: number;
  /** 已办数（resolved + rejected） */
  completed: number;
  /** 总数 */
  total: number;
  /** 最后更新时间 */
  updatedAt: string;
}

/**
 * 用户任务统计管理器
 */
export class TaskStatsManager {
  constructor(private readonly db: DatabaseAdapter) {}

  /**
   * 任务创建时更新统计
   */
  async onTaskCreated(userId: string): Promise<void> {
    const stats = await this.getOrCreateStats(userId);
    stats.pending += 1;
    stats.total += 1;
    stats.updatedAt = new Date().toISOString();
    await this.saveStats(stats);
  }

  /**
   * 任务完成时更新统计
   */
  async onTaskCompleted(userId: string): Promise<void> {
    const stats = await this.getOrCreateStats(userId);
    stats.pending = Math.max(0, stats.pending - 1);
    stats.completed += 1;
    stats.updatedAt = new Date().toISOString();
    await this.saveStats(stats);
  }

  /**
   * 任务驳回时更新统计
   */
  async onTaskRejected(userId: string): Promise<void> {
    const stats = await this.getOrCreateStats(userId);
    stats.pending = Math.max(0, stats.pending - 1);
    stats.completed += 1;
    stats.updatedAt = new Date().toISOString();
    await this.saveStats(stats);
  }

  /**
   * 获取用户任务统计
   */
  async getStats(userId: string): Promise<UserTaskStats> {
    return this.getOrCreateStats(userId);
  }

  /**
   * 获取所有用户统计（用于管理后台）
   */
  async getAllStats(): Promise<UserTaskStats[]> {
    try {
      return await this.db.all<UserTaskStats>(
        'SELECT * FROM user_task_stats ORDER BY pending DESC'
      );
    } catch {
      return [];
    }
  }

  /**
   * 获取待办数最多的用户（用于负载均衡）
   */
  async getTopPendingUsers(limit: number = 10): Promise<UserTaskStats[]> {
    try {
      return await this.db.all<UserTaskStats>(
        `SELECT * FROM user_task_stats WHERE pending > 0 ORDER BY pending DESC LIMIT ?`,
        [limit]
      );
    } catch {
      return [];
    }
  }

  /**
   * 重新计算用户统计（从任务表汇总）
   * 用于数据修复或初始化
   */
  async recalculate(userId: string): Promise<UserTaskStats> {
    const pendingCount = await this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM workflow_tasks WHERE assignee_id = ? AND status = 'pending'`,
      [userId]
    );

    const completedCount = await this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM workflow_tasks WHERE assignee_id = ? AND status IN ('resolved', 'rejected', 'transferred')`,
      [userId]
    );

    const stats: UserTaskStats = {
      userId,
      pending: pendingCount?.count || 0,
      completed: completedCount?.count || 0,
      total: (pendingCount?.count || 0) + (completedCount?.count || 0),
      updatedAt: new Date().toISOString(),
    };

    await this.saveStats(stats);
    return stats;
  }

  // ==================== 私有方法 ====================

  /**
   * 获取或创建用户统计
   */
  private async getOrCreateStats(userId: string): Promise<UserTaskStats> {
    const existing = await this.db.get<UserTaskStats>(
      'SELECT * FROM user_task_stats WHERE user_id = ?',
      [userId]
    );

    if (existing) {
      return existing;
    }

    return {
      userId,
      pending: 0,
      completed: 0,
      total: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * 保存用户统计
   */
  private async saveStats(stats: UserTaskStats): Promise<void> {
    const existing = await this.db.get<UserTaskStats>(
      'SELECT * FROM user_task_stats WHERE user_id = ?',
      [stats.userId]
    );

    if (existing) {
      await this.db.run(
        `UPDATE user_task_stats SET pending = ?, completed = ?, total = ?, updated_at = ? WHERE user_id = ?`,
        [stats.pending, stats.completed, stats.total, stats.updatedAt, stats.userId]
      );
    } else {
      await this.db.run(
        `INSERT INTO user_task_stats (user_id, pending, completed, total, updated_at) VALUES (?, ?, ?, ?, ?)`,
        [stats.userId, stats.pending, stats.completed, stats.total, stats.updatedAt]
      );
    }
  }
}
