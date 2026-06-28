/**
 * Schema 到 SQL 转换器
 *
 * 将 TableSchema 转换为 SQLite DDL 语句，支持：
 * - CREATE TABLE（建表）
 * - ALTER TABLE（增删列）
 * - 外键约束（REFERENCES）
 * - 软删除标记
 */

import type { SqliteDb } from './types';
import type { TableSchema, TableColumn, TableFieldType } from '@low-code/shared';

// ─── 字段类型映射 ──────────────────────────────────────

/** TableFieldType → SQLite 类型 */
const FIELD_TYPE_MAP: Record<TableFieldType, string> = {
  string: 'TEXT',
  number: 'INTEGER',
  boolean: 'INTEGER',
  date: 'TEXT',
  json: 'TEXT',
};

/** 获取 SQLite 列类型 */
function getColumnSqlType(column: TableColumn): string {
  // 系统主键固定为 INTEGER AUTOINCREMENT
  if (column.system && column.fieldName === 'id') {
    return 'INTEGER';
  }
  return FIELD_TYPE_MAP[column.fieldType] || 'TEXT';
}

// ─── 列定义生成 ────────────────────────────────────────

/** 生成单列的 SQL 定义 */
function generateColumnDef(column: TableColumn): string {
  const parts: string[] = [column.fieldName];

  // 类型
  parts.push(getColumnSqlType(column));

  // 系统主键
  if (column.system && column.fieldName === 'id') {
    parts.push('PRIMARY KEY AUTOINCREMENT');
    return parts.join(' ');
  }

  // 非空约束
  if (column.required) {
    parts.push('NOT NULL');
  }

  // 默认值
  if (column.defaultValue !== undefined && column.defaultValue !== '') {
    const defaultVal = column.defaultValue;
    // 特殊处理：datetime('now')
    if (defaultVal === 'now()' || defaultVal === 'datetime(\'now\')') {
      parts.push("DEFAULT (datetime('now'))");
    } else if (column.fieldType === 'boolean') {
      // 布尔值转 0/1
      parts.push(`DEFAULT ${defaultVal === 'true' ? 1 : 0}`);
    } else if (column.fieldType === 'number') {
      parts.push(`DEFAULT ${defaultVal}`);
    } else {
      // 字符串默认值加引号
      parts.push(`DEFAULT '${defaultVal.replace(/'/g, "''")}'`);
    }
  }

  // 外键约束
  if (column.foreignKey) {
    const { targetTableId, targetFieldName = 'id', onDelete = 'RESTRICT' } = column.foreignKey;
    parts.push(`REFERENCES ${targetTableId}(${targetFieldName})`);
    if (onDelete !== 'RESTRICT') {
      parts.push(`ON DELETE ${onDelete}`);
    }
  }

  return parts.join(' ');
}

// ─── CREATE TABLE ──────────────────────────────────────

/**
 * 生成 CREATE TABLE SQL
 *
 * @param tableId 物理表名（直接用 tableId）
 * @param schema 数据表 Schema
 * @returns CREATE TABLE 语句
 */
export function generateCreateTableSQL(tableId: string, schema: TableSchema): string {
  const columns = schema.columns;

  // 系统主键列
  const systemIdCol: TableColumn = {
    id: 'sys_id',
    fieldName: 'id',
    fieldType: 'number',
    required: true,
    system: true,
    description: '主键（自增）',
  };

  // 软删除标记列
  const deletedCol: TableColumn = {
    id: 'sys_deleted',
    fieldName: '_deleted',
    fieldType: 'boolean',
    required: false,
    defaultValue: 'false',
    system: true,
    description: '软删除标记',
  };

  // 创建时间列
  const createdAtCol: TableColumn = {
    id: 'sys_created',
    fieldName: '_created_at',
    fieldType: 'date',
    required: false,
    defaultValue: "datetime('now')",
    system: true,
    description: '创建时间',
  };

  // 更新时间列
  const updatedAtCol: TableColumn = {
    id: 'sys_updated',
    fieldName: '_updated_at',
    fieldType: 'date',
    required: false,
    defaultValue: "datetime('now')",
    system: true,
    description: '更新时间',
  };

  // 所有列：系统列 + 用户列
  const allColumns = [systemIdCol, ...columns, deletedCol, createdAtCol, updatedAtCol];

  const columnDefs = allColumns.map(generateColumnDef).join(',\n  ');

  // 表名用方括号包裹，避免数字开头的表名问题
  return `CREATE TABLE IF NOT EXISTS [${tableId}] (\n  ${columnDefs}\n);`;
}

// ─── ALTER TABLE ───────────────────────────────────────

/**
 * 生成 ALTER TABLE SQL（增量更新）
 *
 * SQLite 限制：不支持 DROP COLUMN（3.35+ 才支持），不支持 MODIFY COLUMN。
 * 为简化实现，采用「重建表」策略：
 * 1. 创建临时表（新结构）
 * 2. 复制数据（匹配的列）
 * 3. 删除旧表
 * 4. 重命名临时表
 *
 * @param tableId 物理表名
 * @param oldSchema 旧 Schema
 * @param newSchema 新 Schema
 * @returns SQL 语句数组（需在事务中执行）
 */
