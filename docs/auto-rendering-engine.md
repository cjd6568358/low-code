# 自动渲染引擎 (Auto-Rendering Engine)

自动渲染引擎是平台的基础能力层，提供 **Schema → UI 表单** 的通用渲染能力。各引擎（渲染、流程、自动化、数据、表单、权限等）只需提供 JSON Schema 配置，即可自动生成对应的配置表单 UI，无需手写配置界面。

## 设计目标

- **Schema 驱动**：任何引擎提供 JSON Schema（含平台扩展字段），即可自动生成配置表单
- **类型全覆盖**：基础类型、枚举、嵌套对象、数组、判别联合（discriminated union）
- **布局可控**：通过扩展字段控制分组、排序、Tab 切换、条件显隐
- **变量绑定**：与平台变量系统集成，支持数据引用和表达式编辑
- **可扩展**：各引擎可注册自定义控件覆盖默认渲染
- **字典集成**：与系统字典打通，枚举值自动填充

---

## 架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                        各引擎配置界面                                 │
│  渲染引擎    流程引擎    自动化引擎    数据引擎    权限引擎    ...      │
├─────────────────────────────────────────────────────────────────────┤
│                        自动渲染引擎                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ Schema     │  │ 表单渲染器  │  │ 控件注册表  │  │ 变量绑定     │  │
│  │ 注册中心   │  │ Renderer   │  │ Control    │  │ 集成层       │  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 表单引擎（子模块）— 联动引擎 / 校验引擎 / 子表单 / 特殊控件    │  │
│  └──────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│  运算引擎(表达式)  │  系统字典(枚举值)  │  数据引擎(字段类型)          │
└─────────────────────────────────────────────────────────────────────┘
```

自动渲染引擎不包含业务逻辑，只负责：
1. 接收 JSON Schema 描述
2. 根据 Schema 类型和扩展字段选择合适的控件
3. 渲染为可交互的配置表单
4. 将用户输入的值以结构化数据返回给调用方引擎

---

## Schema 扩展字段规范

在标准 JSON Schema 基础上，通过 `x-*` 扩展字段控制渲染行为。所有扩展字段均为可选。

### 布局与排序

| 扩展字段 | 类型 | 说明 |
|---------|------|------|
| `x-group` | `string` | 字段分组名，同组字段聚合展示。支持多级：`"基础/样式"` |
| `x-priority` | `number` | 组内排序权重（升序），数值越小越靠前 |
| `x-layout` | `'horizontal' \| 'vertical' \| 'inline'` | 单个字段的标签布局方向 |
| `x-layout-mode` | `'tabs' \| 'groups' \| 'steps' \| 'sections'` | Schema 级布局模式，控制分组展示方式 |

### 控件指定

| 扩展字段 | 类型 | 说明 |
|---------|------|------|
| `x-component` | `string` | 指定自定义控件名，覆盖默认类型→控件映射 |
| `x-component-props` | `object` | 传递给自定义控件的额外属性 |
| `x-decorator` | `string` | 指定字段包裹组件（如 `Tooltip`、`FormItem`） |
| `x-decorator-props` | `object` | 传递给包裹组件的额外属性 |

### 条件控制

| 扩展字段 | 类型 | 说明 |
|---------|------|------|
| `x-visible` | `string` | 条件显隐表达式，引用当前表单值，如 `"type === 'email'"` |
| `x-disabled` | `string` | 条件禁用表达式 |

### 绑定控制

| 扩展字段 | 类型 | 说明 |
|---------|------|------|
| `x-no-binding` | `any` | 禁止变量/表达式绑定。存在此注解时，属性面板隐藏常量/变量/表达式切换按钮，仅显示常量输入框 |

**使用场景**：字段名（`name`）、ID 等不允许动态绑定的属性。

**TS Schema 注解**：
```typescript
/**
 * 字段名称
 * @group 基础属性
 * @priority 0
 * @no-binding 不支持变量/表达式绑定
 */
name?: string;
```

**生成的 JSON Schema**：
```json
{
  "name": {
    "type": "string",
    "title": "字段名称",
    "x-group": "基础属性",
    "x-priority": 0,
    "x-no-binding": "不支持变量/表达式绑定"
  }
}
```

### 数据与校验

| 扩展字段 | 类型 | 说明 |
|---------|------|------|
| `x-placeholder` | `string` | 占位提示文本 |
| `x-dictionary` | `string` | 引用系统字典 code，自动展开为 enum 值 |
| `x-dataSource` | `string` | 变量绑定数据源标识，标记后该字段旁注入变量绑定按钮 |
| `x-validator` | `string \| object` | 自定义校验规则名或内联校验配置 |
| `x-validator-message` | `string` | 校验失败提示文本 |
| `x-value-type` | `string` | 组件值的 TypeScript 类型（从 antd 类型定义自动提取），用于变量选择器类型提示 |

**@value-type 注解**：

从 antd 类型定义中自动提取组件的 `value`/`children` 属性类型，写入 schema.ts 的 JSDoc 注解。

```bash
# 从 antd 类型定义同步类型到 schema.ts
lc-schema sync-types
```

**TS Schema 注解**：
```typescript
/**
 * 值
 * @group 基础属性
 * @priority 10
 * @value-type number
 */
