/**
 * 数据层类型定义
 *
 * 租户级 SQLite 架构：每个租户一个独立 .db 文件，
 * 系统级数据存 _system.db。
 * 使用 koffi FFI 直接调用 sqlite3.dll。
 */

// ─── 配置 ──────────────────────────────────────────────

/** 数据层配置 */
export interface DatabaseConfig {
  /** 系统数据库目录（默认 './data'，存放 _system.db） */
  dataDir: string;
  /** 租户根目录（默认 './tenants'，每个租户下有 data/ 和 apps/） */
  tenantsDir: string;
  /** 连接池最大同时打开数（默认 50） */
  poolMaxSize: number;
  /** 是否开启 WAL 模式（默认 true） */
  walMode: boolean;
  /** SQLite busy 超时毫秒（默认 5000） */
  busyTimeout: number;
}

/** 默认配置 */
export const DEFAULT_DATABASE_CONFIG: DatabaseConfig = {
  dataDir: './data',
  tenantsDir: './tenants',
  poolMaxSize: 50,
  walMode: true,
  busyTimeout: 5000,
};

// ─── 租户元信息 ────────────────────────────────────────

/** 租户注册信息（_system.db 中的 tenants 表行） */
export interface TenantRecord {
  tenant_id: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'deleted';
  db_version: number;
  created_at: string;
  updated_at: string;
}

// ─── 数据库实例类型 ────────────────────────────────────

/**
 * SQLite 数据库接口（koffi FFI 实现）
 */
export interface SqliteDb {
  exec(sql: string): void;
  pragma(pragma: string, value?: string | number): any;
  prepare(sql: string): SqliteStatement;
  transaction<T>(fn: () => T): T;
  close(): void;
  changes(): number;
  lastInsertRowid(): bigint;
}

/**
 * 预编译语句接口
 */
export interface SqliteStatement {
  bind(...params: any[]): SqliteStatement;
  all(...params: any[]): any[];
  get(...params: any[]): any;
  run(...params: any[]): { changes: number; lastInsertRowid: bigint };
  finalize(): void;
}

/** 迁移函数 */
export type MigrationFn = (db: SqliteDb) => void;

/** 迁移条目 */
export interface MigrationEntry {
  version: number;
  description: string;
  up: MigrationFn;
}
