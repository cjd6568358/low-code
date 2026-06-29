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

## 业务数据表外键设计

业务数据表（用户通过设计器创建的表）支持外键关系，通过 `TableColumn.foreignKey` 属性定义。

### 外键元数据

```typescript
interface ForeignKeyReference {
  targetTableId: string;    // 引用的目标表 ID
  targetFieldName: string;  // 引用的目标字段（通常是 'id'）
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';  // 删除策略，默认 RESTRICT
}
```

### 外键来源

| 来源 | 存储 | 说明 |
|------|------|------|
| 自动推断 | `sourceMapping` + `foreignKey` | 页面组件数据源绑定到某表时，自动推断外键关系 |
| 手动新增 | 仅 `foreignKey` | 在数据表编辑器中手动设置外键关系 |

### 建表时的外键约束

动态建表时，根据 `foreignKey` 生成 SQL `REFERENCES` 约束：

```sql
-- 示例：orders.customer_id 引用 customers.id
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  product TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 动态建表实现

**核心文件**：
- `packages/data/src/schema-builder.ts` — Schema 到 SQL 转换器
- `server/src/services/TableService.ts` — 数据表服务
- `server/src/routes/apps.ts` — 路由集成

**物理表名规则**：直接使用 `tableId`（8位hex，无冲突风险）

**表结构**：
- 系统主键列：`id INTEGER PRIMARY KEY AUTOINCREMENT`
- 软删除标记：`_deleted INTEGER DEFAULT 0`
- 时间戳：`_created_at TEXT`、`_updated_at TEXT`
- 用户列：根据 `TableSchema.columns` 生成

**同步时机**：保存数据表 Schema JSON 后，自动调用 `TableService.syncTableSchema()` 同步物理表

### 字段类型约束

每个字段可通过 `constraints` 属性配置类型相关的约束：

| 字段类型 | 约束属性 | 说明 |
|---------|---------|------|
| `string` | `maxLength`、`minLength`、`pattern`、`format` | format 支持 email/url/phone/idcard |
| `number` | `min`、`max`、`precision`、`integer` | precision=0 表示整数 |
| `date` | `format`、`min`、`max` | format 支持 date/datetime |
| `enum` | `values: Array<{label, value}>` | 枚举值列表 |

### 字段校验规则

每个字段可通过 `validations` 属性配置校验规则列表：

```typescript
interface ValidationRule {
  type: 'required' | 'pattern' | 'min' | 'max' | 'minLength' | 'maxLength' | 'custom';
  value?: string | number;  // 规则值
  message?: string;         // 自定义错误消息
}
```

### 索引管理

`TableSchema.indexes` 字段定义表索引，保存时自动生成 `CREATE INDEX` SQL：

```typescript
interface TableIndex {
  id: string;
  name: string;       // 索引名称
  columns: string[];  // 关联字段名列表
  unique: boolean;    // 是否唯一索引
}
```

**表结构变更**：采用「重建表」策略（SQLite 限制不支持 DROP COLUMN）：
1. 创建临时表（新结构）
2. 复制数据（匹配的列）
3. 删除旧表
4. 重命名临时表

### 删除策略说明

业务删除统一采用**软删除**（标记 deleted 而非物理删除），外键约束主要用于前端校验提示：

| 策略 | 行为 | 场景 |
|------|------|------|
| RESTRICT | 有引用时提示禁止删除 | 默认，最安全 |
| CASCADE | 级联删除引用记录 | 父记录删除时子记录也无意义（如评论） |
| SET NULL | 外键设为 null | 子记录保留但解除关联 |

## 数据查询 API

### 查询路由

```
POST /api/apps/:appId/query
```

接受 `ServerVariableQuery` 结构体，返回查询结果。

**请求体结构**：
```typescript
{
  table: string;          // 表 ID
  select?: string[];      // 选择字段（为空时 SELECT *）
  where?: Record<string, any>;  // MongoDB 风格过滤条件
  orderBy?: Record<string, 'asc' | 'desc'>;  // 排序
  limit?: number;         // 限制数量
  offset?: number;        // 偏移量
  aggregate?: { type: 'count' | 'sum' | 'avg' | 'min' | 'max'; field?: string };
  memoryFilter?: string;  // JS 内存过滤函数字符串（降级方案）
}
```

**where 支持的操作符**：
| 操作符 | SQL 等价 | 示例 |
|--------|---------|------|
| `{ field: value }` | `field = ?` | `{ status: 'active' }` |
| `$ne` | `!=` | `{ status: { $ne: 'deleted' } }` |
| `$gt` | `>` | `{ age: { $gt: 18 } }` |
| `$lt` | `<` | `{ age: { $lt: 60 } }` |
| `$gte` | `>=` | `{ score: { $gte: 60 } }` |
| `$lte` | `<=` | `{ score: { $lte: 100 } }` |
| `$like` | `LIKE` | `{ name: { $like: '%张%' } }` |
| `$in` | `IN` | `{ role: { $in: ['admin', 'user'] } }` |

### 核心函数

`queryRecordsAdvanced`（`packages/data/src/schema-builder.ts`）：
- 支持 SELECT 投影、WHERE 过滤、ORDER BY 排序、LIMIT/OFFSET 分页、聚合函数
- 列名白名单校验（防止 SQL 注入）
- 内存过滤降级（复杂 JS 函数 → SQL 查全表 + JS 过滤，上限 10000 条）

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