value?: number;
```

**生成的 JSON Schema**：
```json
{
  "value": {
    "type": "number",
    "title": "值",
    "x-group": "基础属性",
    "x-priority": 10,
    "x-value-type": "number"
  }
}
```

### 联动与反应

| 扩展字段 | 类型 | 说明 |
|---------|------|------|
| `x-reactions` | `ReactionConfig[]` | 字段联动配置，值变化时触发其他字段更新 |

```typescript
interface ReactionConfig {
  /** 联动目标字段路径 */
  target: string;
  /** 联动类型 */
  type: 'value' | 'visible' | 'disabled' | 'enum' | 'schema';
  /** 联动表达式或函数标识 */
  expression: string;
}
```

### 判别联合

| 扩展字段 | 类型 | 说明 |
|---------|------|------|
| `x-discriminator` | `string` | 判别联合字段名，配合 `oneOf`/`anyOf` 使用 |

```typescript
interface DiscriminatorConfig {
  /** 判别字段属性名 */
  propertyName: string;
  /** 判别值 → 子 Schema 映射 */
  mapping: Record<string, JSONSchema>;
}
```

---

## 控件注册表

### 统一基于 antd 的控件体系

自动渲染引擎的**所有基础控件统一使用 Ant Design 组件**，确保样式、交互、无障碍访问的一致性。定制组件也基于 antd 基础组件搭建。

```
ControlRegistry
  └─ antd 控件（唯一控件源）
       ├─ AntdAutoInput      → antd Input
       ├─ AntdAutoTextarea   → antd Input.TextArea
       ├─ AntdAutoNumber     → antd InputNumber
       ├─ AntdAutoSelect     → antd Select
       ├─ AntdAutoSwitch     → antd Switch
       ├─ AntdAutoDatePicker → antd DatePicker
       ├─ AntdAutoTimePicker → antd TimePicker
       ├─ AntdAutoCheckbox   → antd Checkbox.Group
       └─ AntdAutoRadio      → antd Radio.Group
```

> 不再维护原生 HTML 控件 fallback。所有控件统一 `size="small"`，透传 antd 原生属性（`status`/`variant`/`disabled` 等）。

### 默认类型→控件映射

| Schema 类型 | format / 条件 | antd 控件 | 说明 |
|------------|--------------|----------|------|
| `string` | 无 | `Input` | 单行文本 |
| `string` | `textarea` | `Input.TextArea` | 多行文本 |
| `string` | `date` | `DatePicker` | 日期选择 |
| `string` | `date-time` | `DatePicker[showTime]` | 日期时间 |
| `string` | `time` | `TimePicker` | 时间选择 |
| `string` | 有 `enum` | `Select` | 下拉选择 |
| `string` | 有 `x-dictionary` | `Select` | 字典填充 |
| `number` / `integer` | 无 | `InputNumber` | 数字输入 |
| `boolean` | 无 | `Switch` | 开关 |
| `x-component: Checkbox` | — | `Checkbox.Group` | 多选 |
| `x-component: Radio` | — | `Radio.Group` | 单选 |

### 自定义控件注册

各引擎可注册自定义控件，通过 `x-component` 字段引用：

```typescript
interface ControlRegistry {
  /** 注册基础类型映射 */
  register(type: string, format: string | null, component: React.ComponentType<ControlProps>): void;

  /** 注册命名控件（通过 x-component 引用） */
  registerControl(name: string, component: React.ComponentType<ControlProps>): void;

  /** 注册判别联合处理器 */
  registerDiscriminator(schemaId: string, config: DiscriminatorConfig): void;

