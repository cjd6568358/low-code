/**
 * 文件系统数据库适配器
 *
 * 将文件系统操作封装为 DatabaseAdapter 接口，
 * 用于 WorkflowEngine 的数据持久化。
 */

import fs from 'fs';
import path from 'path';
import type { DatabaseAdapter } from '@low-code/workflow';

/**
 * 文件系统数据库适配器
 *
 * 使用 JSON 文件存储数据，模拟数据库操作。
 * 数据结构：
 * - instances/: 流程实例
 * - tasks/: 审批任务
 * - snapshots/: 快照
 * - workflows/: 流程定义
 */
export class FileDatabaseAdapter implements DatabaseAdapter {
  private transactionStack: Array<() => void> = [];

  constructor(private readonly baseDir: string) {
    // 确保目录存在
    this.ensureDir('instances');
    this.ensureDir('tasks');
    this.ensureDir('snapshots');
    this.ensureDir('workflows');
  }

  /**
   * 执行 SQL（简化实现，只支持基本的 INSERT/UPDATE/SELECT/DELETE）
   */
  async run(sql: string, params?: unknown[]): Promise<{ changes: number; lastID: number }> {
    const normalizedSql = sql.trim().toUpperCase();

    if (normalizedSql.startsWith('INSERT')) {
      return this.handleInsert(sql, params);
    }

    if (normalizedSql.startsWith('UPDATE')) {
      return this.handleUpdate(sql, params);
    }

    if (normalizedSql.startsWith('DELETE')) {
      return this.handleDelete(sql, params);
    }

    return { changes: 0, lastID: 0 };
  }

  /**
   * 查询单条记录
   */
  async get<T>(sql: string, params?: unknown[]): Promise<T | undefined> {
    const results = await this.all<T>(sql, params);
    return results[0];
  }

  /**
   * 查询多条记录
   */
  async all<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const normalizedSql = sql.trim().toUpperCase();

    if (normalizedSql.startsWith('SELECT')) {
      const results = this.handleSelect<T>(sql, params);
      // 转换字段名：下划线 -> 驼峰
      return results.map((r: any) => this.convertToCamelCase(r));
    }

