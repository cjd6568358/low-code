/**
 * 数据表服务
 *
 * 封装动态建表逻辑，处理 Schema JSON 与物理表的同步。
 * 支持：
 * - 根据 TableSchema 创建/更新物理表
 * - 软删除标记
 * - CRUD 操作
 */

import type { DatabaseManager } from '@low-code/data';
import {
  executeTableSchema,
  softDeleteRecord,
  restoreRecord,
  queryRecords,
  insertRecord,
  updateRecord,
} from '@low-code/data';
import type { TableSchema } from '@low-code/shared';

// ─── 服务类 ────────────────────────────────────────────

export class TableService {
  constructor(private dbManager: DatabaseManager) {}

  // ─── 表名规则 ──────────────────────────────────────────

  /**
   * 获取物理表名（直接用 tableId）
   */
  private getTableName(tableId: string): string {
    return tableId;
  }

  // ─── Schema 同步 ──────────────────────────────────────

  /**
   * 同步数据表 Schema 到物理表
   *
   * @param tenantId 租户 ID
   * @param tableId 表 ID
   * @param schema 新 Schema
   * @param oldSchema 旧 Schema（可选，存在时执行增量更新）
   */
  async syncTableSchema(
    tenantId: string,
    tableId: string,
    schema: TableSchema,
    oldSchema?: TableSchema,
  ): Promise<void> {
    const db = this.dbManager.getTenantDb(tenantId);
    const tableName = this.getTableName(tableId);

    executeTableSchema(db, tableName, schema, oldSchema);
  }

  /**
   * 标记数据表为软删除（Schema 层面）
   *
   * 注意：此方法需要在路由层实现，因为需要访问文件系统
   * TableService 只负责数据库操作
   */
  async markTableDeleted(_tenantId: string, _appId: string, _tableId: string): Promise<void> {
    // Schema 文件的软删除在路由层实现
    // 此方法预留用于未来扩展
  }

  // ─── 记录 CRUD ────────────────────────────────────────

  /**
   * 查询表记录
   */
  async queryRecords(
    tenantId: string,
    tableId: string,
    options: { includeDeleted?: boolean; where?: string; params?: any[] } = {},
  ): Promise<any[]> {
    const db = this.dbManager.getTenantDb(tenantId);
    const tableName = this.getTableName(tableId);
    return queryRecords(db, tableName, options);
  }

  /**
   * 插入记录
   */
  async insertRecord(
    tenantId: string,
    tableId: string,
    data: Record<string, any>,
  ): Promise<{ id: number; changes: number }> {
    const db = this.dbManager.getTenantDb(tenantId);
    const tableName = this.getTableName(tableId);
    return insertRecord(db, tableName, data);
  }

  /**
   * 更新记录
   */
  async updateRecord(
    tenantId: string,
    tableId: string,
    recordId: string | number,
    data: Record<string, any>,
  ): Promise<number> {
    const db = this.dbManager.getTenantDb(tenantId);
    const tableName = this.getTableName(tableId);
    return updateRecord(db, tableName, recordId, data);
  }

  /**
   * 软删除记录
   */
  async softDeleteRecord(
    tenantId: string,
    tableId: string,
    recordId: string | number,
  ): Promise<void> {
    const db = this.dbManager.getTenantDb(tenantId);
    const tableName = this.getTableName(tableId);
    softDeleteRecord(db, tableName, recordId);
  }

  /**
   * 恢复软删除记录
   */
  async restoreRecord(
    tenantId: string,
    tableId: string,
    recordId: string | number,
  ): Promise<void> {
    const db = this.dbManager.getTenantDb(tenantId);
    const tableName = this.getTableName(tableId);
    restoreRecord(db, tableName, recordId);
  }

  // ─── 辅助方法 ──────────────────────────────────────────

  /**
   * 检查物理表是否存在
   */
  async tableExists(tenantId: string, tableId: string): Promise<boolean> {
    const db = this.dbManager.getTenantDb(tenantId);
    const tableName = this.getTableName(tableId);

    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    ).get(tableName);

    return !!result;
  }

  /**
   * 获取表结构信息
   */
  async getTableInfo(tenantId: string, tableId: string): Promise<any[]> {
    const db = this.dbManager.getTenantDb(tenantId);
    const tableName = this.getTableName(tableId);

    return db.prepare(`PRAGMA table_info(${tableName})`).all();
  }
}