  /** 查询控件 */
  resolve(type: string, format?: string, xComponent?: string): React.ComponentType<ControlProps>;
}
```

控件统一接口：

```typescript
interface ControlProps {
  value: any;                              // 当前值
  onChange: (value: any) => void;          // 值变更回调
  schema: JSONSchema;                     // 当前字段的 Schema
  disabled?: boolean;                      // 是否禁用
  placeholder?: string;                    // 占位提示
  errors?: string[];                       // 校验错误
  // 平台扩展
  dictionaryService?: DictionaryService;   // 字典服务
  expressionEngine?: ExpressionEngine;     // 表达式引擎
}
```

### 各引擎注册的自定义控件

| 引擎 | 控件名 | 说明 |
|------|--------|------|
| 渲染引擎 | `ComponentSelector` | 组件选择器 |
| 渲染引擎 | `StyleEditor` | 样式编辑器 |
| 渲染引擎 | `EventActionChainEditor` | 事件动作链编排器 |
| 自动化引擎 | `CronEditor` | Cron 表达式编辑器 |
| 自动化引擎 | `ConditionBuilder` | 可视化条件构建器 |
| 自动化引擎 | `EntitySelector` | 实体/数据表选择器 |
| 流程引擎 | `NodeFormConfigurator` | 节点表单权限配置器 |
| 流程引擎 | `SnapshotConfigurator` | 快照配置器 |
| 数据引擎 | `FieldTypeSelector` | 字段类型选择器（含格式联动） |
| 数据引擎 | `ValidationRuleBuilder` | 校验规则构建器 |
| 表单引擎 | `LinkageRuleEditor` | 联动规则编辑器 |
| 表单引擎 | `SubFormConfigurator` | 子表单配置器 |
| 权限引擎 | `PermissionMatrix` | 权限矩阵编辑器 |
| 权限引擎 | `DataScopeSelector` | 数据范围选择器 |
| 内建 | `VariableTreeSelector` | 组件变量树选择器（自动渲染引擎内建，无需注册） |
| 内建 | `ExpressionEditor` | 表达式编辑器（自动渲染引擎内建，无需注册） |
| 内建 | `CodeEditor` | 代码编辑器 Monaco（自动渲染引擎内建，无需注册） |

---

## 布局模式

Schema 级 `x-layout-mode` 控制整个表单的分组展示方式：

### groups（默认）

按 `x-group` 分折叠面板，组内按 `x-priority` 排序：

```
┌─────────────────────────────────────┐
│  ▼ 基础属性                         │
│  ├ 名称  [xxx]              (p=1)   │
│  ├ 类型  [xxx ▼]            (p=2)   │
│  └ 描述  [xxx]              (p=3)   │
│                                     │
│  ▼ 高级配置                         │
│  ├ 超时  [30]               (p=10)  │
│  └ 重试  [3]                (p=11)  │
└─────────────────────────────────────┘
```

### tabs

按 `x-group` 分 Tab 页签：

```
┌─────────────────────────────────────┐
│  [基础]  [高级]  [权限]  [其他]      │
├─────────────────────────────────────┤
│  名称  [xxx]                        │
│  类型  [xxx ▼]                      │
│  描述  [xxx]                        │
└─────────────────────────────────────┘
```

### steps

分步表单，每组为一步：

```
┌─────────────────────────────────────┐
│  ① 基本信息  →  ② 高级配置  →  ③ 完成│
├─────────────────────────────────────┤
│  名称  [xxx]                        │
│  类型  [xxx ▼]                      │
│                                     │
│              [上一步]  [下一步 →]     │
└─────────────────────────────────────┘
```

### sections

平铺区块，无折叠：

```
┌─────────────────────────────────────┐
│  基础属性                           │
│  名称  [xxx]  类型  [xxx ▼]         │
│                                     │
│  高级配置                           │
│  超时  [30]    重试  [3]             │
└─────────────────────────────────────┘
```

---

## 判别联合渲染

### 概念

判别联合（Discriminated Union）是配置表单中最常见的模式：根据一个 `type` 字段的值，展示不同的子配置表单。自动化引擎的触发器/动作、流程引擎的节点配置、表单引擎的联动规则都大量使用此模式。

### Schema 描述

```jsonc
{
  "type": "object",
  "x-discriminator": "type",
  "properties": {
    "type": {
      "type": "string",
      "title": "动作类型",
      "enum": [
        { "label": "触发流程", "value": "trigger_workflow" },
        { "label": "发送通知", "value": "send_notification" },
        { "label": "数据操作", "value": "data_operation" }
      ],
      "x-group": "动作配置",
      "x-priority": 1
    }
  },
  "oneOf": [
    {
      "title": "触发流程",
      "properties": {
        "type": { "const": "trigger_workflow" },
        "workflowId": { "type": "string", "title": "流程", "x-component": "WorkflowSelector", "x-group": "动作配置" },
        "inputData": { "type": "object", "title": "输入数据", "x-group": "动作配置" }
      },
      "required": ["workflowId"]
    },
    {
      "title": "发送通知",
      "properties": {
        "type": { "const": "send_notification" },
        "channels": { "type": "array", "items": { "type": "string", "enum": ["email","sms","wechat"] }, "title": "通知渠道", "x-group": "动作配置" },
        "templateId": { "type": "string", "title": "消息模板", "x-component": "TemplateSelector", "x-group": "动作配置" },
        "recipients": { "type": "array", "title": "接收人", "x-component": "RecipientSelector", "x-group": "动作配置" }
      },
      "required": ["channels", "templateId"]
    },
    {
      "title": "数据操作",
      "properties": {
        "type": { "const": "data_operation" },
        "tableId": { "type": "string", "title": "数据表", "x-component": "EntitySelector", "x-group": "动作配置" },
        "operation": { "type": "string", "enum": ["create","update","delete","upsert"], "title": "操作类型", "x-group": "动作配置" },
        "data": { "type": "object", "title": "数据映射", "x-group": "动作配置" }
      },
      "required": ["tableId", "operation"]
    }
  ]
}
```

### 渲染行为

1. **初始渲染**：渲染 `type` 字段为下拉选择器，展示所有 `oneOf` 选项
2. **切换联动**：用户切换 `type` 值时，动态替换后续表单区域为对应 `oneOf` 分支的 Schema
3. **值保留策略**：共享字段（`type` 之外同名字段）保留值，差异字段重置为默认值
4. **校验继承**：当前分支的 `required` 和字段级校验自动生效

### 渲染示例

```
┌─────────────────────────────────────────┐
│  动作类型: [发送通知 ▼]                   │  ← 判别字段
├─────────────────────────────────────────┤
│  通知渠道:  ☑ 邮件  ☑ 短信  ☐ 企业微信   │  ← oneOf[1].channels
│  消息模板:  [审批提醒模板 ▼]              │  ← oneOf[1].templateId
│  接收人:   [张三, 李四]           [+ 添加]│  ← oneOf[1].recipients
└─────────────────────────────────────────┘
```

---

## 变量绑定集成

### 值模式切换

每个字段 label 右侧提供 **Button Group（常量/变量/表达式）**，默认选中"常量"：

- **常量**（默认）：直接输入静态值
- **变量**：点击后弹出变量选择器，选择变量引用
- **表达式**：点击后弹出变量选择器，切换到表达式 tab

切换模式时会清除已有值。选中变量/表达式后，输入区域显示 Tag 样式的绑定标识（蓝色=变量，橙色=表达式），点击可重新打开变量选择器修改。

#### PropValueField 公共组件

值模式切换逻辑提取为 `PropValueField` 公共组件（`packages/auto-rendering/src/core/PropValueField.tsx`），供 AutoFormRenderer 和 EventActionChainEditor 复用：

```typescript
interface PropValueFieldProps {
  mode: ValueMode;                    // 'constant' | 'variable' | 'expression'
  onModeChange: (mode: ValueMode) => void;
  value?: unknown;                    // 当前值（变量/表达式模式下显示绑定路径）
  onOpenPicker?: () => void;          // 变量/表达式模式下点击打开选择器
  disabled?: boolean;
  children?: React.ReactNode;         // 常量模式下渲染的控件
}
```

导出工具函数：
- `detectValueMode(val)` — 从 PropValue 对象检测当前模式
- `extractDisplayValue(val)` — 从值中提取字符串显示值

### 数据源配置

```jsonc
{
  "customerName": {
    "type": "string",
    "title": "客户名称",
    "x-dataSource": "page"    // 数据源范围标识
  }
}
```

`x-dataSource` 取值：

| 值 | 变量树范围 | 适用场景 |
|----|-----------|---------|
| `page` | 页面上下文 + 表单数据 + API 返回值 + 其他组件 | 页面配置 |
| `form` | 表单字段 + 表单上下文 | 表单内配置 |
| `workflow` | 流程变量 + 节点数据 + 表单快照 | 流程节点配置 |
| `automation` | 触发事件数据 + 条件结果 + 上下文 | 自动化规则配置 |
| `global` | 全局上下文 + 租户配置 + 用户信息 | 跨上下文配置 |

### 绑定模式

通过 Button Group 切换三种值模式：

1. **常量**（默认）：直接输入静态值，input 正常可编辑
2. **变量**：弹出变量选择器，从变量树中选择变量引用
3. **表达式**：弹出变量选择器，支持所有环境变量、函数调用、条件判断

> **变量引用 vs 表达式**：变量引用为点路径取值（如 `$user.name`），不支持 `$table/$computation/$fetch`；表达式为 JS 语法（如 `async () => { return $user.name; }`），支持所有环境变量，实质为异步函数。

#### PropValue 数据格式

```typescript
type PropValue =
  | any                                    // 字面量
  | { type: 'variable', value: string }    // 变量引用
  | { type: 'expression', value: string }; // 表达式
