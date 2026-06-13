/**
 * _system.db Schema — 系统级表
 *
 * 存储平台管理员、租户注册、全局字典、套餐配置。
 * 所有租户共享此数据库。
 */

import type { MigrationEntry, SqliteDb } from '../types';

/** 系统数据库当前 schema 版本 */
export const SYSTEM_DB_VERSION = 1;

/** 系统数据库初始建表 SQL */
export const SYSTEM_SCHEMA_SQL = `
-- 租户注册表
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id   TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  db_version  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- 平台管理员表
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

/** 系统数据库迁移列表 */
export const SYSTEM_MIGRATIONS: MigrationEntry[] = [
  {
    version: 1,
    description: '初始建表',
    up: (db: SqliteDb) => {
      db.exec(SYSTEM_SCHEMA_SQL);
    },
  },
];
