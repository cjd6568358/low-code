/**
 * Database manager
 *
 * Manages _system.db and per-tenant tenant.db files.
 * Tenant data source: tenants/{tenantId}/tenant.json (file system).
 * Database files: tenants/{tenantId}/data/tenant.db
 */

import path from 'path';
import fs from 'fs';
import type { DatabaseConfig, SqliteDb } from './types';
import { DEFAULT_DATABASE_CONFIG } from './types';
import { KoffiDatabase } from './sqlite-koffi';
import { TenantDatabasePool } from './pool';
import { runMigrations } from './migration';
import { SYSTEM_MIGRATIONS } from './schema/system';
import { TENANT_MIGRATIONS } from './schema/tenant';

/** Tenant info from tenant.json */
export interface TenantInfo {
  tenantId: string;
  name: string;
  icon?: string;
  plan: string;
  status: string;
  createdAt: number;
}

function createSqliteDb(dbPath: string): SqliteDb {
  return new KoffiDatabase(dbPath);
}

/** Strip prefix from directory name (e.g., "tenant_90ef6d72" -> "90ef6d72") */
function stripPrefix(dirName: string): string {
  const idx = dirName.indexOf('_');
  return idx >= 0 ? dirName.substring(idx + 1) : dirName;
}

export class DatabaseManager {
  private config: DatabaseConfig;
  private pool: TenantDatabasePool;
  private systemDb: SqliteDb | null = null;

  constructor(config: Partial<DatabaseConfig> = {}) {
    this.config = { ...DEFAULT_DATABASE_CONFIG, ...config };
    this.pool = new TenantDatabasePool(this.config);
  }

  // ─── System database ─────────────────────────────────

  initSystemDb(): SqliteDb {
    if (this.systemDb) return this.systemDb;

    this.ensureDataDir();
    const dbPath = this.systemDbPath();
    const db = createSqliteDb(dbPath);

    db.pragma('busy_timeout', this.config.busyTimeout);
    if (this.config.walMode) {
      db.pragma('journal_mode', 'WAL');
    }
    db.pragma('foreign_keys', 'ON');

    runMigrations(db, SYSTEM_MIGRATIONS);

    this.systemDb = db;
    return this.systemDb;
  }

  getSystemDb(): SqliteDb {
    if (!this.systemDb) {
      throw new Error('System DB not initialized. Call initSystemDb() first.');
    }
    return this.systemDb;
  }

  // ─── Tenant database ─────────────────────────────────

  /**
   * Get tenant database (open if exists, run migrations)
   */
  getTenantDb(tenantId: string): SqliteDb {
    const dbPath = this.tenantDbPath(tenantId);
    const db = this.pool.get(tenantId, dbPath);
    runMigrations(db, TENANT_MIGRATIONS);
    return db;
  }

  /**
   * Scan tenants directory and return all tenant info
   * Reads tenant.json from each tenant directory.
   */
  scanTenants(): TenantInfo[] {
    const tenantsDir = this.config.tenantsDir;
    if (!fs.existsSync(tenantsDir)) return [];

    const entries = fs.readdirSync(tenantsDir, { withFileTypes: true });
    const tenants: TenantInfo[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('tenant_')) continue;

      const tenantJsonPath = path.join(tenantsDir, entry.name, 'tenant.json');
      try {
        const meta = JSON.parse(fs.readFileSync(tenantJsonPath, 'utf-8'));
        if (meta.status === 'active') {
          tenants.push(meta);
        }
      } catch {
        // Skip directories without valid tenant.json
        continue;
      }
    }

    return tenants;
  }

  /**
   * Get tenant info by ID
   */
  getTenantInfo(tenantId: string): TenantInfo | null {
    const tenantJsonPath = path.join(this.config.tenantsDir, `tenant_${tenantId}`, 'tenant.json');
    try {
      return JSON.parse(fs.readFileSync(tenantJsonPath, 'utf-8'));
    } catch {
      return null;
    }
  }

  /**
   * Create tenant directory structure and database
   */
  createTenant(uuid: string, name: string, plan: 'free' | 'pro' | 'enterprise' = 'free'): SqliteDb {
    const tenantId = `tenant_${uuid}`;
    const tenantDir = path.join(this.config.tenantsDir, tenantId);

    // Check if directory already exists
    if (fs.existsSync(tenantDir)) {
      throw new Error(`Tenant directory "${tenantId}" already exists.`);
    }

    // Create directory structure
    const dataDir = path.join(tenantDir, 'data');
    fs.mkdirSync(dataDir, { recursive: true });

    // Write tenant.json
    const now = Date.now();
    const tenantMeta: TenantInfo = {
      tenantId: uuid,
      name,
      plan,
      status: 'active',
      createdAt: now,
    };
    fs.writeFileSync(
      path.join(tenantDir, 'tenant.json'),
      JSON.stringify(tenantMeta, null, 2),
    );

    // Create database
    const dbPath = this.tenantDbPath(tenantId);
    const db = this.pool.get(tenantId, dbPath);
    runMigrations(db, TENANT_MIGRATIONS);

    // Seed builtin roles
    this.seedBuiltinRoles(db);

    return db;
  }

  /**
   * Delete tenant (remove directory)
   */
  deleteTenant(tenantId: string): void {
    const tenantDir = path.join(this.config.tenantsDir, tenantId);
    if (fs.existsSync(tenantDir)) {
      this.pool.close(tenantId);
      fs.rmSync(tenantDir, { recursive: true, force: true });
    }
  }

  /**
   * Close all database connections
   */
  closeAll(): void {
    this.pool.closeAll();
    if (this.systemDb) {
      this.systemDb.close();
      this.systemDb = null;
    }
  }

  /**
   * Get connection pool stats
   */
  getPoolStats(): { active: number; maxSize: number; activeTenants: string[] } {
    return {
      active: this.pool.size,
      maxSize: this.config.poolMaxSize,
      activeTenants: this.pool.activeTenantIds(),
    };
  }

  // ─── Internal ────────────────────────────────────────

  private systemDbPath(): string {
    return path.join(this.config.dataDir, '_system.db');
  }

  private tenantDbPath(tenantId: string): string {
    return path.join(this.config.tenantsDir, tenantId, 'data', 'tenant.db');
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(this.config.dataDir)) {
      fs.mkdirSync(this.config.dataDir, { recursive: true });
    }
  }

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
