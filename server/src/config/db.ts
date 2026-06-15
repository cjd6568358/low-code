/**
 * 数据库管理器单例
 *
 * 全局共享一个 DatabaseManager 实例，
 * 所有 service 和 route 通过此模块获取数据库连接。
 */

import { DatabaseManager } from '@low-code/data';
import { DATA_DIR, TENANTS_DIR } from './index.js';

let manager: DatabaseManager | null = null;

/** 获取数据库管理器(懒初始化) */
export function getDbManager(): DatabaseManager {
  if (!manager) {
    manager = new DatabaseManager({ dataDir: DATA_DIR, tenantsDir: TENANTS_DIR });
    manager.initSystemDb();
  }
  return manager;
}

/** 关闭所有数据库连接 */
export function closeDbManager(): void {
  if (manager) {
    manager.closeAll();
    manager = null;
  }
}