    return [];
  }

  /**
   * 转换对象字段名为驼峰格式
   */
  private convertToCamelCase(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const result: any = {};
    for (const key of Object.keys(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = obj[key];
    }
    return result;
  }

  /**
   * 开始事务
   */
  async beginTransaction(): Promise<void> {
    this.transactionStack.push(() => {});
  }

  /**
   * 提交事务
   */
  async commit(): Promise<void> {
    this.transactionStack.pop();
  }

  /**
   * 回滚事务
   */
  async rollback(): Promise<void> {
    const rollbackFn = this.transactionStack.pop();
    if (rollbackFn) {
      rollbackFn();
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 处理 INSERT 语句
   */
  private handleInsert(sql: string, params?: unknown[]): { changes: number; lastID: number } {
    // 解析表名
    const tableMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
    if (!tableMatch) {
      return { changes: 0, lastID: 0 };
    }

    const table = tableMatch[1].toLowerCase();
    const dir = this.getTableDir(table);

    // 解析 ID（第一个参数通常是 ID）
    const id = params?.[0] as string;
    if (!id) {
      return { changes: 0, lastID: 0 };
    }

    // 构建记录对象
    const record = this.buildRecordFromInsert(sql, params);

    // 写入文件
    const filePath = path.join(dir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');

    return { changes: 1, lastID: 1 };
  }

  /**
   * 处理 UPDATE 语句
   */
  private handleUpdate(sql: string, params?: unknown[]): { changes: number; lastID: number } {
    // 解析表名
    const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
    if (!tableMatch) {
      return { changes: 0, lastID: 0 };
    }

    const table = tableMatch[1].toLowerCase();
    const dir = this.getTableDir(table);

    // 查找 WHERE 条件中的 ID
    const id = this.extractIdFromWhere(sql, params);
    if (!id) {
      return { changes: 0, lastID: 0 };
    }

    // 读取现有记录
    const filePath = path.join(dir, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return { changes: 0, lastID: 0 };
    }

    const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // 解析 SET 子句
    const updates = this.parseSetClause(sql, params);

    // 合并更新
    const updated = { ...existing, ...updates };

    // 写入文件
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');

    return { changes: 1, lastID: 1 };
  }

  /**
   * 处理 DELETE 语句
   */
  private handleDelete(sql: string, params?: unknown[]): { changes: number; lastID: number } {
    // 解析表名
    const tableMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);
    if (!tableMatch) {
      return { changes: 0, lastID: 0 };
    }

    const table = tableMatch[1].toLowerCase();
    const dir = this.getTableDir(table);

    // 查找 WHERE 条件中的 ID
    const id = this.extractIdFromWhere(sql, params);
    if (!id) {
      return { changes: 0, lastID: 0 };
    }

    // 删除文件
    const filePath = path.join(dir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { changes: 1, lastID: 1 };
    }

    return { changes: 0, lastID: 0 };
  }

  /**
   * 处理 SELECT 语句
   */
  private handleSelect<T>(sql: string, params?: unknown[]): T[] {
    // 解析表名
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (!tableMatch) {
      return [];
    }

    const table = tableMatch[1].toLowerCase();
    const dir = this.getTableDir(table);

    // 读取所有记录
    if (!fs.existsSync(dir)) {
      return [];
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    let records: T[] = [];

    for (const file of files) {
      try {
        const filePath = path.join(dir, file);
        const record = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        records.push(record);
      } catch {
        // 跳过损坏的文件
      }
    }

    // 应用 WHERE 条件
    records = this.applyWhereClause(records, sql, params);

    // 应用 ORDER BY
    records = this.applyOrderBy(records, sql);

    // 应用 LIMIT
    records = this.applyLimit(records, sql);

    return records;
  }

  /**
   * 获取表目录
   */
  private getTableDir(table: string): string {
    const tableDirMap: Record<string, string> = {
      'workflow_instances': 'instances',
      'instances': 'instances',
      'workflow_tasks': 'tasks',
      'tasks': 'tasks',
      'workflow_snapshots': 'snapshots',
      'snapshots': 'snapshots',
      'workflow_definitions': 'workflows',
      'workflows': 'workflows',
    };

    const dirName = tableDirMap[table] || table;
    return path.join(this.baseDir, dirName);
  }

  /**
   * 确保目录存在
   */
  private ensureDir(subDir: string): void {
    const dir = path.join(this.baseDir, subDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * 从 INSERT 语句构建记录
   */
  private buildRecordFromInsert(sql: string, params?: unknown[]): any {
    // 解析列名（支持多行）
    const columnsMatch = sql.match(/\(([^)]+)\)\s*VALUES/is);
    if (!columnsMatch) {
      return {};
    }

    const columns = columnsMatch[1].split(',').map(c => c.trim().replace(/\s+/g, ''));
    const record: any = {};

    for (let i = 0; i < columns.length && i < (params?.length || 0); i++) {
      const col = columns[i];
      const value = params![i];

      // 尝试解析 JSON 字符串
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          record[col] = JSON.parse(value);
        } catch {
          record[col] = value;
        }
      } else {
        record[col] = value;
      }
    }

    return record;
  }

  /**
   * 从 WHERE 条件提取 ID
   */
  private extractIdFromWhere(sql: string, params?: unknown[]): string | null {
    // 查找 WHERE ... id = ? 模式
    const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
    if (whereMatch && params && params.length > 0) {
      return params[params.length - 1] as string;
    }

    return null;
  }

  /**
   * 解析 SET 子句
   */
  private parseSetClause(sql: string, params?: unknown[]): any {
    const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
    if (!setMatch) {
      return {};
    }

    const setClause = setMatch[1];
    const assignments = setClause.split(',').map(a => a.trim());
    const updates: any = {};

    let paramIndex = 0;

    for (const assignment of assignments) {
      const [col] = assignment.split('=').map(s => s.trim());
      if (col && params && paramIndex < params.length) {
        const value = params[paramIndex];

        // 尝试解析 JSON 字符串
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          try {
            updates[col] = JSON.parse(value);
          } catch {
            updates[col] = value;
          }
        } else {
          updates[col] = value;
        }

        paramIndex++;
      }
    }

    return updates;
  }

  /**
   * 应用 WHERE 条件
   * 支持多条件 AND 连接，支持参数化 (?) 和字面量值
   */
  private applyWhereClause<T>(records: T[], sql: string, params?: unknown[]): T[] {
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER|GROUP|LIMIT|$)/i);
    if (!whereMatch) {
      return records;
    }

    const whereClause = whereMatch[1].trim();
    const conditions = this.parseWhereConditions(whereClause, params);

    if (conditions.length === 0) {
      return records;
    }

    return records.filter((record: any) => {
      return conditions.every(({ column, value, operator }) => {
        // 转换列名为驼峰格式
        const camelColumn = column.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        const recordValue = record[camelColumn] ?? record[column];

        let result = false;
        switch (operator) {
          case '=':
            result = recordValue === value;
            break;
          case '!=':
            result = recordValue !== value;
            break;
          case '>':
            result = Number(recordValue) > Number(value);
            break;
          case '<':
            result = Number(recordValue) < Number(value);
            break;
          case '>=':
            result = Number(recordValue) >= Number(value);
            break;
          case '<=':
            result = Number(recordValue) <= Number(value);
            break;
          case 'LIKE':
            result = typeof recordValue === 'string' && recordValue.includes(String(value).replace(/%/g, ''));
            break;
          case 'IN':
            result = Array.isArray(value) && value.includes(recordValue);
            break;
          default:
            result = recordValue === value;
        }

        return result;
      });
    });
  }

  /**
   * 解析 WHERE 条件
   */
  private parseWhereConditions(whereClause: string, params?: unknown[]): Array<{
    column: string;
    value: unknown;
    operator: string;
  }> {
    const conditions: Array<{ column: string; value: unknown; operator: string }> = [];
    let paramIndex = 0;

    // 分割 AND 条件
    const parts = whereClause.split(/\s+AND\s+/i);

    for (const part of parts) {
      const trimmed = part.trim();

      // 匹配 column = ? 或 column = 'value' 或 column = value
      const match = trimmed.match(/(\w+)\s*(=|!=|>|<|>=|<=|LIKE|IN)\s*(.+)/i);
      if (!match) continue;

      const [, column, operator, valueExpr] = match;
      let value: unknown;

      if (valueExpr.trim() === '?') {
        // 参数化值
        value = params?.[paramIndex];
        paramIndex++;
      } else if (valueExpr.trim().startsWith("'") && valueExpr.trim().endsWith("'")) {
        // 字符串字面量
        value = valueExpr.trim().slice(1, -1);
      } else if (valueExpr.trim() === 'NULL') {
        value = null;
      } else {
        // 尝试解析为数字
        const num = Number(valueExpr.trim());
        value = isNaN(num) ? valueExpr.trim() : num;
      }

      conditions.push({ column, value, operator: operator.toUpperCase() });
    }

    return conditions;
  }

  /**
   * 应用 ORDER BY
   */
  private applyOrderBy<T>(records: T[], sql: string): T[] {
    const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
    if (!orderMatch) {
      return records;
    }

    const column = orderMatch[1];
    const direction = (orderMatch[2] || 'ASC').toUpperCase();

    return [...records].sort((a: any, b: any) => {
      const aVal = a[column];
      const bVal = b[column];

      if (aVal < bVal) return direction === 'ASC' ? -1 : 1;
      if (aVal > bVal) return direction === 'ASC' ? 1 : -1;
      return 0;
    });
  }

  /**
   * 应用 LIMIT
   */
  private applyLimit<T>(records: T[], sql: string): T[] {
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (!limitMatch) {
      return records;
    }

    const limit = parseInt(limitMatch[1], 10);
    return records.slice(0, limit);
  }
}