```

**JSON 示例**：
```json
{
  "props": {
    "placeholder": "啊啊啊",
    "a": { "type": "variable", "value": "$platform.web" },
    "b": { "type": "expression", "value": "async () => { return $user.name; }" }
  }
}
```

**运行时解析**：
- 字面量：直接使用
- 变量引用（同步）：从运行时上下文按路径取值
- 表达式（异步）：执行 async 函数，支持依赖收集和变更传播

**设计器侧显示规则**：

| 模式 | 属性面板显示 | 设计画布显示 |
|------|------------|------------|
| 常量 | 原值 | 原值 |
| 变量 | `变量` 标签 + 变量路径 | `[变量] $platform.web` |
| 表达式 | `表达式` 标签（不显示具体值） | `[表达式]` |

### 组件 ID 与字段名

**生成规则**：

| 字段 | 格式 | 示例 | 说明 |
|------|------|------|------|
| `id` | `{type}_{timestamp}` | `textarea_1781765600372` | 组件实例唯一标识，不可变 |
| `name` | `{中文名}_{序号}` | `文本域_01` | 字段名，用于表单绑定和变量引用 |

**字段名生成**：使用 `antdCategoryMap` 中的组件中文名作为前缀，自动递增序号避免冲突。

**唯一性校验**：
- `id`：系统自动生成，保证唯一
- `name`：修改时实时校验，保存时批量校验，重复时提示错误

#### 环境变量体系

| 变量 | 说明 | 可用模式 | 动态属性 |
|------|------|---------|---------|
| `$user` | 当前登录用户信息，包含用户 ID、姓名、角色、部门、岗位等 | 变量 + 表达式 | 否（固定字段） |
| `$platform` | 当前运行平台标识，用于判断用户访问的终端类型 | 变量 + 表达式 | 否（固定字段） |
| `$route` | 当前路由信息，包含路径参数和查询参数 | 变量 + 表达式 | 否（固定字段） |
| `$component` | 页面组件实例状态，通过组件 ID 引用 | 变量 + 表达式 | **是（页面组件列表）** |
| `$data` | 页面级数据源聚合，包含页面配置的所有数据源返回值 | 变量 + 表达式 | **是（页面数据源列表）** |
| `$table` | 服务端表查询，支持链式调用构建查询条件 | 仅表达式 | **是（可用数据表列表）** |
| `$computation` | 运算引擎，执行服务端预定义的运算逻辑 | 仅表达式 | 否 |
| `$fetch` | 第三方 HTTP 请求，用于调用外部 API 接口 | 仅表达式 | 否 |
| `$workflow` | 流程上下文，仅在流程审批页面内有效 | 仅表达式 | 否 |

#### 环境变量动态注册

部分环境变量（`$component`、`$data`、`$table`）的属性是动态生成的，需要在运行时注册：

```typescript
// 注册页面组件到 $component
environmentRegistry.registerPageComponents({
  'input_01': { type: 'input', label: '客户名称' },
  'select_02': { type: 'select', label: '客户等级' },
  'btn_submit': { type: 'button', label: '提交按钮' },
});

