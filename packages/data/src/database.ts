/**
 * 数据库管理器 — 顶层入口
 *
 * 管理 _system.db 和所有租户级 tenant_xxx.db。
 * 提供初始化、创建、备份、关闭等生命周期管理。
 *
 * 使用 koffi FFI 直接调用 sqlite3.dll，无需编译原生模块。
 */

import path from 'path';
import fs from 'fs';
import type { DatabaseConfig, SqliteDb, TenantRecord } from './types';
import { DEFAULT_DATABASE_CONFIG } from './types';
import { KoffiDatabase } from './sqlite-koffi';
import { TenantDatabasePool } from './pool';
import { runMigrations } from './migration';
import { SYSTEM_MIGRATIONS } from './schema/system';
import { TENANT_MIGRATIONS, TENANT_DB_VERSION } from './schema/tenant';

// ─── 创建数据库实例 ──────────────────────────────────────

function createSqliteDb(dbPath: string): SqliteDb {
  return new KoffiDatabase(dbPath);
}

// ─── 数据库管理器 ─────────────────────────────────────────

export class DatabaseManager {
  private config: DatabaseConfig;
  private pool: TenantDatabasePool;
  private systemDb: SqliteDb | null = null;

  constructor(config: Partial<DatabaseConfig> = {}) {
    this.config = { ...DEFAULT_DATABASE_CONFIG, ...config };
    this.pool = new TenantDatabasePool(this.config);
  }

  // ─── 系统数据库 ──────────────────────────────────────

  /**
   * 初始化系统数据库（首次调用时创建并建表）
   */
  initSystemDb(): SqliteDb {
    if (this.systemDb) return this.systemDb;

    this.ensureDataDir();
    const dbPath = this.systemDbPath();
    const db = createSqliteDb(dbPath);

    // 基础配置
    db.pragma('busy_timeout', this.config.busyTimeout);
    if (this.config.walMode) {
      db.pragma('journal_mode', 'WAL');
    }
    db.pragma('foreign_keys', 'ON');

    // 执行迁移
    runMigrations(db, SYSTEM_MIGRATIONS);

    this.systemDb = db;
    return this.systemDb;
  }

  /**
   * 获取系统数据库实例
   */
  getSystemDb(): SqliteDb {
    if (!this.systemDb) {
      throw new Error('System DB not initialized. Call initSystemDb() first.');
    }
    return this.systemDb;
  }

  // ─── 租户数据库 ──────────────────────────────────────

  /**
   * 获取租户数据库（自动打开/创建，自动迁移）
   */
  getTenantDb(tenantId: string): SqliteDb {
    const dbPath = this.tenantDbPath(tenantId);
    const db = this.pool.get(tenantId, dbPath);

    // 自动迁移到最新版本
    runMigrations(db, TENANT_MIGRATIONS);

    return db;
  }

  /**
   * 创建新租户
   *
   * 1. 在 _system.db 中注册租户记录
   * 2. 创建租户独立的 .db 文件并执行初始 schema
   */
  createTenant(tenantId: string, name: string, plan: 'free' | 'pro' | 'enterprise' = 'free'): SqliteDb {
    const sysDb = this.getSystemDb();

    // 检查是否已存在
    const existing = sysDb.prepare('SELECT tenant_id FROM tenants WHERE tenant_id = ?').get(tenantId);
    if (existing) {
      throw new Error(`Tenant "${tenantId}" already exists.`);
    }

    // 注册到系统库
    sysDb.prepare(
      'INSERT INTO tenants (tenant_id, name, plan, status, db_version) VALUES (?, ?, ?, ?, ?)',
    ).run(tenantId, name, plan, 'active', TENANT_DB_VERSION);

    // 创建租户数据库（确保目录存在）
    const dbPath = this.tenantDbPath(tenantId);
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const db = this.pool.get(tenantId, dbPath);
    runMigrations(db, TENANT_MIGRATIONS);

    // 预置内置角色
    this.seedBuiltinRoles(db);

    return db;
  }

  /**
   * 删除租户（软删除：标记 deleted，不删文件）
   */
  deleteTenant(tenantId: string): void {
    const sysDb = this.getSystemDb();
    sysDb.prepare(
      "UPDATE tenants SET status = 'deleted', updated_at = datetime('now') WHERE tenant_id = ?",
    ).run(tenantId);

    // 关闭连接
    this.pool.close(tenantId);
  }

  /**
   * 备份租户数据库到指定路径
   */
  backupTenant(tenantId: string, destPath: string): void {
    const srcPath = this.tenantDbPath(tenantId);
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Tenant DB not found: ${tenantId}`);
    }

    // 直接复制文件（简单可靠）
    fs.copyFileSync(srcPath, destPath);
  }

  /**
   * 获取所有注册的租户列表
   */
  listTenants(): TenantRecord[] {
    const sysDb = this.getSystemDb();
    return sysDb.prepare('SELECT * FROM tenants ORDER BY created_at').all() as TenantRecord[];
  }

  /**
   * 获取活跃的租户列表
   */
  listActiveTenants(): TenantRecord[] {
    const sysDb = this.getSystemDb();
    return sysDb.prepare(
      "SELECT * FROM tenants WHERE status = 'active' ORDER BY created_at",
    ).all() as TenantRecord[];
  }

  /**
   * 关闭所有数据库连接
   */
  closeAll(): void {
    this.pool.closeAll();
    if (this.systemDb) {
      this.systemDb.close();
      this.systemDb = null;
    }
  }

  /**
   * 获取连接池状态
   */
  getPoolStats(): { active: number; maxSize: number; activeTenants: string[] } {
    return {
      active: this.pool.size,
      maxSize: this.config.poolMaxSize,
      activeTenants: this.pool.activeTenantIds(),
    };
  }

  // ─── 内部方法 ────────────────────────────────────────

  private systemDbPath(): string {
    return path.join(this.config.dataDir, '_system.db');
  }

  private tenantDbPath(tenantId: string): string {
    return path.join(this.config.tenantsDir, tenantId, 'data', `${tenantId}.db`);
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(this.config.dataDir)) {
      fs.mkdirSync(this.config.dataDir, { recursive: true });
    }
  }

  /**
   * 预置内置角色到租户数据库
   */
  private seedBuiltinRoles(db: SqliteDb): void {
    const insert = db.prepare(
      'INSERT OR IGNORE INTO roles (role_id, name, level, base_role_ids, is_builtin) VALUES (?, ?, ?, ?, 1)',
    );

    const builtinRoles = [
      { roleId: 'super_admin', name: '超级管理员', level: 'platform' },
      { roleId: 'tenant_admin', name: '租户管理员', level: 'tenant' },
      { roleId: 'app_admin', name: '应用管理员', level: 'app' },
      { roleId: 'department_default', name: '部门默认角色', level: 'business' },
    ];

    db.transaction(() => {
      for (const r of builtinRoles) {
        insert.run(r.roleId, r.name, r.level, JSON.stringify([]));
      }

      // 预置部门默认角色的权限
      db.prepare(
        `INSERT OR IGNORE INTO permissions (permission_id, role_id, resource_type, resource_id, actions)
         VALUES (?, ?, ?, ?, ?)`,
      ).run('dept_default_menu_read', 'department_default', 'menu', '*', JSON.stringify(['read']));

      db.prepare(
        `INSERT OR IGNORE INTO permissions (permission_id, role_id, resource_type, resource_id, actions)
         VALUES (?, ?, ?, ?, ?)`,
      ).run('dept_default_button_read', 'department_default', 'button', '*', JSON.stringify(['read']));
    });
  }
}
