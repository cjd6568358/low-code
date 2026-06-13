# 应用管理 (Application Management)

## 设计理念

- **Schema 即应用**：一个应用的完整定义 = `tenants/{tenantId}/apps/{appId}/` 目录下的所有 JSON 文件
- **七种资源类型**：页面、卡片、表单、数据表、流程、自动化、运算，统一存储、统一管理
- **文件即配置**：可 Git 版本管理、可导入导出、可跨环境迁移
- **TS 类型驱动**：TypeScript 类型自动编译为 JSON Schema，各引擎自动映射消费

## 应用模型

```
┌──────────────────────────────────────────────────────────────────┐
│                         应用 (App)                                │
├───────────────┬───────────────┬──────────────────────────────────┤
│   页面 (Pages) │  数据表 (Tables)│  流程 (Workflows)                 │
│               │               │                                  │
│  ├─ 首页       │  ├─ 用户表      │  ├─ 审批流程                      │
│  ├─ 列表页     │  ├─ 订单表      │  ├─ 数据同步流程                   │
│  ├─ 详情页     │  └─ 产品表      │  └─ 通知流程                      │
│  └─ 表单页     │               │                                  │
└───────────────┴───────────────┴──────────────────────────────────┘
```

> **类型驱动**：各引擎通过 TypeScript 类型系统自动映射，`build-tools` 将 TS 类型编译为 JSON Schema 供渲染/流程/数据/运算/权限引擎消费，无需独立的实体定义层。

## 核心能力

| 能力 | 说明 |
|------|------|
| 创建应用 | 从空白创建、从已有应用复制、从应用市场导入三种方式，支持应用分组管理 |
| 应用发布 | 草稿应用可发布上线，发布后员工可见可使用；已发布应用可归档下线 |
| 统一设计器 | `/designer/app/:id` 进入应用资源概览，支持页面、卡片、表单、数据表、流程、自动化、运算七种资源类型的可视化编辑 |
| 数据表管理 | 可视化创建数据表，配置字段类型、校验规则、索引。数据表默认仅限当前应用使用，需显式开放权限后方可被指定应用引用 |
| 数据运维 | 支持数据导出（CSV/Excel/SQL）、数据迁移（跨环境/跨库）、数据备份与恢复 |
| 应用预览 | 实时预览应用效果，支持多端切换预览 |
| 版本管理 | 应用版本快照，支持版本回滚与对比，支持锁定组件库版本 |
| 应用导出 | 导出为静态 JSON Schema 文件，支持版本控制和跨环境迁移 |

## 组件库版本锁定

应用可锁定组件库版本，避免组件库升级导致已有页面不兼容。

```jsonc
// app.json 中的组件库版本锁定
{
  "componentLibraries": {
    "antd": {
      "version": "5.12.0",
      "locked": true,
      "lockedAt": "2024-01-15T08:00:00Z"
    }
  }
}
```

- **版本锁定**：锁定后组件库不会自动升级，确保页面稳定性
- **手动升级**：支持手动触发升级，升级前自动检测兼容性并生成差异报告
- **多版本共存**：不同应用可使用不同版本的组件库，互不影响

## 应用 Schema 存储

每个应用的所有资源以 JSON Schema 文件形式存储在 `tenants/` 目录下，按租户和应用隔离。

### 目录结构

```
tenants/
└── {tenantId}/                    # 8 位随机 hex ID
    ├── tenant.json                # 租户元数据（名称、套餐、状态）
    ├── apps/                      # 应用 Schema
    │   └── {appId}/               # 8 位随机 hex ID
    │       ├── app.json           # 应用元信息
    │       ├── pages/             # 页面 Schema
    │       │   ├── home.json
    │       │   ├── approval-list.json
    │       │   └── my-todos.json
    │       ├── cards/             # 卡片 Schema
    │       ├── forms/             # 表单 Schema
    │       ├── tables/            # 数据表 Schema
    │       │   ├── approval-records.json
    │       │   └── user-info.json
    │       ├── workflows/         # 流程 Schema
    │       │   └── procurement-approval.json
    │       ├── automations/       # 自动化 Schema
    │       └── computations/      # 运算 Schema
    └── data/                      # 租户 SQLite 数据库
        └── tenant_{tenantId}.db
```

