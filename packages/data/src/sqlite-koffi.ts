/**
 * SQLite koffi FFI 封装
 *
 * 使用 koffi 直接调用 sqlite3.dll，无需编译原生模块
 */

import koffi from 'koffi';
import path from 'path';
import fs from 'fs';

// ─── SQLite DLL 路径 ──────────────────────────────────────

const LIB_DIR = path.join(__dirname, '..', 'lib');
const SQLITE_DLL_PATH = path.join(LIB_DIR, 'sqlite3.dll');

// 检查 DLL 是否存在
if (!fs.existsSync(SQLITE_DLL_PATH)) {
  throw new Error(
    `SQLite DLL not found at: ${SQLITE_DLL_PATH}\n` +
    'Please download from https://www.sqlite.org/download.html\n' +
    'and place sqlite3.dll in packages/data/lib/'
  );
}

// ─── 加载 SQLite 库 ───────────────────────────────────────

const lib = koffi.load(SQLITE_DLL_PATH);

// ─── 定义不透明指针类型 ───────────────────────────────────

// sqlite3 和 sqlite3_stmt 的不透明类型
const sqlite3 = koffi.opaque('sqlite3');
const sqlite3_stmt = koffi.opaque('sqlite3_stmt');

// 指针类型（用于函数参数）
const sqlite3_ptr = koffi.pointer(sqlite3);           // sqlite3*
const sqlite3_ptr_ptr = koffi.pointer(sqlite3_ptr);    // sqlite3**
const sqlite3_stmt_ptr = koffi.pointer(sqlite3_stmt);  // sqlite3_stmt*
const sqlite3_stmt_ptr_ptr = koffi.pointer(sqlite3_stmt_ptr); // sqlite3_stmt**

// ─── SQLite 常量 ──────────────────────────────────────────

export const SQLITE_OK = 0;
export const SQLITE_ROW = 100;
export const SQLITE_DONE = 101;

export const SQLITE_INTEGER = 1;
export const SQLITE_FLOAT = 2;
export const SQLITE_TEXT = 3;
export const SQLITE_BLOB = 4;
export const SQLITE_NULL = 5;

// ─── SQLite 函数签名 ──────────────────────────────────────

// 数据库连接
const sqlite3_open = lib.func('sqlite3_open', 'int', ['str', koffi.out(sqlite3_ptr_ptr)]);
const sqlite3_close = lib.func('sqlite3_close', 'int', [sqlite3_ptr]);
const sqlite3_errmsg = lib.func('sqlite3_errmsg', 'str', [sqlite3_ptr]);

// SQL 执行
const sqlite3_exec = lib.func('sqlite3_exec', 'int', [
  sqlite3_ptr, 'str', 'void *', 'void *', 'void *'
]);

// 预编译语句
const sqlite3_prepare_v2 = lib.func('sqlite3_prepare_v2', 'int', [
  sqlite3_ptr, 'str', 'int', koffi.out(sqlite3_stmt_ptr_ptr), 'void *'
]);
const sqlite3_step = lib.func('sqlite3_step', 'int', [sqlite3_stmt_ptr]);
const sqlite3_finalize = lib.func('sqlite3_finalize', 'int', [sqlite3_stmt_ptr]);
const sqlite3_reset = lib.func('sqlite3_reset', 'int', [sqlite3_stmt_ptr]);

// 绑定参数
const sqlite3_bind_int = lib.func('sqlite3_bind_int', 'int', [sqlite3_stmt_ptr, 'int', 'int']);
const sqlite3_bind_int64 = lib.func('sqlite3_bind_int64', 'int', [sqlite3_stmt_ptr, 'int', 'int64']);
const sqlite3_bind_double = lib.func('sqlite3_bind_double', 'int', [sqlite3_stmt_ptr, 'int', 'double']);
const sqlite3_bind_text = lib.func('sqlite3_bind_text', 'int', [sqlite3_stmt_ptr, 'int', 'str', 'int', 'void *']);
const sqlite3_bind_blob = lib.func('sqlite3_bind_blob', 'int', [sqlite3_stmt_ptr, 'int', 'void *', 'int', 'void *']);
const sqlite3_bind_null = lib.func('sqlite3_bind_null', 'int', [sqlite3_stmt_ptr, 'int']);
const sqlite3_bind_parameter_count = lib.func('sqlite3_bind_parameter_count', 'int', [sqlite3_stmt_ptr]);

