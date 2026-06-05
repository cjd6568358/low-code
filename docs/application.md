# 应用管理 (Application Management)

## 应用模型

```
┌──────────────────────────────────────────────────────────────────┐
│                         应用 (App)                                │
├──────────────────────────────────────────────────────────────────┤
│                     实体定义 (Entities)                            │
│  统一定义字段、关系、校验规则，供各引擎复用                              │
├───────────────┬───────────────┬──────────────────────────────────┤
│   页面 (Pages) │  数据表 (Tables)│  流程 (Workflows)                 │
│               │               │                                  │
│  ├─ 首页       │  ├─ 用户表      │  ├─ 审批流程                      │
│  ├─ 列表页     │  ├─ 订单表      │  ├─ 数据同步流程                   │
│  ├─ 详情页     │  └─ 产品表      │  └─ 通知流程                      │
│  └─ 表单页     │               │                                  │
└───────────────┴───────────────┴──────────────────────────────────┘
```

## 核心能力

| 能力 | 说明 |
|------|------|
| 创建应用 | 支持空白应用和模板创建，支持应用分组管理 |
| 实体定义 | 配置应用级实体对象（Entity），统一定义字段、关系、校验规则，供各引擎复用 |
| 页面设计 | 可视化拖拽搭建页面，支持多页面路由配置 |
| 数据表管理 | 可视化创建数据表，配置字段类型、校验规则、索引。数据表作为数据中心，支持跨应用数据共享与读写 |
| 数据运维 | 支持数据导出（CSV/Excel/SQL）、数据迁移（跨环境/跨库）、数据备份与恢复 |
| 应用预览 | 实时预览应用效果，支持多端切换预览 |
| 版本管理 | 应用版本快照，支持版本回滚与对比，支持锁定组件库版本 |
| 应用导出 | 导出为静态 JSON Schema 文件，支持离线部署 |

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

## 实体对象定义 (Entity)

应用级实体对象是平台各引擎共享的**统一数据模型**，定义一次，多处复用。

### 实体与引擎的关系

```
                        ┌─────────────┐
                        │  实体定义    │
                        │  (Entity)   │
                        └──────┬──────┘
                               │
         ┌─────────┬──────────┼──────────┬─────────┐
         ▼         ▼          ▼          ▼         ▼
    ┌─────────┐┌─────────┐┌─────────┐┌─────────┐┌─────────┐
    │ 渲染引擎 ││ 流程引擎 ││ 数据引擎 ││ 运算引擎 ││ 权限引擎 │
    │         ││         ││         ││         ││         │
    │ 表单组件 ││ 条件判断 ││ 数据表   ││ 字段运算 ││ 字段权限 │
    │ 数据展示 ││ 数据操作 ││ 格式化字段 ││ 聚合计算 ││ 数据权限 │
    │ 校验规则 ││ 审批引用 ││ 索引     ││ 公式     ││ 行级过滤 │
    └─────────┘└─────────┘└─────────┘└─────────┘└─────────┘
```

### 字段类型体系

实体字段通过 `type` 和 `format` 两个属性定义类型：

| 属性 | 作用 | 示例 |
|------|------|------|
| `type` | 基础类型，决定底层存储和基本运算 | `string`、`number`、`boolean`、`date`、`json`、`array`、`enum` |
| `format` | 格式化类型，引用数据引擎的字段类型注册表，获取校验/展示/运算规则 | `email`、`phone`、`address`、`currency`、`dateRange` |

**协作关系**：
- `type` 是必填的，定义字段的基础存储类型
- `format` 是可选的，引用格式化字段类型获取业务语义和规则
- 当指定 `format` 时，自动继承该类型的校验规则、展示组件、运算支持

> 📄 详见 [数据引擎文档](data-engine.md) 了解完整的格式化字段类型注册表

### 校验规则合并策略

当实体字段同时定义 `validation` 和引用 `format` 时，规则按以下策略合并：

```
格式化字段类型校验规则（基础）
        +
实体字段 validation 配置（扩展）
        =
最终生效的校验规则
```

**合并规则**：
1. 格式化字段类型的校验规则作为基础规则
2. 实体字段的 `validation` 配置作为扩展规则
3. 实体级配置可覆盖格式化类型的默认行为（如 `maxLength`）
4. 两者冲突时，实体级配置优先

```jsonc
// 合并示例
{
  // 格式化字段类型定义（邮箱）
  "pattern": "^[\\w.-]+@[\\w.-]+\\.\\w+$",
  "maxLength": 255,
  
  // 实体字段扩展配置
  "validation": {
    "required": true,
    "maxLength": 200,  // 覆盖格式化类型的默认 255
    "unique": true
  }
}
// 最终生效：required=true, pattern=..., maxLength=200, unique=true
```

### 实体定义结构

