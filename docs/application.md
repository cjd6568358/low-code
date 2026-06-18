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
└── tenant_{uuid}/                 # 目录名带前缀，uuid 为 8 位 hex
    ├── tenant.json                # 租户元数据（含 uuid 字段）
    ├── apps/                      # 应用 Schema
    │   └── app_{uuid}/            # 目录名带前缀
    │       ├── app.json           # 应用元信息（含 uuid 字段）
    │       ├── pages/             # 页面 Schema
    │       │   ├── page_{uuid}.json
    │       │   └── page_{uuid}.json
    │       ├── cards/             # 卡片 Schema
    │       ├── forms/             # 表单 Schema
    │       ├── tables/            # 数据表 Schema
    │       │   ├── table_{uuid}.json
    │       │   └── table_{uuid}.json
    │       ├── workflows/         # 流程 Schema
    │       │   └── workflow_{uuid}.json
    │       ├── automations/       # 自动化 Schema
    │       ├── computations/      # 运算 Schema
    │       └── dist/              # 发布产物
    │           └── app.bundle.json
    ├── uploads/                   # 上传文件（图片、文档等，跨应用共享）
    └── data/
        └── tenant.db              # SQLite 数据库（上级目录已含租户 ID）
```

> **ID 约定**：
> - **JSON 内部**：裸 8 位 hex（如 `appId: "80e88653"`、`pageId: "abc12345"`）
> - **文件系统**：带前缀（如 `app_80e88653/`、`page_abc12345.json`）
> - **API 接口**：裸 ID（如 `GET /api/apps/80e88653`）
> - 代码通过动态拼接 `{type}_{id}` 访问文件系统，服务端兼容裸 ID 和带前缀 ID

### 设计原则

- **文件即数据源**：`tenants/{tenantId}/apps/` 是应用数据的唯一数据源，API 直接读写 JSON 文件，不依赖数据库存储应用元信息
- **租户隔离**：`tenants/{tenantId}/` 物理隔离，每租户独立目录 + 独立 SQLite
- **七种资源**：pages、cards、forms、tables、workflows、automations、computations，每种资源一个 JSON 文件
- **统一格式**：所有资源 Schema 遵循各自的 JSON Schema 规范
- **时间戳**：所有时间字段统一使用 Unix 毫秒时间戳（`number` 类型）
- **标准字段**：所有资源 JSON 必须包含 `schemaVersion`（结构版本）、`version`（乐观锁版本）
- **资源暴露**：应用通过 `expose` 字段声明哪些资源可被跨应用引用，未暴露的资源对外不可见
- **ID 约定**：JSON 内存裸 8 位 hex ID（如 `appId: "80e88653"`），`{type}_` 前缀仅用于目录/文件名（如 `app_80e88653/`、`page_abc12345.json`），代码动态拼接
- **目录即操作**：创建应用 = 创建目录，删除应用 = 删除目录，查询应用 = 扫描目录

### 资源 JSON 标准字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `schemaVersion` | `number` | 文件结构版本号，引擎升级时递增，用于自动迁移旧格式 |
| `version` | `number` | 业务版本号，每次保存递增，用于乐观锁冲突检测 |
| `references` | `object` | **仅资源级**（page.json/table.json 等），应用级（app.json）无此字段。资源引用声明，按资源类型分组，由编译器自动生成 |

> **`references` 仅存在于资源级**：
> - 应用是资源的聚合容器，不依赖其他资源，因此 app.json 无 `references`
> - 资源级（page.json/table.json 等）：声明本资源依赖的其他资源，格式 `{ "tables": ["resourceId"] }`
> - 应用间依赖通过资源级 `references` + 应用级 `expose` 配合实现

### 应用 Schema 结构

```jsonc
// app.json - 应用元信息
{
  "schemaVersion": 1,
  "version": 1,
  "appId": "80e88653",
  "name": "山水 OA",
  "description": "办公自动化系统",
  "icon": "📋",
  "appVersion": "0.1.0",
  "status": "draft",
  "componentLibrary": "antd",
  "visibility": "internal",
  "createdBy": "97732285",
  "createdAt": 1781364313289,
  "updatedAt": 1781364313289,
  "expose": {
    "pages": ["abc12345"],
    "tables": ["xyz78901", "def45678"]
  }
}
```

#### 跨应用资源暴露 (`expose`)

`expose` 字段控制哪些资源可被其他应用跨应用引用，按资源类型分组：

| 资源类型 | 说明 |
|---------|------|
| `pages` | 页面 |
| `cards` | 卡片 |
| `forms` | 表单 |
| `tables` | 数据表 |
| `workflows` | 流程 |
| `automations` | 自动化 |
| `computations` | 运算 |

- **默认为空**：新建应用的 `expose` 为 `{}`，不暴露任何资源
- **多选配置**：每种资源类型下可列出多个资源 ID
- **引用校验**：其他应用的资源级 `references` 只能引用目标应用 `expose` 中已声明的资源
- **运行时隔离**：未暴露的资源对跨应用消费者完全不可见

### 页面 Schema 结构

```jsonc
// pages/home.json - 页面定义
{
  "pageId": "page_home",
  "name": "首页",
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

## 应用发布与 Bundle

### 设计理念

- **开发环境**：逐文件加载，方便调试和热更新
- **运行时**：优先加载 bundle（单文件），减少 I/O 次数
- **Treeshake**：只打包被引用的资源，未被引用的资源自动排除
- **变更检测**：资源修改后自动检测哪些已发布应用受影响，提示重新发布

### 发布流程

```
一键发布
  ├─ 1. 扫描应用内所有资源
  ├─ 2. 从页面入口 treeshake，递归收集资源级 references
  ├─ 3. 合并为 dist/app.bundle.json
  └─ 4. 更新 app.json 状态为 published
```

### Bundle 结构

```jsonc
// dist/app.bundle.json
{
  "appId": "80e88653",
  "publishedAt": 1781517309849,
  "resourceCount": 12,
  "resources": {
    "pages": {
      "abc12345": { /* page schema */ },
      "def67890": { /* page schema */ }
    },
    "tables": {
      "xyz12345": { /* table schema */ }
    },
    "forms": {
      "ghi12345": { /* form schema */ }
    }
    // 未被引用的资源不包含
  }
}
```

### 运行时加载策略

```
GET /api/apps/:appId
  ├─ 尝试加载 dist/app.bundle.json
  │   └─ 成功 → 返回 bundle 内容（fromBundle: true）
  └─ bundle 不存在
      └─ fallback → 逐文件扫描（fromBundle: false）
```

### 目录结构

```
app_80e88653/
├── app.json                 # 应用元信息（含 status、publishedAt、bundleSize）
├── pages/                   # 源文件（保留，设计器用）
├── tables/
├── forms/
├── ...
└── dist/                    # 发布产物
    └── app.bundle.json      # 合并后的 bundle
```

### 变更检测

当资源被修改时，系统遍历所有已发布应用的资源级 `references`，检查哪些应用引用了该资源：

```
GET /api/apps/:appId/check-updates?resourceType=tables&resourceId=xyz12345
  → 返回受影响的已发布应用列表
  → 前端显示"有更新"标签，提示用户重新发布
```

### API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/apps/:appId/publish` | POST | 发布应用（treeshake + 合并 bundle） |
| `/api/apps/:appId/check-updates` | GET | 检查受影响的应用 |
