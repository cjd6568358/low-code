# 数据引擎 (Data Engine)

基于底层 MySQL 数据库字段类型，封装为面向业务的格式化字段类型，与实体定义协作形成完整的数据建模体系。

## 架构总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           实体定义 (Entity)                              │
│                    定义业务对象结构、关系、权限                              │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │ 字段 A   │  │ 字段 B   │  │ 字段 C   │  │ 字段 D   │                │
│  │ type:    │  │ type:    │  │ type:    │  │ type:    │                │
│  │ string   │  │ string   │  │ json     │  │ number   │                │
│  │ advanced │  │ advanced │  │ advanced │  │ advanced │                │
│  │ Type:    │  │ Type:    │  │ Type:    │  │ Type:    │                │
│  │ email    │  │ phone    │  │ address  │  │ currency │                │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘                │
│       │              │              │              │                    │
└───────┼──────────────┼──────────────┼──────────────┼────────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     格式化字段类型注册表 (Field Type Registry)               │
│                                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ email   │ │ phone   │ │ address │ │ dateRange│ │ currency│          │
│  │ VARCHAR │ │ VARCHAR │ │ JSON    │ │DATE+DATE│ │ DECIMAL │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                                         │
│  提供：存储映射 / 格式校验 / 展示规则 / 输入组件 / 运算支持                  │
└─────────────────────────────────────────────────────────────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ 渲染引擎  │  │ 流程引擎  │  │ 运算引擎  │  │ 权限引擎  │
│ 自动渲染  │  │ 条件引用  │  │ 类型运算  │  │ 字段脱敏  │
│ 对应组件  │  │ 数据操作  │  │ 聚合计算  │  │ 格式化   │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

## 格式化字段类型注册表

### 内置格式化字段类型

| 类型标识 | 名称 | 基础类型 | 存储结构 | 校验规则 | 展示格式 |
|---------|------|---------|---------|---------|---------|
| `email` | 邮箱 | VARCHAR(255) | 字符串 | RFC 5322 格式校验 | 邮箱链接 |
| `phone` | 手机号 | VARCHAR(20) | 字符串 | 国际号码格式校验 | 带区号格式 |
| `idcard` | 身份证 | VARCHAR(18) | 字符串 | 18位校验 + 校验码验证 | 脱敏显示 |
| `address` | 地址 | JSON | `{province, city, district, detail}` | 省市区三级联动校验 | 结构化展示 |
| `dateRange` | 日期区间 | DATE + DATE | `{start, end}` | 起止日期逻辑校验 | `~` 连接 |
| `currency` | 金额 | DECIMAL(12,2) | 数值 | 精度控制 | 千分位 + 货币符号 |
| `percentage` | 百分比 | DECIMAL(5,2) | 数值 | 0-100 范围校验 | `%` 后缀 |
| `json` | JSON 对象 | JSON | 任意 JSON | JSON Schema 校验 | 格式化展示 |
| `richText` | 富文本 | TEXT | HTML 字符串 | XSS 过滤 | HTML 渲染 |
| `color` | 颜色 | VARCHAR(7) | HEX 字符串 | `#xxx` 或 `#xxxxxx` 格式 | 色块预览 |
| `url` | 链接 | VARCHAR(2048) | 字符串 | URL 格式校验 | 可点击链接 |
| `file` | 文件 | JSON | `{name, url, size, type}` | 文件类型/大小校验 | 下载链接 |
| `image` | 图片 | JSON | `{name, url, width, height}` | 图片格式/尺寸校验 | 缩略图 |
| `enum` | 枚举 | VARCHAR / JSON | 单选值字符串 或 多选值 JSON 数组 | 值必须在 `options` 范围内 | 标签文本展示 |

### 格式化字段类型定义结构

