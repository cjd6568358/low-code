/**
 * 租户数据库连接池 — LRU 淘汰策略
 *
 * 每个租户一个 SQLite 文件，同时打开的连接数受 poolMaxSize 限制。
 * 最久未使用的连接在池满时被淘汰（关闭）。
 */

import type { DatabaseConfig, SqliteDb } from './types';
import { KoffiDatabase } from './sqlite-koffi';

/** 池中连接条目 */
interface PoolEntry {
  db: SqliteDb;
  lastAccess: number;
}

export class TenantDatabasePool {
  private pool = new Map<string, PoolEntry>();
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /** 当前池中连接数 */
  get size(): number {
    return this.pool.size;
  }

  /**
   * 获取租户数据库连接
   *
   * 如果已打开则复用，否则新打开一个连接。
   * 池满时淘汰最久未使用的连接。
   */
  get(tenantId: string, dbPath: string): SqliteDb {
    const existing = this.pool.get(tenantId);
    if (existing) {
      existing.lastAccess = Date.now();
      return existing.db;
    }

    // 池满时淘汰
    if (this.pool.size >= this.config.poolMaxSize) {
      this.evict();
    }

    const db = this.open(dbPath);
    this.pool.set(tenantId, { db, lastAccess: Date.now() });
    return db;
  }

  /**
   * 检查租户连接是否已存在
   */
  has(tenantId: string): boolean {
    return this.pool.has(tenantId);
  }

  /**
   * 关闭指定租户的连接
   */
  close(tenantId: string): boolean {
    const entry = this.pool.get(tenantId);
    if (!entry) return false;
    try {
      entry.db.close();
    } catch {
      // 忽略关闭错误
    }
    this.pool.delete(tenantId);
    return true;
  }

  /**
   * 关闭所有连接
   */
  closeAll(): void {
    for (const [tenantId] of this.pool) {
      this.close(tenantId);
    }
  }

  /**
   * 获取池中所有活跃的租户 ID
   */
  activeTenantIds(): string[] {
    return [...this.pool.keys()];
  }

  // ─── 内部方法 ────────────────────────────────────────

  /**
   * 打开一个 SQLite 数据库连接
   */
  private open(dbPath: string): SqliteDb {
    const db = new KoffiDatabase(dbPath);

    // 基础配置
    db.pragma('busy_timeout', this.config.busyTimeout);

    if (this.config.walMode) {
      db.pragma('journal_mode', 'WAL');
    }

    // 启用外键约束
    db.pragma('foreign_keys', 'ON');

    return db;
  }

  /**
   * LRU 淘汰：关闭最久未使用的连接
   */
  private evict(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.pool) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.close(oldestKey);
    }
  }
}