// 注册页面数据源到 $data
environmentRegistry.registerPageDataSources({
  'orderList': { type: 'api', description: '订单列表数据' },
  'customerInfo': { type: 'api', description: '客户信息' },
});

// 注册可用数据表到 $table
environmentRegistry.registerAvailableTables({
  'user': { description: '用户表' },
  'order': { description: '订单表' },
});
```

**VariableTreeSelector 组件自动处理动态注册**：

```typescript
<VariableTreeSelector
  visible={true}
  mode="variable"
  value="$component.input_01.value"
  onChange={handleChange}
  onClear={handleClear}
  onClose={handleClose}
  // 传入页面组件列表，VariableTreeSelector 打开时自动注册
  pageComponents={{
    'input_01': { type: 'input', label: '客户名称' },
    'select_02': { type: 'select', label: '客户等级' },
  }}
/>
```

**代码提示效果**：

输入 `$component.` 时显示页面组件列表：
```
$component.input_01    — 客户名称 (input_01)
$component.select_02   — 客户等级 (select_02)
$component.btn_submit  — 提交按钮 (btn_submit)
```

输入 `$component.input_01.` 时显示组件属性：
```
$component.input_01.value     — 组件当前值
$component.input_01.visible   — 是否可见
$component.input_01.disabled  — 是否禁用
$component.input_01.loading   — 是否加载中
```

跨应用引用（`$table/$computation/$workflow`）需在 `page.references` 中注册，代码提示展示所在应用名称。

#### 表达式编辑器

表达式模式下，ExpressionEditor 使用 Monaco Editor 提供代码编辑能力。

**编辑器结构**：
- 环境变量说明和示例作为 JSDoc 注释显示在编辑器顶部
- 用户在 `async () => {}` 函数体内编写代码
- 保存时自动过滤 JSDoc 注释，只保存函数本身

**自动补全行为**：
- 输入 `$`：显示所有一级环境变量
- 输入 `$platform.`：显示 `$platform` 的子属性
- 输入 `$component.`：显示页面组件列表（动态注册）
- 提示格式：`[类型] 中文说明`

**实时类型检查**：
- 编辑器上方显示属性期望类型（蓝色标签）
- 编辑器下方实时显示推断的返回类型（debounce 300ms）
- 类型不匹配时显示橙色警告标签
- Promise 返回时显示红色错误标签
- 复杂表达式可手动指定返回类型覆盖自动推断

**保存前校验**：
1. Monaco 内置格式化（自动缩进、对齐）
2. Monaco 语法检查（错误阻止保存）
3. 类型校验（不匹配弹窗确认）

**已知问题**：
- Monaco Editor 的 JavaScript 语言服务会提供内置补全（小扳手图标），可能与自定义补全同时出现
- `$component` 动态注册依赖 `pageComponents` prop 的传入时机

**跨应用资源校验规则**：

| 类型 | 语法 | 校验 |
|------|------|------|
| 当前应用 | `$table.user` | 直接访问，无需校验 |
| 跨应用 | `$table.80e88653.user` | 需校验目标应用 `expose` 配置 |

校验流程：
1. 解析变量路径，区分当前应用/跨应用
2. 跨应用时，查询目标应用的 `app.expose[resourceType]`
3. 若目标资源未在 `expose` 中声明，报错拒绝
4. 校验通过后，在 `page.references` 中注册依赖

**依赖优先级与循环检测**：

依赖图（DependencyGraph）负责管理变量依赖关系，支持：

1. **拓扑排序**：确定求值顺序，避免依赖未就绪的变量
2. **循环检测**：在注册依赖时检测循环依赖，避免死循环
3. **变更传播**：变量变更时，按拓扑排序通知所有依赖组件

```
依赖图示例：
  $user.name → component_a.props.label
  $user.name → component_b.props.value
  $data.order.amount → component_b.props.value

拓扑排序结果：
  1. component_a.props.label（依赖 $user.name）
  2. component_b.props.value（依赖 $user.name + $data.order.amount）

循环检测：
  若 A → B → C → A，检测到循环，报错拒绝注册
