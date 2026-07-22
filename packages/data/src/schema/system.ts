/**
 * _system.db Schema — System-level tables
 *
 * Stores platform admins and subscription plans.
 * Global dictionaries are stored as JSON files in data/dictionaries/.
 * Tenant data is in tenants/{id}/tenant.json (file system as data source).
 */

import type { MigrationEntry, SqliteDb } from '../types';

/** System database schema version */
export const SYSTEM_DB_VERSION = 3;

/** System database initial schema SQL */
export const SYSTEM_SCHEMA_SQL = `
-- Platform admins (not tied to any tenant)
CREATE TABLE IF NOT EXISTS platform_admins (
  admin_id    TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE,
  password    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 套餐表
CREATE TABLE IF NOT EXISTS plans (
  plan_id       TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  max_users     INTEGER,
  max_apps      INTEGER,
  max_storage_mb INTEGER,
  price_monthly REAL,
  price_yearly  REAL,
  features      TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/** System database migrations */
export const SYSTEM_MIGRATIONS: MigrationEntry[] = [
  {
    version: 1,
    description: 'Initial schema',
    up: (db: SqliteDb) => {
      db.exec(SYSTEM_SCHEMA_SQL);
    },
  },
  {
    version: 2,
    description: 'Drop tenants table (data source moved to file system)',
    up: (db: SqliteDb) => {
      db.exec('DROP TABLE IF EXISTS tenants');
      db.exec('DROP INDEX IF EXISTS idx_tenants_status');
    },
  },
  {
    version: 3,
    description: 'Drop global dictionaries (moved to JSON files)',
    up: (db: SqliteDb) => {
      db.exec('DROP TABLE IF EXISTS global_dict_items');
      db.exec('DROP TABLE IF EXISTS global_dictionaries');
      db.exec('DROP INDEX IF EXISTS idx_global_dicts_code');
      db.exec('DROP INDEX IF EXISTS idx_global_dict_items_dict');
      db.exec('DROP INDEX IF EXISTS idx_global_dict_items_parent');
    },
  },
];
