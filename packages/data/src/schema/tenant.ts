/**
 * tenant_xxx.db Schema — 租户级表
 *
 * 每个租户独立一个 SQLite 文件，包含组织架构、权限、业务数据。
 *
 * 存储分离策略：
 * - 文件系统 JSON：应用 Schema、页面、流程定义/实例/任务、自动化规则/日志、字典
 * - SQLite：组织架构、权限、密钥、消息、审计日志、业务数据（动态建表）
 */

import type { MigrationEntry, SqliteDb } from '../types';

/** 租户数据库当前 schema 版本 */
export const TENANT_DB_VERSION = 1;

/** 租户数据库初始建表 SQL */
export const TENANT_SCHEMA_SQL = `
-- ============================================================
-- 组织架构
-- ============================================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  user_id       TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  avatar        TEXT,
  email         TEXT,
  phone         TEXT,
  password      TEXT,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'disabled', 'locked', 'pending')),
  source        TEXT NOT NULL DEFAULT 'native'
                  CHECK (source IN ('native', 'synced', 'invited')),
  external_id   TEXT,
  last_login_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_external ON users(external_id);

-- 部门表（树形结构）
CREATE TABLE IF NOT EXISTS departments (
  dept_id     TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  parent_id   TEXT REFERENCES departments(dept_id),
  code        TEXT,
  manager_id  TEXT REFERENCES users(user_id),
  sort        INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  source      TEXT NOT NULL DEFAULT 'native' CHECK (source IN ('native', 'synced')),
  external_id TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_depts_parent ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_depts_status ON departments(status);

-- 岗位表
CREATE TABLE IF NOT EXISTS positions (
  position_id TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  code        TEXT,
  category    TEXT CHECK (category IN ('management', 'technical', 'business', 'support')),
  level       INTEGER,
  dept_id     TEXT REFERENCES departments(dept_id),
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  source      TEXT NOT NULL DEFAULT 'native' CHECK (source IN ('native', 'synced')),
  external_id TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_positions_dept ON positions(dept_id);

-- 用户-部门/岗位关联表
CREATE TABLE IF NOT EXISTS user_departments (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(user_id),
  dept_id     TEXT NOT NULL REFERENCES departments(dept_id),
  position_id TEXT REFERENCES positions(position_id),
  is_primary  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_depts_user ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_depts_dept ON user_departments(dept_id);

-- ============================================================
-- 权限系统
-- ============================================================

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
  role_id     TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  level       TEXT NOT NULL CHECK (level IN ('platform', 'tenant', 'app', 'business')),
  base_role_ids TEXT,
  is_builtin  INTEGER NOT NULL DEFAULT 0,
  app_id      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level);

-- 权限表
CREATE TABLE IF NOT EXISTS permissions (
  permission_id   TEXT PRIMARY KEY,
  role_id         TEXT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  resource_type   TEXT NOT NULL CHECK (resource_type IN ('menu', 'button', 'data', 'field', 'api')),
  resource_id     TEXT NOT NULL,
  actions         TEXT NOT NULL,
  scope           TEXT,
  conditions      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_perms_role ON permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_perms_resource ON permissions(resource_type, resource_id);

-- 用户-角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(user_id),
  role_id     TEXT NOT NULL REFERENCES roles(role_id),
  source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'department', 'position')),
  source_id   TEXT,
  app_id      TEXT,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  assigned_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- ============================================================
-- OpenKey（API 访问密钥）
-- ============================================================

CREATE TABLE IF NOT EXISTS open_keys (
  key_id          TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  key_hash        TEXT NOT NULL,
  key_prefix      TEXT NOT NULL,
  allowed_apps    TEXT,
  allowed_ips     TEXT,
  rate_per_minute INTEGER NOT NULL DEFAULT 60,
  rate_per_day    INTEGER NOT NULL DEFAULT 10000,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'disabled', 'expired')),
  expires_at      TEXT,
  last_used_at    TEXT,
  created_by      TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_open_keys_status ON open_keys(status);

-- OpenKey 权限表
CREATE TABLE IF NOT EXISTS open_key_permissions (
  id            TEXT PRIMARY KEY,
  open_key_id   TEXT NOT NULL REFERENCES open_keys(key_id) ON DELETE CASCADE,
  resource      TEXT NOT NULL,
  resource_id   TEXT,
  actions       TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_openkey_perms ON open_key_permissions(open_key_id);

-- ============================================================
-- 消息中心
-- ============================================================

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_id  TEXT NOT NULL,
  sender_id     TEXT,
  template_id   TEXT,
  category      TEXT NOT NULL,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  content_type  TEXT NOT NULL DEFAULT 'text',
  action_url    TEXT,
  is_read       INTEGER NOT NULL DEFAULT 0,
  read_at       TEXT,
  channel       TEXT NOT NULL,
  status        TEXT NOT NULL
                  CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  related_type  TEXT,
  related_id    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_msgs_recipient ON messages(recipient_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_msgs_category ON messages(recipient_id, category);
CREATE INDEX IF NOT EXISTS idx_msgs_related ON messages(related_type, related_id);

-- ============================================================
-- 审计日志
-- ============================================================

-- 审计日志表（按月分表由应用层处理）
CREATE TABLE IF NOT EXISTS audit_logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id        TEXT,
  actor_id      TEXT NOT NULL,
  actor_name    TEXT NOT NULL,
  actor_ip      TEXT,
  actor_ua      TEXT,
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   TEXT,
  resource_name TEXT,
  detail        TEXT,
  result        TEXT NOT NULL DEFAULT 'success' CHECK (result IN ('success', 'failure')),
  error_msg     TEXT,
  request_id    TEXT,
  duration_ms   INTEGER,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_app ON audit_logs(app_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
`;

/** 租户数据库迁移列表 */
export const TENANT_MIGRATIONS: MigrationEntry[] = [
  {
    version: 1,
    description: '初始建表',
    up: (db: SqliteDb) => {
      db.exec(TENANT_SCHEMA_SQL);
    },
  },
];