```

---

## 字典集成

### 引用方式

Schema 中通过 `x-dictionary` 引用系统字典，自动渲染引擎从字典服务获取枚举值并填充下拉选项：

```jsonc
{
  "nodeType": {
    "type": "string",
    "title": "节点类型",
    "x-dictionary": "workflow_node_types"
    // 渲染时自动展开为：
    // enum: [
    //   { "label": "触发器", "value": "trigger" },
    //   { "label": "条件分支", "value": "condition" },
    //   { "label": "人工审批", "value": "approval" },
    //   ...
    // ]
  }
}
```

### 与 enum 的关系

- `enum` 优先级高于 `x-dictionary`：同时存在时以 `enum` 为准
- `x-dictionary` 是 `enum` 的动态替代：避免在 Schema 中硬编码枚举值
- 字典值变更时，所有引用该字典的表单自动更新选项

---

## 完整接入示例

### 示例一：自动化引擎触发器配置

自动化引擎提供 `AutomationTrigger` 的 JSON Schema，自动渲染引擎生成触发器配置表单：

```jsonc
// 自动化引擎提供的 Schema
{
  "type": "object",
  "title": "触发器配置",
  "x-layout-mode": "groups",
  "x-discriminator": "type",
  "properties": {
    "type": {
      "type": "string",
      "title": "触发类型",
      "x-dictionary": "automation_trigger_types",
      "x-group": "触发器",
      "x-priority": 1
    }
  },
  "oneOf": [
    {
      "properties": {
        "type": { "const": "data_change" },
        "tableId": { "type": "string", "title": "监听数据表", "x-component": "EntitySelector", "x-group": "触发器" },
        "operations": {
          "type": "array", "title": "触发操作",
          "items": { "type": "string", "enum": ["create","update","delete"] },
          "x-group": "触发器"
        },
        "filter": { "type": "object", "title": "过滤条件", "x-component": "ConditionBuilder", "x-group": "触发器",
          "x-dataSource": "automation" }
      }
    },
    {
      "properties": {
        "type": { "const": "schedule" },
        "cron": { "type": "string", "title": "Cron 表达式", "x-component": "CronEditor", "x-group": "调度配置" },
        "timezone": { "type": "string", "title": "时区", "x-group": "调度配置", "default": "Asia/Shanghai" },
        "effectiveTime": {
          "type": "object", "title": "生效时段",
          "x-group": "调度配置",
          "properties": {
            "daysOfWeek": { "type": "array", "items": { "type": "integer" }, "title": "生效星期" },
            "startTime": { "type": "string", "format": "date-time", "title": "开始时间" },
            "endTime": { "type": "string", "format": "date-time", "title": "结束时间" }
          }
        }
      }
    }
  ]
}
```

自动渲染引擎产出的 UI：

```
┌─────────────────────────────────────────────┐
│  ▼ 触发器                                   │
│  │  触发类型: [数据变更 ▼]                    │  ← x-dictionary 填充
│  │  监听数据表: [客户表 ▼]                    │  ← x-component: EntitySelector
│  │  触发操作:  ☑ 新增  ☑ 更新  ☐ 删除         │  ← array + enum
│  │  过滤条件:  ┌─────────────────────┐       │  ← x-component: ConditionBuilder
│  │            │ 等级 = VIP          │       │
│  │            └─────────────────────┘       │
│  ▼ 高级配置                                 │
│  │  (切换触发类型后此处内容动态变化)            │
└─────────────────────────────────────────────┘
```

### 示例二：数据引擎字段配置

```jsonc
// 数据引擎提供的 Schema
{
  "type": "object",
  "title": "字段配置",
  "x-layout-mode": "groups",
  "properties": {
    "name": { "type": "string", "title": "字段名称", "x-group": "基础信息", "x-priority": 1 },
    "code": { "type": "string", "title": "字段编码", "x-group": "基础信息", "x-priority": 2,
      "x-validator": "^[a-zA-Z_][a-zA-Z0-9_]*$" },
    "type": { "type": "string", "title": "字段类型", "x-dictionary": "field_types",
      "x-group": "基础信息", "x-priority": 3, "x-component": "FieldTypeSelector" },
    "format": { "type": "string", "title": "格式化类型", "x-dictionary": "format_field_types",
      "x-group": "基础信息", "x-priority": 4,
      "x-visible": "type === 'string' || type === 'number'",
      "x-reactions": [
        { "target": "validation", "type": "schema", "expression": "getFieldValidationSchema(format)" }
      ] },
    "required": { "type": "boolean", "title": "必填", "x-group": "校验规则", "x-priority": 1 },
    "unique": { "type": "boolean", "title": "唯一", "x-group": "校验规则", "x-priority": 2 },
    "defaultValue": { "type": "string", "title": "默认值", "x-group": "校验规则", "x-priority": 3,
      "x-dataSource": "form" },
    "description": { "type": "string", "title": "字段说明", "x-group": "其他", "x-component": "textarea" }
  }
}
```

### 示例三：流程引擎节点表单配置

```jsonc
// 流程引擎提供的 Schema（审批节点的字段权限配置）
{
  "type": "object",
  "title": "节点表单权限",
  "x-layout-mode": "sections",
  "properties": {
    "inheritFrom": { "type": "string", "title": "继承自", "x-component": "FormSelector",
      "x-group": "表单来源" },
    "overrides": {
      "type": "array",
      "title": "字段权限",
      "x-group": "字段配置",
      "x-component": "NodeFormConfigurator",
      "items": {
        "type": "object",
        "properties": {
          "field": { "type": "string", "title": "字段", "x-component": "FormFieldSelector" },
          "permission": { "type": "string", "title": "权限", "x-dictionary": "field_permission_types" },
          "validation": { "type": "object", "title": "校验", "x-component": "ValidationRuleBuilder" },
          "label": { "type": "string", "title": "覆盖标签" }
        }
      }
    }
  }
}
```

---

## 渲染器 API

### 组件接口

```typescript
interface AutoFormRendererProps {
  /** JSON Schema（含 x-* 扩展字段） */
  schema: JSONSchema;
  /** 当前表单值 */
  value?: Record<string, any>;
  /** 值变更回调 */
  onChange?: (value: Record<string, any>) => void;
  /** 布局模式覆盖（优先于 schema 中的 x-layout-mode） */
  layoutMode?: 'tabs' | 'groups' | 'steps' | 'sections';
  /** 自定义控件注册（本次渲染生效） */
  controls?: Record<string, React.ComponentType<ControlProps>>;
  /** 字典服务实例 */
  dictionaryService?: DictionaryService;
  /** 变量数据源配置 */
  variableSources?: VariableSourceConfig;
  /** 校验错误 */
  errors?: Record<string, string[]>;
  /** 只读模式 */
  readOnly?: boolean;
}
```

### 使用方式

```tsx
// 各引擎使用自动渲染引擎的方式
import { AutoFormRenderer } from '@low-code/auto-rendering-engine';

