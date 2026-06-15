/**
 * _system.db Schema — System-level tables
 *
 * Stores platform admins, global dictionaries, subscription plans.
 * Tenant data is in tenants/{id}/tenant.json (file system as data source).
 */

import type { MigrationEntry, SqliteDb } from '../types';

/** System database schema version */
export const SYSTEM_DB_VERSION = 2;

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

-- 全局字典表（平台级只读字典）
CREATE TABLE IF NOT EXISTS global_dictionaries (
  dict_id     TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_global_dicts_code ON global_dictionaries(code);

-- 全局字典项表
CREATE TABLE IF NOT EXISTS global_dict_items (
  item_id     TEXT PRIMARY KEY,
  dict_id     TEXT NOT NULL REFERENCES global_dictionaries(dict_id),
  label       TEXT NOT NULL,
  value       TEXT NOT NULL,
  color       TEXT,
  icon        TEXT,
  parent_id   TEXT,
  sort        INTEGER NOT NULL DEFAULT 0,
  disabled    INTEGER NOT NULL DEFAULT 0,
  extra       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_global_dict_items_dict ON global_dict_items(dict_id);
CREATE INDEX IF NOT EXISTS idx_global_dict_items_parent ON global_dict_items(parent_id);

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
];
