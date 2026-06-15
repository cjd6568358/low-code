# 数据层架构 — 租户级 SQLite

## 设计目标

- **零外部依赖**：无需安装 MySQL/PostgreSQL，单文件数据库即可运行
- **租户级隔离**：每个租户一个独立 `.db` 文件，天然数据隔离
- **轻量部署**：单机即可运行，无需外部数据库服务
- **写并发隔离**：跨租户写入完全无锁竞争

## 架构总览

```
data/
  └── _system.db                    ← 系统级数据库
        ├── platform_admins         ← 平台管理员
        ├── global_dictionaries     ← 全局只读字典
        └── plans                   ← 套餐定价

tenants/
  └── tenant_{uuid}/                ← 租户目录（文件系统即数据源）
        ├── tenant.json             ← 租户元数据（名称、套餐、状态）
        ├── apps/                   ← 应用 Schema
        │   └── app_{uuid}/
        │       ├── app.json
        │       ├── pages/
        │       ├── tables/
        │       └── ...
        └── data/
              └── tenant.db         ← 租户 SQLite 数据库
                    ├── users / departments / positions   ← 组织架构
                    ├── roles / permissions / user_roles  ← 权限系统
                    ├── dictionaries / dict_items         ← 租户字典
                    ├── open_keys / open_key_permissions  ← API 密钥
                    ├── workflow_definitions / instances / snapshots ← 流程引擎
                    ├── automation_rules / execution_logs ← 自动化引擎
                    ├── messages                          ← 消息中心
                    └── audit_logs                        ← 审计日志
```

## 技术选型

| 组件 | 选择 | 理由 |
|------|------|------|
| 数据库 | SQLite 3 | 零配置、单文件、嵌入式 |
| 驱动 | koffi FFI | 直接调用 sqlite3.dll，无需编译原生模块 |
| 日志模式 | WAL | 允许并发读写，写入性能提升 2-10 倍 |
| 连接池 | LRU 池 | 控制同时打开的文件句柄数量 |
| 迁移 | user_version pragma | SQLite 原生版本跟踪 |
| 租户元数据 | tenant.json | 文件系统即数据源，不依赖数据库 |

## 连接池策略

```
TenantDatabasePool（LRU）
  ├── 最大同时打开: 50（可配置）
  ├── 获取连接: 已有则复用，否则打开新连接
  ├── 池满淘汰: 关闭最久未使用的连接
  └── WAL 模式: 所有连接自动开启 WAL
```

```typescript
const pool = new TenantDatabasePool(config);
const db = pool.get('tenant_001', 'data/tenant_001.db');
// 使用 db ...
pool.close('tenant_001');
```

## Schema 迁移

每个数据库独立维护版本号（SQLite `user_version` pragma）。

```
_system.db:  user_version = 1  (当前版本)
tenant_001.db: user_version = 1  (当前版本)
tenant_002.db: user_version = 0  (待迁移)
```

迁移在事务中执行，失败自动回滚：

```typescript
import { runMigrations } from '@low-code/data';
import { TENANT_MIGRATIONS } from '@low-code/data';

const executed = runMigrations(db, TENANT_MIGRATIONS);
// executed = 0 表示已是最新
```

支持逐租户灰度迁移：先迁移测试租户，验证后再批量迁移。

## MySQL → SQLite 差异处理

| MySQL 语法 | SQLite 替代 | 说明 |
|-----------|------------|------|
| `BIGINT UNSIGNED AUTO_INCREMENT` | `INTEGER PRIMARY KEY AUTOINCREMENT` | |
| `VARCHAR(n)` | `TEXT` | SQLite 不限制长度 |
| `JSON` | `TEXT` | 应用层 JSON.parse/stringify |
| `ENUM('a','b')` | `TEXT CHECK(x IN ('a','b'))` | |
| `DATETIME(3)` | `TEXT` | ISO8601 格式存储 |
| `TINYINT(1)` | `INTEGER` | 0/1 表示布尔 |
| `ENGINE=InnoDB` | 去掉 | |
| `PARTITION BY RANGE` | 去掉 | 按月分表由应用层处理 |
| `JSON_EXTRACT()` | `json_extract()` | 函数名小写 |
| `NOW()` | `datetime('now')` | |

## 性能估算

| 指标 | 值 |
|------|-----|
| 单次写事务 | 1-5ms |
| 单次读查询 | 0.1-1ms |
| WAL 写入吞吐 | ~50,000 次/秒 |
| 100 租户并发写 | ~50 次/秒（远低于上限） |
| 数据文件大小 | 每租户 10-100MB（取决于业务数据量） |

## 备份与恢复

```typescript
// 备份单个租户
await dbManager.backupTenant('tenant_001', '/backup/tenant_001_20240115.db');

// 恢复：将备份文件复制回数据目录即可
fs.copyFileSync('/backup/tenant_001_20240115.db', 'data/tenant_001.db');
```

## 未来扩展路径

| 阶段 | 存储方案 | 适用场景 |
|------|---------|---------|
| 0→1 | SQLite per-tenant | 单机部署、开发测试、中小规模 SaaS |
| 1→10 | SQLite + 按需迁移 | 灰度迁移活跃租户到独立 MySQL |
| 10→100 | MySQL/PostgreSQL | 全量迁移，水平扩展 |

由于使用 ORM 抽象层，从 SQLite 迁移到其他数据库只需更换 driver 和 schema DDL。

## 使用示例

```typescript
import { DatabaseManager } from '@low-code/data';

// 初始化
const dbManager = new DatabaseManager({ dataDir: './data' });
dbManager.initSystemDb();

// 创建租户
dbManager.createTenant('acme', 'ACME 公司', 'pro');

// 获取租户数据库
const db = dbManager.getTenantDb('acme');

// 直接执行 SQL
const users = db.prepare('SELECT * FROM users WHERE status = ?').all('active');

// 事务
const insertUser = db.prepare('INSERT INTO users (user_id, name) VALUES (?, ?)');
db.transaction(() => {
  insertUser.run('u_001', '张三');
  insertUser.run('u_002', '李四');
})();

// 关闭
dbManager.closeAll();
```