// 获取列值
const sqlite3_column_count = lib.func('sqlite3_column_count', 'int', [sqlite3_stmt_ptr]);
const sqlite3_column_name = lib.func('sqlite3_column_name', 'str', [sqlite3_stmt_ptr, 'int']);
const sqlite3_column_type = lib.func('sqlite3_column_type', 'int', [sqlite3_stmt_ptr, 'int']);
const sqlite3_column_int = lib.func('sqlite3_column_int', 'int', [sqlite3_stmt_ptr, 'int']);
const sqlite3_column_int64 = lib.func('sqlite3_column_int64', 'int64', [sqlite3_stmt_ptr, 'int']);
const sqlite3_column_double = lib.func('sqlite3_column_double', 'double', [sqlite3_stmt_ptr, 'int']);
const sqlite3_column_text = lib.func('sqlite3_column_text', 'str', [sqlite3_stmt_ptr, 'int']);
const sqlite3_column_blob = lib.func('sqlite3_column_blob', 'void *', [sqlite3_stmt_ptr, 'int']);
const sqlite3_column_bytes = lib.func('sqlite3_column_bytes', 'int', [sqlite3_stmt_ptr, 'int']);

// 变更统计
const sqlite3_changes = lib.func('sqlite3_changes', 'int', [sqlite3_ptr]);
const sqlite3_last_insert_rowid = lib.func('sqlite3_last_insert_rowid', 'int64', [sqlite3_ptr]);

// 内存管理
const sqlite3_free = lib.func('sqlite3_free', 'void', ['void *']);

// ─── Database 类封装 ──────────────────────────────────────

export class KoffiDatabase {
  private db: any = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.open();
  }

  /**
   * 打开数据库连接
   */
  private open(): void {
    // 使用 koffi.out() 标记输出参数，数组会被填充
    const outDb = [null];
    const rc = sqlite3_open(this.dbPath, outDb);

    this.db = outDb[0];

    if (rc !== SQLITE_OK) {
      throw new Error(`Failed to open database: ${this.db ? sqlite3_errmsg(this.db) : 'unknown error'}`);
    }
  }

  /**
   * 执行 SQL（无返回值）
   */
  exec(sql: string): void {
    // exec 的错误消息通过最后的 char** 参数返回
    // 简化处理：直接检查返回码，用 errmsg 获取错误
    const rc = sqlite3_exec(this.db, sql, null, null, null);

    if (rc !== SQLITE_OK) {
      throw new Error(`SQL error: ${sqlite3_errmsg(this.db)}`);
    }
  }

  /**
   * 执行 Pragma 命令
   */
  pragma(pragma: string, value?: string | number): any {
    if (value !== undefined) {
      // 设置 pragma 值
      const stmt = this.prepare(`PRAGMA ${pragma} = ${value}`);
      stmt.get();
      return undefined;
    } else {
      // 获取 pragma 值
      const result = this.prepare(`PRAGMA ${pragma}`).get();
      // pragma 结果通常是单行单列，返回第一个值
      if (result && typeof result === 'object') {
        const keys = Object.keys(result);
        if (keys.length === 1) return result[keys[0]];
      }
      return result;
    }
  }

  /**
   * 准备 SQL 语句
   */
  prepare(sql: string): PreparedStatementWrapper {
    const outStmt = [null];
    const rc = sqlite3_prepare_v2(this.db, sql, -1, outStmt, null);

    if (rc !== SQLITE_OK) {
      throw new Error(`Failed to prepare statement: ${sqlite3_errmsg(this.db)}`);
    }

    return new PreparedStatementWrapper(this.db, outStmt[0], sql);
  }

  /**
   * 执行事务
   */
  transaction<T>(fn: () => T): T {
    this.exec('BEGIN TRANSACTION');
    try {
      const result = fn();
      this.exec('COMMIT');
      return result;
    } catch (error) {
      this.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * 获取变更行数
   */
  changes(): number {
    return sqlite3_changes(this.db);
  }

  /**
   * 获取最后插入的行 ID
   */
  lastInsertRowid(): bigint {
    return sqlite3_last_insert_rowid(this.db);
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      sqlite3_close(this.db);
      this.db = null;
    }
  }
}

// ─── 预编译语句封装 ───────────────────────────────────────

export class PreparedStatementWrapper {
  private db: any;
  private stmt: any;
  private sql: string;