```typescript
// packages/data-engine/src/types/field-type.ts

interface AdvancedFieldTypeDef {
  /** 类型标识，如 'email', 'phone' */
  type: string;
  
  /** 显示名称 */
  label: string;
  
  /** 对应的基础 MySQL 类型 */
  baseType: 'varchar' | 'int' | 'decimal' | 'text' | 'json' | 'date' | 'datetime' | 'enum';
  
  /** MySQL 类型参数，如 VARCHAR(255)、DECIMAL(12,2) */
  baseTypeParams?: string;
  
  /** 存储结构描述（用于 JSON 类型） */
  storageSchema?: JSONSchema;
  
  /** 校验规则 */
  validation: {
    /** 内置校验函数名 */
    validator?: string;
    /** 正则校验 */
    pattern?: string;
    /** 自定义校验表达式 */
    expression?: string;
    /** 校验失败提示信息 */
    message?: string;
  };
  
  /** 展示配置 */
  display: {
    /** 输入组件类型 */
    inputComponent: string;
    /** 展示组件类型 */
    displayComponent: string;
    /** 格式化函数 */
    formatter?: string;
    /** 脱敏规则 */
    maskRule?: MaskRule;
  };
  
  /** 运算引擎支持 */
  computation: {
    /** 支持的聚合函数 */
    aggregations?: string[];
    /** 支持的运算操作 */
    operations?: string[];
    /** 类型转换函数 */
    casters?: Record<string, string>;
  };
  
  /** 是否系统内置（不可删除） */
  builtin: boolean;
}
```

### 示例：邮箱字段类型定义

```jsonc
// packages/data-engine/src/field-types/email.json
{
  "type": "email",
  "label": "邮箱",
  "baseType": "varchar",
  "baseTypeParams": "255",
  
  "validation": {
    "validator": "validateEmail",
    "pattern": "^[\\w.-]+@[\\w.-]+\\.\\w+$",
    "message": "请输入有效的邮箱地址"
  },
  
  "display": {
    "inputComponent": "EmailInput",
    "displayComponent": "EmailDisplay",
    "formatter": "formatEmail",
    "maskRule": {
      "strategy": "partial",
      "keepFirst": 3,
      "keepLast": 0,
      "maskChar": "*"
    }
  },
  
  "computation": {
    "aggregations": ["count", "distinct_count"],
    "operations": ["equal", "not_equal", "contains", "ends_with"],
    "casters": {
      "string": "toString"
    }
  },
  
  "builtin": true
}
```

## 实体定义与格式化字段的关联

### 实体字段定义结构

在实体定义中，每个字段通过 `type` 和 `format` 两个属性与格式化字段关联：

```typescript
// packages/shared/src/types/entity-field.ts

interface EntityFieldDef {
  /** 字段唯一标识 */
  fieldId: string;
  
  /** 字段显示名称 */
  name: string;
  
  /** 字段编码（数据库列名） */
  code: string;
  
  /** 基础类型：决定底层存储 */
  type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array' | 'enum';
  
  /** 格式化类型：引用字段类型注册表，获取校验/展示/运算规则 */
  format?: string;
  
  /** 是否必填 */
  required?: boolean;
  
  /** 是否唯一 */
  unique?: boolean;
  
  /** 默认值 */
  defaultValue?: any;

  /** 枚举选项（type 为 'enum' 时必填） */
  options?: { label: string; value: string | number }[];
  
  /** 字段级校验规则（与格式化类型校验合并） */
  validation?: FieldValidation;
  
  /** 字段级权限配置 */
  permissions?: FieldPermissions;
  
  /** 计算字段配置 */
  computed?: ComputedFieldConfig;
  
  /** 字段描述/帮助文本 */
  description?: string;
}
```

### 关联机制

```
实体字段定义                    格式化字段类型注册表
┌─────────────────┐           ┌─────────────────┐
│ code: "email"   │           │ type: "email"   │
│ type: "string"  │ ────────▶ │ baseType: "varchar│
│ format:         │   引用    │ validation: ... │
│   "email"       │           │ display: ...    │
│                 │           │ computation: ...│
│ validation:     │ ◀─ 合并 ─ │                 │
│   自定义规则     │           │                 │
└─────────────────┘           └─────────────────┘
```