### 设计原则

- **文件即配置**：每个资源一个 JSON 文件，可纳入 Git 版本管理
- **租户隔离**：`tenants/{tenantId}/` 物理隔离，与 SQLite 数据库一一对应
- **七种资源**：pages、cards、forms、tables、workflows、automations、computations
- **统一格式**：所有资源 Schema 遵循各自的 JSON Schema 规范
- **时间戳**：所有时间字段统一使用 Unix 毫秒时间戳（`number` 类型）
- **标准字段**：所有资源 JSON 必须包含 `schemaVersion`（结构版本）、`version`（乐观锁版本）、`_references`（跨资源引用）

### 资源 JSON 标准字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `schemaVersion` | `number` | 文件结构版本号，引擎升级时递增，用于自动迁移旧格式 |
| `version` | `number` | 业务版本号，每次保存递增，用于乐观锁冲突检测 |
| `_references` | `array` | 跨资源引用声明，编译器自动生成，用于影响分析 |

### 应用 Schema 结构

```jsonc
// app.json - 应用元信息
{
  "schemaVersion": "1.0.0",
  "appId": "app_abc123",
  "name": "客户管理系统",
  "version": "1.2.0",
  "description": "CRM 客户关系管理应用",
  "createdAt": "2024-01-15T08:00:00Z",
  "pages": ["home", "list", "form"],
  "tables": ["users", "orders"],
  "workflows": ["approval", "sync"],
  "theme": {
    "primaryColor": "#1677ff",
    "borderRadius": 6
  }
}
```

### 页面 Schema 结构

```jsonc
// pages/home.json - 页面定义
{
  "pageId": "page_home",
  "title": "首页",
  "route": "/home",
  "layout": {
    "type": "grid",
    "columns": 24
  },
  "components": [
    {
      "id": "comp_001",
      "type": "statistic-card",
      "props": {
        "title": "客户总数",
        "dataSource": {
          "table": "users",
          "aggregation": "count"
        }
      },
      "layout": { "col": 8, "row": 1 }
    },
    {
      "id": "comp_002",
      "type": "chart",
      "props": {
        "chartType": "line",
        "xField": "date",
        "yField": "count"
      },
      "layout": { "col": 16, "row": 1 }
    }
  ],
  "rules": [
    {
      "targetId": "comp_002",
      "condition": "user.role === 'admin'",
      "action": "visible"
    }
  ]
}
```

### 数据表 Schema 结构

```jsonc
// tables/users.json - 数据表定义
{
  "tableId": "table_users",
  "name": "用户表",
  "fields": [
    {
      "fieldId": "field_001",
      "name": "username",
      "type": "string",
      "format": "text",
      "required": true,
      "unique": true
    },
    {
      "fieldId": "field_002",
      "name": "email",
      "type": "varchar",
      "format": "email",
      "validation": {
        "pattern": "^[\\w.-]+@[\\w.-]+\\.\\w+$"
      }
    },
    {
      "fieldId": "field_003",
      "name": "address",
      "type": "json",
      "format": "address",
      "structure": {
        "province": "string",
        "city": "string",
        "district": "string",
        "detail": "string"
      }
    }
  ],
  "indexes": [
    { "fields": ["email"], "unique": true }
  ]
}
```

## Schema 使用场景

| 场景 | 说明 |
|------|------|
| 版本控制 | `tenants/` 目录纳入 Git 管理，追踪应用变更历史 |
| 应用迁移 | 跨环境（开发→测试→生产）迁移 Schema 文件 |
| 应用市场 | 导出为应用模板，供其他租户导入使用 |
| 备份恢复 | 应用全量备份，支持灾难恢复 |
| 二次开发 | 基于 Schema 文件进行定制化开发 |