  constructor(db: any, stmt: any, sql: string) {
    this.db = db;
    this.stmt = stmt;
    this.sql = sql;
  }

  /**
   * 绑定参数
   */
  bind(...params: any[]): this {
    const paramCount = sqlite3_bind_parameter_count(this.stmt);

    if (params.length !== paramCount) {
      throw new Error(`Expected ${paramCount} parameters, got ${params.length}`);
    }

    for (let i = 0; i < params.length; i++) {
      const value = params[i];
      const index = i + 1;

      if (value === null || value === undefined) {
        sqlite3_bind_null(this.stmt, index);
      } else if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          sqlite3_bind_int64(this.stmt, index, BigInt(value));
        } else {
          sqlite3_bind_double(this.stmt, index, value);
        }
      } else if (typeof value === 'bigint') {
        sqlite3_bind_int64(this.stmt, index, value);
      } else if (typeof value === 'string') {
        // SQLITE_TRANSIENT = -1: SQLite 会自行拷贝字符串，避免 koffi 指针提前释放
        sqlite3_bind_text(this.stmt, index, value, -1, -1);
      } else if (Buffer.isBuffer(value)) {
        sqlite3_bind_blob(this.stmt, index, value, value.length, null);
      } else {
        sqlite3_bind_text(this.stmt, index, String(value), -1, null);
      }
    }

    return this;
  }

  /**
   * 执行查询并返回所有结果
   */
  all(...params: any[]): any[] {
    if (params.length > 0) this.bind(...params);

    const results: any[] = [];
    const columns = this.getColumnNames();

    while (sqlite3_step(this.stmt) === SQLITE_ROW) {
      results.push(this.readRow(columns));
    }

    sqlite3_reset(this.stmt);
    return results;
  }

  /**
   * 执行查询并返回第一行
   */
  get(...params: any[]): any {
    if (params.length > 0) this.bind(...params);

    const columns = this.getColumnNames();
    const rc = sqlite3_step(this.stmt);

    if (rc === SQLITE_ROW) {
      const row = this.readRow(columns);
      sqlite3_reset(this.stmt);
      return row;
    }

    sqlite3_reset(this.stmt);
    return undefined;
  }

  /**
   * 执行语句（INSERT, UPDATE, DELETE）
   */
  run(...params: any[]): { changes: number; lastInsertRowid: bigint } {
    if (params.length > 0) this.bind(...params);

    sqlite3_step(this.stmt);
    const changes = sqlite3_changes(this.db);
    const lastInsertRowid = sqlite3_last_insert_rowid(this.db);

    sqlite3_reset(this.stmt);
    return { changes, lastInsertRowid };
  }

  /**
   * 获取列名
   */
  private getColumnNames(): string[] {
    const count = sqlite3_column_count(this.stmt);
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      names.push(sqlite3_column_name(this.stmt, i));
    }

    return names;
  }

  /**
   * 读取当前行数据
   */
  private readRow(columns: string[]): any {
    const row: any = {};

    for (let i = 0; i < columns.length; i++) {
      const type = sqlite3_column_type(this.stmt, i);

      switch (type) {
        case SQLITE_INTEGER:
          row[columns[i]] = Number(sqlite3_column_int64(this.stmt, i));
          break;
        case SQLITE_FLOAT:
          row[columns[i]] = sqlite3_column_double(this.stmt, i);
          break;
        case SQLITE_TEXT:
          row[columns[i]] = sqlite3_column_text(this.stmt, i);
          break;
        case SQLITE_BLOB:
          const blobPtr = sqlite3_column_blob(this.stmt, i);
          const blobSize = sqlite3_column_bytes(this.stmt, i);
          // 从内存地址读取 blob 数据
          const blobBuffer = Buffer.alloc(blobSize);
          koffi.copy(blobBuffer, blobPtr, blobSize);
          row[columns[i]] = blobBuffer;
          break;
        case SQLITE_NULL:
        default:
          row[columns[i]] = null;
          break;
      }
    }

    return row;
  }

  /**
   * 释放语句资源
   */
  finalize(): void {
    if (this.stmt) {
      sqlite3_finalize(this.stmt);
      this.stmt = null;
    }
  }
}

// ─── 导出工厂函数 ─────────────────────────────────────────

/**
 * 创建数据库连接
 */
export function createDatabase(dbPath: string): KoffiDatabase {
  return new KoffiDatabase(dbPath);
}

export default KoffiDatabase;