**规则合并策略**：
1. 格式化字段类型的校验规则作为基础规则
2. 实体字段的 `validation` 配置作为扩展规则
3. 两者合并，实体级配置可覆盖格式化类型的默认行为

```jsonc
// 合并示例
{
  // 格式化字段类型定义的校验
  "pattern": "^[\\w.-]+@[\\w.-]+\\.\\w+$",
  
  // 实体字段额外配置
  "validation": {
    "required": true,
    "maxLength": 200,  // 覆盖格式化类型的默认 255
    "unique": true
  }
}
```

## 数据流转

### 流程引擎驱动

```
用户输入 ──▶ 格式化字段校验 ──▶ 运算引擎处理 ──▶ 流程引擎流转
                                                  │
                    ┌─────────────────────────────┘
                    ▼
          ┌─────────────────┐
          │  流程期间         │
          │  数据在快照表     │
          │  业务表不参与     │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │  审批结束         │
          │  终态数据回写业务表│
          └─────────────────┘
```

### 运算引擎驱动

格式化字段类型为运算引擎提供类型感知的运算能力：

```jsonc
// 运算表达式示例
{
  // 邮箱字段支持的运算
  "email_field": {
    "equal": "user@example.com",
    "contains": "@company.com",
    "domain": "company.com"  // 提取域名
  },
  
  // 金额字段支持的运算
  "amount_field": {
    "sum": true,
    "avg": true,
    "format": "¥#,##0.00"  // 格式化输出
  },
  
  // 日期区间字段支持的运算
  "date_range_field": {
    "duration": "days",  // 计算区间天数
    "overlap": "other_range",  // 判断区间重叠
    "contains": "2024-01-15"  // 判断是否在区间内
  }
}
```

## 各引擎如何消费格式化字段

| 引擎 | 消费方式 | 示例 |
|------|---------|------|
| **渲染引擎** | 根据 `display.inputComponent` 自动选择输入组件，根据 `display.displayComponent` 选择展示组件 | 邮箱字段 → EmailInput 组件；地址字段 → 省市区三级联动组件 |
| **流程引擎** | 引用实体字段进行条件判断，格式化类型提供语义化运算 | 条件：`customer.email.includes("@vip.com")` |
| **运算引擎** | 根据 `computation` 配置支持类型感知的聚合和运算 | `SUM(orders, 'amount')` 自动使用金额格式化；`COUNT_DISTINCT(users, 'email')` 去重统计 |
| **权限引擎** | 根据 `display.maskRule` 自动脱敏，根据字段类型控制可见性 | 手机号：`138****8888`；邮箱：`zha***@example.com` |
| **表单引擎** | 根据 `validation` 配置自动校验，支持异步校验 | 邮箱格式实时校验；身份证校验码验证 |

## 自定义格式化字段类型

### 注册自定义类型

```typescript
// packages/data-engine/src/registry/register-custom-type.ts

import { fieldTypeRegistry } from '../registry';

// 注册自定义的"工号"字段类型
fieldTypeRegistry.register({
  type: 'employee_id',
  label: '工号',
  baseType: 'varchar',
  baseTypeParams: '20',
  
  validation: {
    validator: 'validateEmployeeId',
    pattern: '^EMP\\d{6}$',
    message: '工号格式为 EMP + 6位数字'
  },
  
  display: {
    inputComponent: 'EmployeeIdInput',
    displayComponent: 'EmployeeIdDisplay',
    formatter: 'formatEmployeeId'
  },
  
  computation: {
    aggregations: ['count', 'distinct_count'],
    operations: ['equal', 'not_equal', 'starts_with']
  },
  
  builtin: false
});
```

### 在实体定义中使用

