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

/** 高级查询选项 */
export interface AdvancedQueryOptions {
  /** 选择的字段（为空时 SELECT *） */
  select?: string[];
  /** 过滤条件（MongoDB 风格操作符） */
  where?: Record<string, any>;
  /** 排序 */
  orderBy?: Record<string, 'asc' | 'desc'>;
  /** 限制数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
  /** 聚合函数 */
  aggregate?: { type: 'count' | 'sum' | 'avg' | 'min' | 'max'; field?: string };
  /** 是否包含已删除记录 */
  includeDeleted?: boolean;
  /** 安全白名单：允许的列名，防止 SQL 注入 */
  allowedColumns: string[];
  /** 内存过滤函数（当 SQL 无法表达时的降级方案） */
  memoryFilter?: (record: any) => boolean;
  /** 内存过滤时的 SQL 查询上限，默认 10000 */
  memoryFilterLimit?: number;
}

/** MongoDB 风格操作符到 SQL 的映射 */
const OPERATOR_MAP: Record<string, string> = {
  $ne: '!=',
  $gt: '>',
  $lt: '<',
  $gte: '>=',
  $lte: '<=',
  $like: 'LIKE',
};

/**
 * 校验列名是否在白名单中
 */
function assertColumnAllowed(column: string, allowedColumns: string[]): void {
  if (!allowedColumns.includes(column)) {
    throw new Error(`Column "${column}" is not in the allowed columns list`);
  }
}

/**
 * 将 MongoDB 风格的 where 对象转换为 SQL 条件和参数
 *
 * @param where 过滤条件对象
 * @param allowedColumns 允许的列名白名单
 * @returns SQL 条件片段和参数数组
 */
function buildWhereClause(
  where: Record<string, any>,
  allowedColumns: string[],
): { conditions: string[]; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];

  for (const [field, value] of Object.entries(where)) {
    assertColumnAllowed(field, allowedColumns);

    if (value === null || value === undefined) {
      conditions.push(`[${field}] IS NULL`);
      continue;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      // 操作符对象：{ $ne: v, $gt: v, ... }
      for (const [op, opValue] of Object.entries(value)) {
        const sqlOp = OPERATOR_MAP[op];
        if (!sqlOp) {
          throw new Error(`Unsupported operator: ${op}`);
        }
        if (op === '$in') {
          if (!Array.isArray(opValue)) {
            throw new Error('$in operator requires an array value');
          }
          if (opValue.length === 0) {
            // IN 空数组 → 永假条件
            conditions.push('1 = 0');
          } else {
            const placeholders = opValue.map(() => '?').join(', ');
            conditions.push(`[${field}] IN (${placeholders})`);
            params.push(...opValue);
          }
        } else {
          conditions.push(`[${field}] ${sqlOp} ?`);
          params.push(opValue);
        }
      }
    } else {
      // 简单等值：{ field: value }
      conditions.push(`[${field}] = ?`);
      params.push(value);
    }
  }

  return { conditions, params };
}

/**
 * 高级查询 — 支持 SELECT/WHERE/ORDER BY/LIMIT/OFFSET/聚合
 *
 * @param db SQLite 数据库实例
 * @param tableId 物理表名（裸 hex ID）
 * @param options 查询选项
 * @returns 查询结果数组（聚合时返回 [{ result: number }]）
 */
export function queryRecordsAdvanced(
  db: SqliteDb,
  tableId: string,
  options: AdvancedQueryOptions,
): any[] {
  const {
    select,
    where,
    orderBy,
    limit,
    offset,
    aggregate,
    includeDeleted = false,
    allowedColumns,
    memoryFilter,
    memoryFilterLimit = 10000,
  } = options;

  // 聚合查询
  if (aggregate) {
    let sql: string;
    const params: any[] = [];
    const whereConditions: string[] = [];

    if (!includeDeleted) {
      whereConditions.push('_deleted = 0');
    }
    if (where) {
      const clause = buildWhereClause(where, allowedColumns);
      whereConditions.push(...clause.conditions);
      params.push(...clause.params);
    }

    const whereStr = whereConditions.length > 0
      ? ` WHERE ${whereConditions.join(' AND ')}`
      : '';

    switch (aggregate.type) {
      case 'count':
        sql = `SELECT COUNT(*) as result FROM [${tableId}]${whereStr}`;
        break;
      case 'sum':
      case 'avg':
      case 'min':
      case 'max': {
        if (!aggregate.field) {
          throw new Error(`Aggregate "${aggregate.type}" requires a field`);
        }
        assertColumnAllowed(aggregate.field, allowedColumns);
        const func = aggregate.type.toUpperCase();
        sql = `SELECT ${func}([${aggregate.field}]) as result FROM [${tableId}]${whereStr}`;
        break;
      }
      default:
        throw new Error(`Unsupported aggregate type: ${aggregate.type}`);
    }

    return db.prepare(sql).all(...params);
  }

  // 非聚合查询
  const selectClause = select && select.length > 0
    ? select.map(f => {
        assertColumnAllowed(f, allowedColumns);
        return `[${f}]`;
      }).join(', ')
    : '*';

  let sql = `SELECT ${selectClause} FROM [${tableId}]`;
  const conditions: string[] = [];
  const params: any[] = [];

  if (!includeDeleted) {
    conditions.push('_deleted = 0');
  }
  if (where) {
    const clause = buildWhereClause(where, allowedColumns);
    conditions.push(...clause.conditions);
    params.push(...clause.params);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  // ORDER BY
  if (orderBy) {
    const orderClauses = Object.entries(orderBy).map(([field, direction]) => {
      assertColumnAllowed(field, allowedColumns);
      return `[${field}] ${direction.toUpperCase()}`;
    });
    sql += ` ORDER BY ${orderClauses.join(', ')}`;
  }

  // 内存过滤降级：不加 SQL LIMIT，先查全量再 JS 过滤
  if (memoryFilter) {
    sql += ` LIMIT ?`;
    params.push(memoryFilterLimit);
    const rows = db.prepare(sql).all(...params);
    return rows.filter(memoryFilter);
  }

  // LIMIT / OFFSET
  if (limit !== undefined) {
    sql += ` LIMIT ?`;
    params.push(limit);
    if (offset !== undefined) {
      sql += ` OFFSET ?`;
      params.push(offset);
    }
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
