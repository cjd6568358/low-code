/**
 * Schema 迁移管理
 *
 * 使用 SQLite 的 user_version pragma 跟踪当前版本。
 * 每个数据库（系统库/租户库）独立维护版本号。
 */

import type { SqliteDb, MigrationEntry } from './types';

/**
 * 获取数据库当前 schema 版本
 */
export function getDbVersion(db: SqliteDb): number {
  return db.pragma('user_version') as number;
}

/**
 * 设置数据库 schema 版本
 */
export function setDbVersion(db: SqliteDb, version: number): void {
  db.pragma('user_version', version);
}

/**
 * 执行数据库迁移
 *
 * 按版本号顺序执行尚未执行的迁移函数。
 * 每个迁移在一个事务中执行，失败时自动回滚。
 *
 * @param db 目标数据库
 * @param migrations 迁移列表（必须按版本号升序排列）
 * @returns 执行的迁移数量
 */
export function runMigrations(db: SqliteDb, migrations: MigrationEntry[]): number {
  const currentVersion = getDbVersion(db);
  const pending = migrations.filter((m) => m.version > currentVersion);

  if (pending.length === 0) return 0;

  // 按版本号排序（防御性）
  pending.sort((a, b) => a.version - b.version);

  let executed = 0;
  for (const migration of pending) {
    try {
      db.transaction(() => {
        migration.up(db);
        setDbVersion(db, migration.version);
      });
      executed++;
    } catch (err) {
      console.error(
        `[Migration] Failed at v${migration.version} "${migration.description}":`,
        err,
      );
      throw err;
    }
  }

  return executed;
}

/**
 * 检查是否有待执行的迁移
 */
export function hasPendingMigrations(db: SqliteDb, migrations: MigrationEntry[]): boolean {
  const currentVersion = getDbVersion(db);
  return migrations.some((m) => m.version > currentVersion);
}