export function generateAlterTableSQL(
  tableId: string,
  oldSchema: TableSchema,
  newSchema: TableSchema,
): string[] {
  const tempTableId = `${tableId}_temp_${Date.now()}`;
  const quotedTableId = `[${tableId}]`;
  const quotedTempTableId = `[${tempTableId}]`;

  // 检查是否有实质变更（列增删或类型变化）
  const oldColMap = new Map(oldSchema.columns.map((c) => [c.id, c]));
  const newColMap = new Map(newSchema.columns.map((c) => [c.id, c]));

  const addedCols = newSchema.columns.filter((c) => !oldColMap.has(c.id));
  const removedCols = oldSchema.columns.filter((c) => !newColMap.has(c.id));
  const modifiedCols = newSchema.columns.filter((c) => {
    const old = oldColMap.get(c.id);
    if (!old) return false;
    return (
      old.fieldName !== c.fieldName ||
      old.fieldType !== c.fieldType ||
      old.required !== c.required ||
      old.defaultValue !== c.defaultValue ||
      old.foreignKey?.targetTableId !== c.foreignKey?.targetTableId
    );
  });

  // 无实质变更，跳过
  if (addedCols.length === 0 && removedCols.length === 0 && modifiedCols.length === 0) {
    return [];
  }

  const oldColNames = new Set(oldSchema.columns.map((c) => c.fieldName));
  const newColNames = new Set(newSchema.columns.map((c) => c.fieldName));

  // 共同列（用于数据迁移）
  const commonColNames = [...oldColNames].filter((name) => newColNames.has(name));

  const sqls: string[] = [];

  // 1. 创建临时表
  sqls.push(generateCreateTableSQL(tempTableId, newSchema));

  // 2. 复制数据（只复制共同列）
  const selectCols = ['id', ...commonColNames, '_deleted', '_created_at'].join(', ');
  const insertCols = ['id', ...commonColNames, '_deleted', '_created_at'].join(', ');
  sqls.push(
    `INSERT INTO ${quotedTempTableId} (${insertCols}) SELECT ${selectCols} FROM ${quotedTableId};`,
  );

  // 3. 删除旧表
  sqls.push(`DROP TABLE IF EXISTS ${quotedTableId};`);

  // 4. 重命名临时表
  sqls.push(`ALTER TABLE ${quotedTempTableId} RENAME TO ${quotedTableId};`);

  return sqls;
}

// ─── 执行建表/更新 ─────────────────────────────────────

/**
 * 执行数据表 Schema 同步（建表或更新表结构）
 *
 * @param db 数据库实例
 * @param tableId 物理表名
 * @param schema 新 Schema
 * @param oldSchema 旧 Schema（可选，存在时执行增量更新）
 */
export function executeTableSchema(
  db: SqliteDb,
  tableId: string,
  schema: TableSchema,
  oldSchema?: TableSchema,
): void {
  // 检查表是否存在
  const tableExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
  ).get(tableId);

  if (!tableExists) {
    // 新表：直接创建
    const createSQL = generateCreateTableSQL(tableId, schema);
    db.exec(createSQL);
    return;
  }

  if (oldSchema) {
    // 旧表：增量更新
    const alterSQLs = generateAlterTableSQL(tableId, oldSchema, schema);
    if (alterSQLs.length > 0) {
      db.transaction(() => {
        for (const sql of alterSQLs) {
          db.exec(sql);
        }
      });
    }
  }
  // 无 oldSchema 且表已存在：跳过（可能是手动建的表）
}

// ─── 软删除 ────────────────────────────────────────────

/**
 * 标记数据表为软删除（设置 _deleted = 1）
 *
 * @param db 数据库实例
 * @param tableId 物理表名
 * @param recordId 记录 ID
 */
export function softDeleteRecord(db: SqliteDb, tableId: string, recordId: string | number): void {
  db.prepare(
    `UPDATE [${tableId}] SET _deleted = 1, _updated_at = datetime('now') WHERE id = ?`,
  ).run(recordId);
}

/**
 * 恢复软删除记录
 */
export function restoreRecord(db: SqliteDb, tableId: string, recordId: string | number): void {
  db.prepare(
    `UPDATE [${tableId}] SET _deleted = 0, _updated_at = datetime('now') WHERE id = ?`,
  ).run(recordId);
}

/**
 * 查询记录（默认排除已删除）
 */
export function queryRecords(
  db: SqliteDb,
  tableId: string,
  options: { includeDeleted?: boolean; where?: string; params?: any[] } = {},
): any[] {
  const { includeDeleted = false, where, params = [] } = options;

  let sql = `SELECT * FROM [${tableId}]`;
  const conditions: string[] = [];

  if (!includeDeleted) {
    conditions.push('_deleted = 0');
  }
  if (where) {
    conditions.push(`(${where})`);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  return db.prepare(sql).all(...params);
}

/**
 * 插入记录
 */
export function insertRecord(
  db: SqliteDb,
  tableId: string,
  data: Record<string, any>,
): { id: number; changes: number } {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const placeholders = fields.map(() => '?').join(', ');

  const sql = `INSERT INTO [${tableId}] (${fields.join(', ')}) VALUES (${placeholders})`;
  const result = db.prepare(sql).run(...values);

  return {
    id: Number(result.lastInsertRowid),
    changes: result.changes,
  };
}

/**
 * 更新记录
 */
export function updateRecord(
  db: SqliteDb,
  tableId: string,
  recordId: string | number,
  data: Record<string, any>,
): number {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const setClause = fields.map((f) => `${f} = ?`).join(', ');

  const sql = `UPDATE [${tableId}] SET ${setClause}, _updated_at = datetime('now') WHERE id = ? AND _deleted = 0`;
  const result = db.prepare(sql).run(...values, recordId);

  return result.changes;
}