```jsonc
// entities/customer.json
{
  "entityId": "entity_customer",
  "name": "客户",
  "code": "customer",
  "description": "客户信息实体",

  // 字段定义
  "fields": [
    {
      "fieldId": "field_name",
      "name": "客户名称",
      "code": "name",
      "type": "string",
      "required": true,
      "unique": false,
      // 校验规则（各引擎共享）
      "validation": {
        "maxLength": 100,
        "minLength": 2
      }
    },
    {
      "fieldId": "field_email",
      "name": "邮箱",
      "code": "email",
      "type": "string",           // 基础类型：决定数据库列类型
      "format": "email",    // 格式化类型：引用邮箱字段类型，自动获取校验/展示规则
      // 可选：覆盖或扩展格式化类型的默认校验
      "validation": {
        "required": true,
        "maxLength": 200  // 覆盖默认的 255
      }
    },
    {
      "fieldId": "field_phone",
      "name": "手机号",
      "code": "phone",
      "type": "string",
      "format": "phone",    // 引用手机号字段类型，自动获取国际号码校验和脱敏规则
      "permissions": {
        "visible": ["admin", "manager"],  // 字段级权限
        "editable": ["admin"]
      }
    },
    {
      "fieldId": "field_address",
      "name": "地址",
      "code": "address",
      "type": "json",
      "format": "address"   // 引用地址字段类型，自动获取省市区结构和三级联动组件
    },
    {
      "fieldId": "field_level",
      "name": "客户等级",
      "code": "level",
      "type": "enum",
      "options": [
        { "label": "普通", "value": "normal" },
        { "label": "VIP", "value": "vip" },
        { "label": "SVIP", "value": "svip" }
      ]
    },
    {
      "fieldId": "field_order_amount",
      "name": "累计订单金额",
      "code": "order_amount",
      "type": "number",
      "format": "currency", // 引用金额字段类型，自动获取精度控制和千分位格式化
      "computed": true,
      // 运算表达式（运算引擎使用，JS 语法）
      "expression": "SUM(orders.filter(o => o.customer_id === this.id), 'amount')"
    }
  ],

  // 实体关系
  "relations": [
    {
      "name": "orders",
      "targetEntity": "order",
      "type": "one-to-many",
      "foreignKey": "customer_id"
    }
  ],

  // 权限配置（权限引擎使用）
  "permissions": {
    "dataScope": "department",
    "fieldLevel": {
      "phone": { "visible": ["admin", "manager"], "editable": ["admin"] },
      "email": { "visible": ["*"], "editable": ["admin", "manager"] }
    }
  }
}
```

### 各引擎如何复用实体

| 引擎 | 复用方式 | 示例 |
|------|---------|------|
| 渲染引擎 | 实体字段自动映射为表单组件，格式化类型决定组件选择，校验规则自动应用 | 拖入「客户」实体 → 自动生成姓名输入框、邮箱输入框（EmailInput）、省市区联动（AddressCascader） |
| 流程引擎 | 流程条件引用实体字段，格式化类型提供语义化运算 | 条件：`customer.email.includes("@vip.com")`；操作：创建关联订单 |
| 数据引擎 | 实体字段映射为数据表列，格式化类型决定列类型和索引，关系映射为外键 | `customer` 表自动生成 `email VARCHAR(255)`、`address JSON` 列 |
| 运算引擎 | 引用实体字段进行计算，格式化类型提供类型感知的聚合和运算 | `SUM(customers, 'order_amount')` 自动使用金额格式化；`COUNT_DISTINCT(customers, 'email')` 去重统计 |
| 权限引擎 | 实体权限配置自动生效，格式化类型提供脱敏规则，行级/字段级鉴权 | 普通用户看不到手机号字段；邮箱显示为 `zha***@example.com` |

### 实体 Schema 导出

实体定义包含在应用导出中：

```
app-export/
├── entities/
│   ├── customer.json          # 客户实体
│   ├── order.json             # 订单实体
│   └── product.json           # 产品实体
├── pages/
├── tables/
├── workflows/
└── permissions/
```

## 应用导出为 JSON Schema

平台支持将完整应用导出为结构化的静态 JSON Schema 文件，实现应用定义的可移植性和可版本化管理。

### 导出内容

```
app-export/
├── app.json                    # 应用元信息
├── pages/
│   ├── home.json               # 首页 Schema
│   ├── list.json               # 列表页 Schema
│   └── form.json               # 表单页 Schema
├── tables/
│   ├── users.json              # 用户表定义
│   └── orders.json             # 订单表定义
├── workflows/
│   ├── approval.json           # 审批流程定义
│   └── sync.json               # 数据同步流程定义
└── permissions/
    └── roles.json              # 权限角色定义
```

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

## 导出使用场景

| 场景 | 说明 |
|------|------|
| 版本控制 | JSON Schema 纳入 Git 管理，追踪应用变更历史 |
| 离线部署 | 导出后直接用于私有化部署，无需连接平台 |
| 应用迁移 | 跨环境（开发→测试→生产）应用迁移 |
| 应用市场 | 导出为应用模板，供其他用户导入使用 |
| 备份恢复 | 应用全量备份，支持灾难恢复 |
| 二次开发 | 基于 Schema 文件进行定制化开发 |