function AutomationRuleEditor({ rule, onChange }) {
  // 引擎只需提供 Schema，表单 UI 自动生成
  const schema = useAutomationTriggerSchema(rule.type);

  return (
    <AutoFormRenderer
      schema={schema}
      value={rule.config}
      onChange={(config) => onChange({ ...rule, config })}
      controls={{
        EntitySelector,
        ConditionBuilder,
        CronEditor,
      }}
      variableSources={{ scope: 'automation' }}
    />
  );
}
```

---

## 与渲染引擎的关系

自动渲染引擎是平台基础能力层，渲染引擎的组件属性面板是其消费方之一。两者的关系：

```
自动渲染引擎 (基础能力)
    │
    ├── [子模块] 表单引擎 — 联动/校验/子表单/特殊控件
    │
    ├── 渲染引擎 — 组件属性面板、自定义卡片属性配置
    ├── 流程引擎 — 节点配置、表单权限配置
    ├── 自动化引擎 — 触发器/条件/动作配置
    ├── 数据引擎 — 字段类型配置、校验规则配置
    ├── 权限引擎 — 权限规则配置、数据范围配置
    └── 插件系统 — 插件配置、组件属性配置
```

渲染引擎中原来的 `TS → JSON Schema → 表单渲染` 管道迁移到自动渲染引擎统一管理，渲染引擎只负责：
1. 将组件 TS 类型定义编译为 JSON Schema（构建时）
2. 将编译结果注册到自动渲染引擎
3. 注册渲染引擎特有的自定义控件（组件选择器、样式编辑器等）

---

## Schema 注册中心

Schema 注册中心管理所有引擎的配置 Schema，支持注册、查询、版本管理。注册数据完全可序列化。

```typescript
interface SchemaRegistry {
  /** 注册 Schema */
  register(entry: SchemaRegistration): void;

  /** 按 ID 查询 */
  get(schemaId: string): SchemaRegistration | null;

  /** 按引擎查询 */
  listByEngine(engine: string): SchemaRegistration[];

  /** 按场景查询 */
  listByScene(scene: string): SchemaRegistration[];

  /** 更新 Schema（版本自增） */
  update(schemaId: string, schema: JSONSchema): void;

  /** 删除 */
  remove(schemaId: string): void;

  /** 导出全部（可序列化为 JSON） */
  export(): SchemaRegistration[];

  /** 导入 */
  import(entries: SchemaRegistration[]): void;
}

/** Schema 注册项 — 完全可序列化 */
interface SchemaRegistration {
  schemaId: string;                      // 全局唯一标识，如 "automation.trigger.data_change"
  engine: string;                        // 所属引擎，如 "automation", "workflow", "data"
  scene: string;                         // 场景标识，如 "trigger_config", "node_form"
  name: string;                          // 显示名称
  version: string;                       // 语义化版本
  schema: JSONSchema;                    // JSON Schema 定义（含 x-* 扩展字段）
  controls?: string[];                   // 依赖的自定义控件列表
}
```

---

## 校验机制

### 内置校验规则

自动渲染引擎内建以下校验规则，通过标准 JSON Schema 关键字和 `x-validator` 扩展触发：

| 规则 | JSON Schema 关键字 | 说明 |
|------|-------------------|------|
| 必填 | `required: ["fieldName"]` | 字段不可为空 |
| 类型 | `type: "string"` | 值类型校验 |
| 最小值 | `minimum: N` | 数值下限 |
| 最大值 | `maximum: N` | 数值上限 |
| 最小长度 | `minLength: N` | 字符串/数组最小长度 |
| 最大长度 | `maxLength: N` | 字符串/数组最大长度 |
| 正则 | `pattern: "^xxx$"` | 正则表达式匹配 |
| 枚举 | `enum: [...]` | 值在指定范围内 |
| 格式 | `format: "email"` | 内置格式校验（email/uri/date/ipv4 等） |
| 自定义 | `x-validator: "ruleName"` | 引用注册的自定义校验器 |

### 自定义校验器注册

```typescript
interface ValidatorRegistry {
  /** 注册自定义校验器 */
  register(name: string, validator: FieldValidator): void;

  /** 查询 */
  resolve(name: string): FieldValidator | null;
}

/** 字段校验器 — 可序列化描述 */
interface FieldValidator {
  name: string;                          // 校验器名称
  validate: string;                      // 校验函数标识（运行时从注册表解析执行）
  message: string;                       // 默认错误消息，支持 {{field}} 占位符
  params?: Record<string, any>;          // 校验器参数
}
```

### 校验生命周期

```
表单值变更 (onChange)
  │
  ▼
触发当前字段校验
  ├─ required 校验
  ├─ type / format 校验
  ├─ pattern / enum 校验
  └─ x-validator 自定义校验
  │
  ▼
收集错误 → errors: Record<string, string[]>
  │
  ▼
传递给 AutoFormRenderer → 对应字段展示错误提示

表单提交时 (onSubmit)
  │
  ▼
全量校验所有字段
  ├─ 遍历 schema.properties 中所有字段
  ├─ 执行 x-reactions 触发的联动校验
  └─ 汇总全部错误
  │
  ▼
