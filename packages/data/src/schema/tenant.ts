/**
 * tenant_xxx.db Schema — 租户级表
 *
 * 每个租户独立一个 SQLite 文件，包含组织架构、权限、应用、业务数据。
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
-- 应用管理
-- ============================================================

-- 应用表
CREATE TABLE IF NOT EXISTS applications (
  app_id            TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT,
  icon              TEXT,
  category          TEXT,
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'published', 'archived')),
  version           TEXT NOT NULL DEFAULT '1.0.0',
  component_library TEXT NOT NULL DEFAULT 'antd',
  visibility        TEXT NOT NULL DEFAULT 'private'
                      CHECK (visibility IN ('private', 'internal', 'public')),
  allowed_roles     TEXT,
  open_api_enabled  INTEGER NOT NULL DEFAULT 0,
  open_key_id       TEXT,
  created_by        TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status);

-- 应用管理员表
CREATE TABLE IF NOT EXISTS app_admins (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(user_id),
  app_id      TEXT NOT NULL REFERENCES applications(app_id),
  role        TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
  permissions TEXT,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  assigned_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_app_admins_app ON app_admins(app_id);
CREATE INDEX IF NOT EXISTS idx_app_admins_user ON app_admins(user_id);

-- 应用页面表（存储页面 Schema JSON）
CREATE TABLE IF NOT EXISTS app_pages (
  page_id     TEXT PRIMARY KEY,
  app_id      TEXT NOT NULL REFERENCES applications(app_id),
  title       TEXT NOT NULL,
  route       TEXT NOT NULL,
  schema      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'published', 'archived')),
  version     INTEGER NOT NULL DEFAULT 1,
  created_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pages_app ON app_pages(app_id);

-- ============================================================
-- 字典
-- ============================================================

-- 租户字典表
CREATE TABLE IF NOT EXISTS dictionaries (
  dict_id     TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  scope       TEXT NOT NULL DEFAULT 'tenant' CHECK (scope IN ('tenant', 'app')),
  app_id      TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dicts_code ON dictionaries(code);

-- 字典项表
CREATE TABLE IF NOT EXISTS dict_items (
  item_id     TEXT PRIMARY KEY,
  dict_id     TEXT NOT NULL REFERENCES dictionaries(dict_id),
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

CREATE INDEX IF NOT EXISTS idx_dict_items_dict ON dict_items(dict_id);
CREATE INDEX IF NOT EXISTS idx_dict_items_parent ON dict_items(parent_id);

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
-- 流程引擎
-- ============================================================

-- 流程定义表
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_key  TEXT NOT NULL,
  version       INTEGER NOT NULL,
  name          TEXT,
  schema        TEXT NOT NULL,
  status        TEXT CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  app_id        TEXT,
  created_by    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(workflow_key, version)
);

CREATE INDEX IF NOT EXISTS idx_wf_defs_key ON workflow_definitions(workflow_key);

-- 流程实例表
CREATE TABLE IF NOT EXISTS workflow_instances (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_def_id     INTEGER NOT NULL REFERENCES workflow_definitions(id),
  workflow_key        TEXT NOT NULL,
  version             INTEGER NOT NULL,
  source_table        TEXT,
  source_id           TEXT,
  current_snapshot_id INTEGER,
  status              TEXT CHECK (status IN ('running', 'pending', 'completed', 'rejected', 'cancelled', 'failed')),
  started_by          TEXT,
  started_at          TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at        TEXT
);

CREATE INDEX IF NOT EXISTS idx_wf_inst_source ON workflow_instances(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_wf_inst_status ON workflow_instances(status);

-- 流程快照表
CREATE TABLE IF NOT EXISTS workflow_snapshots (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  instance_id     INTEGER NOT NULL REFERENCES workflow_instances(id),
  node_id         TEXT,
  node_name       TEXT,
  source_id       TEXT NOT NULL,
  source_table    TEXT NOT NULL,
  data            TEXT NOT NULL,
  changed_fields  TEXT,
  snapshot_type   TEXT NOT NULL,
  operator_id     TEXT,
  operator_name   TEXT,
  comment         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wf_snap_instance ON workflow_snapshots(instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_snap_source ON workflow_snapshots(source_table, source_id);

-- ============================================================
-- 自动化引擎
-- ============================================================

-- 自动化规则表
CREATE TABLE IF NOT EXISTS automation_rules (
  id                TEXT PRIMARY KEY,
  app_id            TEXT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('enabled', 'disabled', 'draft')),
  trigger_config    TEXT NOT NULL,
  condition_config  TEXT,
  actions_config    TEXT NOT NULL,
  throttle_config   TEXT,
  effective_time    TEXT,
  created_by        TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by        TEXT NOT NULL,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_auto_rules_app ON automation_rules(app_id);
CREATE INDEX IF NOT EXISTS idx_auto_rules_status ON automation_rules(status);

-- 自动化执行日志表
CREATE TABLE IF NOT EXISTS automation_execution_logs (
  id                  TEXT PRIMARY KEY,
  rule_id             TEXT NOT NULL,
  rule_name           TEXT NOT NULL,
  event_type          TEXT NOT NULL,
  event_source        TEXT NOT NULL,
  event_data          TEXT NOT NULL,
  condition_result    TEXT NOT NULL,
  action_results      TEXT NOT NULL,
  status              TEXT NOT NULL
                        CHECK (status IN ('success', 'partial_success', 'failed')),
  total_duration_ms   INTEGER NOT NULL,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_auto_logs_rule ON automation_execution_logs(rule_id, created_at);
CREATE INDEX IF NOT EXISTS idx_auto_logs_status ON automation_execution_logs(status, created_at);

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
