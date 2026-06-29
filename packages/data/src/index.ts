// 核心
export { DatabaseManager } from './database';
export { TenantDatabasePool } from './pool';

// SQLite koffi 封装（可选使用）
export { KoffiDatabase, createDatabase } from './sqlite-koffi';

// 迁移
export { runMigrations, getDbVersion, setDbVersion, hasPendingMigrations } from './migration';

// Schema
export { SYSTEM_SCHEMA_SQL, SYSTEM_MIGRATIONS, SYSTEM_DB_VERSION } from './schema/system';
export { TENANT_SCHEMA_SQL, TENANT_MIGRATIONS, TENANT_DB_VERSION } from './schema/tenant';

// 动态建表
export {
  generateCreateTableSQL,
  generateAlterTableSQL,
  executeTableSchema,
  softDeleteRecord,
  restoreRecord,
  queryRecords,
  queryRecordsAdvanced,
  insertRecord,
  updateRecord,
} from './schema-builder';
export type { AdvancedQueryOptions } from './schema-builder';

// 类型
export type {
  DatabaseConfig,
  TenantRecord,
  SqliteDb,
  SqliteStatement,
  MigrationFn,
  MigrationEntry,
} from './types';
export { DEFAULT_DATABASE_CONFIG } from './types';