无错误 → 触发 onSubmit 回调
有错误 → 阻止提交，展示所有错误
```

---

## 联动执行模型

### 执行机制

`x-reactions` 在以下时机触发求值：

1. **初始化时**：表单首次渲染，所有 reaction 依次执行一次
2. **依赖字段值变化时**：追踪 reaction 中引用的变量路径，仅触发受影响的 reaction

```typescript
/** 联动执行器 */
class ReactionExecutor {
  /** 解析所有 reaction 的依赖路径 */
  analyzeDependencies(schema: JSONSchema): Map<string, string[]>;

  /** 执行指定字段的所有 reaction */
  execute(fieldName: string, formValue: Record<string, any>, context: RenderContext): ReactionResult;

  /** 执行全部（初始化时调用） */
  executeAll(formValue: Record<string, any>, context: RenderContext): Map<string, ReactionResult>;
}

interface ReactionResult {
  target: string;                        // 目标字段
  changes: {
    value?: any;                         // 值变更
    visible?: boolean;                   // 显隐变更
    disabled?: boolean;                  // 禁用变更
    enum?: any[];                        // 枚举选项变更
    schema?: JSONSchema;                 // Schema 变更（type=schema 时）
  };
}
```

### 循环联动防护

```
执行 reaction 时
  │
  ├─ 检查当前执行栈是否已包含目标字段
  │   ├─ 是 → 跳过（打断循环），记录 warning
  │   └─ 否 → 正常执行
  │
  └─ 最大递归深度: 10（超出报错）
```

### 联动类型详解

| type | 说明 | expression 含义 |
|------|------|----------------|
| `value` | 更新目标字段值 | 表达式求值结果直接赋值 |
| `visible` | 控制目标字段显隐 | 表达式结果为 boolean |
| `disabled` | 控制目标字段禁用 | 表达式结果为 boolean |
| `enum` | 更新目标字段的枚举选项 | 表达式结果为 `Array<{label, value}>` |
| `schema` | 替换目标字段的 Schema | expression 为函数标识，返回新的 JSONSchema 片段 |

---

## 服务接口

### 字典服务

```typescript
interface DictionaryService {
  /** 获取字典值列表 */
  getDictValues(dictCode: string): Promise<DictItem[]>;

  /** 同步获取（已缓存时） */
  getDictValuesSync(dictCode: string): DictItem[] | null;

  /** 预加载字典（批量） */
  preload(dictCodes: string[]): Promise<void>;

  /** 监听字典变更 */
  onDictChange(dictCode: string, callback: (items: DictItem[]) => void): () => void;
}

interface DictItem {
  label: string;                         // 显示文本
  value: string | number;                // 值
  color?: string;                        // 标签颜色
  icon?: string;                         // 图标
  children?: DictItem[];                 // 子项（树形字典）
  disabled?: boolean;                    // 是否禁用
  extra?: Record<string, any>;           // 扩展数据
}
```

### 表达式引擎

```typescript
interface ExpressionEngine {
  /** 求值表达式 */
  evaluate(expression: string, context: Record<string, any>): any;

  /** 校验表达式语法 */
  validate(expression: string): { valid: boolean; errors: string[] };

  /** 分析表达式依赖的变量路径 */
  analyzeDependencies(expression: string): string[];

  /** 安全沙箱执行（限制执行时间） */
  safeEvaluate(expression: string, context: Record<string, any>, timeout?: number): any;
}
```

---

## 自定义控件注册时机

自定义控件只在**租户应用**的页面/卡片设计时出现，注册时机如下：

```
应用加载 / 页面打开
  │
  ▼
平台内建控件自动注册（VariableTreeSelector、ExpressionEditor、CodeEditor 等）
  │
  ▼
渲染引擎注册组件属性控件（ComponentSelector、StyleEditor、EventActionChainEditor 等）
  │
  ▼
当前应用页面使用的引擎按需注册
  ├─ 页面含自动化规则 → 注册 CronEditor、ConditionBuilder
  ├─ 页面含流程节点 → 注册 NodeFormConfigurator
  ├─ 页面含数据表 → 注册 FieldTypeSelector
  └─ ...
  │
  ▼
控件注册完成 → AutoFormRenderer 可渲染所有 Schema
```

控件注册是幂等操作，重复注册覆盖前者。注册失败（如控件实现加载失败）不影响其他控件，对应字段降级为默认控件（文本输入）。

---

## AutoFormRenderer 完整生命周期

```
挂载 (mount)
  │
  ├─ 解析 schema → 构建字段树
  ├─ 初始化 value → 合并 schema.default
  ├─ 注册 controls → 合并内建 + 外部控件
  ├─ 执行全部 x-reactions（初始化联动）
  └─ 执行全部 x-visible / x-disabled（初始化显隐/禁用）
  │
运行中 (runtime)
  │
  ├─ 字段值变更 (onChange)
  │   ├─ 更新内部值
  │   ├─ 触发该字段的 x-reactions
  │   ├─ 触发依赖该字段的其他字段 reactions
  │   ├─ 执行字段级校验
  │   └─ 向上冒泡 onChange(value)
  │
  ├─ 字段聚焦/失焦
  │   └─ 触发 onBlur 校验（如有）
  │
  └─ 外部 value 变更
      ├─ 更新内部值
      ├─ 重新执行受影响的 reactions
      └─ 重新评估 visible / disabled
  │
提交 (submit)
  │
  ├─ 全量校验
  ├─ 校验通过 → onSubmit(value)
  └─ 校验失败 → 展示错误，阻止提交
  │
卸载 (unmount)
  │
  └─ 清理 reaction 监听、字典订阅
```