```jsonc
{
  "entityId": "entity_employee",
  "name": "员工",
  "fields": [
    {
      "fieldId": "field_emp_id",
      "name": "工号",
      "code": "emp_id",
      "type": "string",
      "format": "employee_id",  // 使用自定义格式化类型
      "required": true,
      "unique": true
    }
  ]
}
```

## 格式化字段的 UI 集成

### 设计器中的字段类型选择

在页面设计器中，当用户拖入实体字段时，根据 `format` 自动选择对应组件：

```
┌─────────────────────────────────────────────────────────┐
│  字段配置面板                                            │
├─────────────────────────────────────────────────────────┤
│  实体：客户                                              │
│                                                         │
│  字段列表：                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ☑ 客户名称  [string]                            │   │
│  │ ☑ 邮箱      [email]     → EmailInput           │   │
│  │ ☑ 手机号    [phone]     → PhoneInput           │   │
│  │ ☑ 地址      [address]   → AddressCascader      │   │
│  │ ☑ 累计金额  [currency]  → CurrencyDisplay      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [确定]  [取消]                                         │
└─────────────────────────────────────────────────────────┘
```

### 属性面板自动渲染

格式化字段类型的配置自动渲染为属性面板：

```
┌─────────────────────────────────────────────────────────┐
│  属性配置 - 邮箱字段                                     │
├─────────────────────────────────────────────────────────┤
│  基础属性                                                │
│  ├─ 标签：邮箱                                          │
│  ├─ 字段：email                                         │
│  └─ 占位符：请输入邮箱地址                                │
│                                                         │
│  校验规则（来自格式化字段类型）                              │
│  ├─ ☑ 必填                                              │
│  ├─ 格式：RFC 5322 邮箱格式                             │
│  └─ 最大长度：255                                        │
│                                                         │
│  展示配置                                                │
│  ├─ 脱敏：部分脱敏（保留前3位）                           │
│  └─ 链接：可点击发送邮件                                 │
│                                                         │
│  权限配置                                                │
│  ├─ 可见：所有人                                        │
│  └─ 可编辑：管理员、经理                                 │
└─────────────────────────────────────────────────────────┘
```

## 数据表 Schema 与格式化字段

数据表定义中，格式化字段类型映射为具体的数据库列定义：

```jsonc
// tables/customers.json
{
  "tableId": "table_customers",
  "name": "客户表",
  "fields": [
    {
      "fieldId": "field_001",
      "name": "email",
      "type": "varchar",
      "format": "email",
      // 以下由格式化字段类型自动推导
      "columnType": "VARCHAR(255)",
      "validation": {
        "pattern": "^[\\w.-]+@[\\w.-]+\\.\\w+$"
      }
    },
    {
      "fieldId": "field_002",
      "name": "address",
      "type": "json",
      "format": "address",
      // 以下由格式化字段类型自动推导
      "columnType": "JSON",
      "structure": {
        "province": "string",
        "city": "string",
        "district": "string",
        "detail": "string"
      }
    }
  ]
}
```

## 与实体定义的关系

数据引擎与实体定义的协作关系：

```
实体定义（业务层）              数据引擎（存储层）
┌─────────────────┐          ┌─────────────────┐
│ Entity          │          │ Table           │
│ ├─ fields[]     │ ────────▶│ ├─ columns[]    │
│ │  ├─ type      │  生成    │ │  ├─ columnType│
│ │  └─ advanced  │  映射    │ │  └─ validation│
│ │     Type      │          │ │               │
│ ├─ relations[]  │ ────────▶│ ├─ foreignKeys[]│
│ └─ permissions  │          │ └─ indexes[]    │
└─────────────────┘          └─────────────────┘
```

- **实体定义**是业务层的数据模型，面向开发者和业务配置人员
- **数据表**是存储层的物理结构，面向数据库
- **格式化字段类型**是连接两者的桥梁，提供类型映射和规则复用

---

> 📄 详见 [应用管理文档](application.md) 了解实体定义的完整结构
