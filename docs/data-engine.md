# 数据引擎 (Data Engine)

基于 koffi FFI 调用 SQLite 的数据库管理层，负责系统级和租户级数据的存储、查询、迁移。

## 架构总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           应用层 (Server)                                │
│                    通过 API 调用数据引擎操作数据库                          │
└───────┬─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        数据引擎 (packages/data)                          │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ DatabaseManager │  │ TenantDatabasePool│ │  schema-builder │         │
│  │ 系统/租户库管理  │  │   连接池管理     │  │ DDL/CRUD/软删除 │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│           │                    │                    │                   │
└───────────┼────────────────────┼────────────────────┼───────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    SQLite (koffi FFI → sqlite3.dll)                      │
│                                                                         │
│  ┌─────────────┐    ┌─────────────────────────────────────────────┐    │
│  │ _system.db  │    │  tenants/{tenantId}/data/tenant.db          │    │
│  │ 系统级数据   │    │  租户级数据（每租户独立文件）                   │    │
│  └─────────────┘    └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## 核心模块

### DatabaseManager

系统级和租户级数据库的统一管理入口。

```typescript
import { DatabaseManager } from '@low-code/data';

const dbManager = new DatabaseManager(config);

// 获取系统数据库
const systemDb = dbManager.getSystemDb();

// 获取租户数据库
const tenantDb = await dbManager.getTenantDb(tenantId);

// 创建新租户
await dbManager.createTenant(tenantId);

// 删除租户
await dbManager.deleteTenant(tenantId);
```

### TenantDatabasePool

租户数据库连接池，避免频繁开关数据库。

```typescript
import { TenantDatabasePool } from '@low-code/data';

const pool = new TenantDatabasePool({
  poolMaxSize: 50,    // 最大同时打开数
  walMode: true,      // WAL 模式
  busyTimeout: 5000,  // 忙等待超时
});

const db = await pool.get(tenantId);
```

### schema-builder

动态建表和 CRUD 操作。

```typescript
import {
  generateCreateTableSQL,
  executeTableSchema,
  insertRecord,
  queryRecords,
  updateRecord,
  softDeleteRecord,
} from '@low-code/data';

// 建表
const sql = generateCreateTableSQL(tableSchema);
await executeTableSchema(db, tableSchema);

// CRUD
await insertRecord(db, tableName, data);
const records = await queryRecords(db, tableName, filter);
await updateRecord(db, tableName, id, data);
await softDeleteRecord(db, tableName, id);
```

## 字段类型映射

业务数据支持 4 种基础类型，映射为 SQLite 存储类型：

| 业务类型 | SQLite 类型 | 说明 |
|---------|------------|------|
| `string` | TEXT | 文本字段（姓名、邮箱、地址等） |
| `number` | INTEGER | 数值字段（金额、数量、年龄等） |
| `boolean` | INTEGER | 布尔字段（0/1） |
| `date` | INTEGER | 日期字段（Unix 时间戳） |

> **注**：字段格式化（邮箱校验、手机号脱敏、金额千分位等）由渲染引擎的组件配置处理，不在此层实现。

## 数据库 Schema

### 系统数据库 (_system.db)

```sql
-- 租户注册表
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT CHECK(plan IN ('free', 'pro', 'enterprise')) DEFAULT 'free',
  status TEXT CHECK(status IN ('active', 'suspended', 'deleted')) DEFAULT 'active',
  db_version INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### 租户数据库 (tenant.db)

```sql
-- 数据表元信息
CREATE TABLE IF NOT EXISTS _tables (
  table_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  schema_json TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 动态业务表由 schema-builder 根据 TableSchema 动态生成
```

## CRUD 操作

### 插入记录

```typescript
import { insertRecord } from '@low-code/data';

const result = await insertRecord(db, 'orders', {
  customer_name: '张三',
  amount: 1500,
  is_paid: true,
  created_at: Date.now(),
});
// result: { id: 1, changes: 1 }
```

### 查询记录

```typescript
import { queryRecords } from '@low-code/data';

// 简单查询
const all = await queryRecords(db, 'orders');

// 条件查询
const paid = await queryRecords(db, 'orders', {
  is_paid: 1,
  amount: { $gt: 1000 },
});

// 高级查询
const result = await queryRecordsAdvanced(db, 'orders', {
  filter: { status: 'active' },
  sort: { field: 'created_at', direction: 'desc' },
  page: 1,
  pageSize: 20,
});
```

### 更新记录

```typescript
import { updateRecord } from '@low-code/data';

await updateRecord(db, 'orders', 1, {
  is_paid: true,
  paid_at: Date.now(),
});
```

### 软删除

```typescript
import { softDeleteRecord, restoreRecord, queryRecords } from '@low-code/data';

// 软删除（标记 _deleted = 1）
await softDeleteRecord(db, 'orders', 1);

// 恢复
await restoreRecord(db, 'orders', 1);

// 查询时默认过滤已删除记录
const active = await queryRecords(db, 'orders');

// 包含已删除记录
const all = await queryRecords(db, 'orders', {}, { includeDeleted: true });
```

## 外键约束

```typescript
const tableSchema: TableSchema = {
  tableId: 'table_order_items',
  name: '订单明细',
  columns: [
    { fieldName: 'id', fieldType: 'number', system: true },
    { fieldName: 'order_id', fieldType: 'string', required: true,
      foreignKey: {
        targetTableId: 'table_orders',
        targetFieldName: 'id',
        onDelete: 'CASCADE',
      }
    },
    { fieldName: 'product_name', fieldType: 'string', required: true },
    { fieldName: 'quantity', fieldType: 'number', required: true },
  ],
};
```

支持的外键删除策略：
- `RESTRICT`：禁止删除（默认）
- `CASCADE`：级联删除
- `SET NULL`：置空

## 数据库迁移

```typescript
import { runMigrations, getDbVersion, hasPendingMigrations } from '@low-code/data';

// 检查是否有待执行的迁移
if (hasPendingMigrations(db, migrations)) {
  await runMigrations(db, migrations);
}

// 获取当前版本
const version = getDbVersion(db);
```

## 配置项

```typescript
import type { DatabaseConfig } from '@low-code/data';

const config: DatabaseConfig = {
  dataDir: './data',           // 系统数据库目录
  tenantsDir: './tenants',     // 租户根目录
  poolMaxSize: 50,             // 连接池最大数
  walMode: true,               // WAL 模式
  busyTimeout: 5000,           // 忙等待超时(ms)
};
```

---

> 📄 详见 [应用管理文档](application.md) 了解数据表定义结构
> 📄 详见 [表单运行时架构](form-runtime-architecture.md) 了解字段格式化配置
