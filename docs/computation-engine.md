# 运算引擎 (Computation Engine)

平台统一的声明式数据运算引擎，基于 JavaScript 表达式语法，为各引擎提供一致的表达式求值能力。

> **本文档是平台表达式语言的权威规范**。所有引擎（渲染引擎、流程引擎、自动化引擎、表单引擎、数据引擎）中的表达式均遵循本规范定义的语法。

---

## 表达式语言规范

### 设计原则

- **统一语法**：全平台使用同一套 JavaScript 表达式语法，消除 SQL/JS/JSON 条件混用
- **沙箱安全**：表达式在受限沙箱中执行，禁止访问全局对象（`window`、`process`、`require` 等）
- **确定性**：相同输入始终产生相同输出，禁止使用 `Math.random()`、`Date.now()` 等非确定性 API

### 表达式类型

**普通模式**（设计器 UI 直接配置）：

| 类型 | 用途 | 示例 |
|------|------|------|
| **值表达式** | 计算一个值 | `quantity * unitPrice` |
| **条件表达式** | 求值为布尔值 | `amount > 10000 && status === 'vip'` |

**高级模式**（切换到代码编辑器，即 `ExpressionEditor` 组件）：

支持完整 JavaScript 表达式语法，存储格式统一为：

```typescript
{
  type: 'expression',
  value: string,    // 表达式内容（函数体）
  async: boolean    // 是否异步
}
```

### 变量注入

所有变量通过明确字段注入，不依赖隐式上下文（如 `this`）。各引擎在调用表达式时，将所需变量显式传入 context。

**系统内置变量**（全局可用）：

| 变量 | 说明 | 类型 |
|------|------|------|
| `$user` | 当前用户信息 | `{ id, name, roles, department, position }` |
| `$now` | 当前时间戳（Unix ms） | `number` |

**业务变量**：由各引擎通过 context 注入，如表单引擎注入 `$component`、`$route` 等页面变量。

### 运算符

#### 算术运算符

| 运算符 | 说明 | 示例 |
|--------|------|------|
| `+` | 加法 | `price + tax` |
| `-` | 减法 | `total - discount` |
| `*` | 乘法 | `quantity * unitPrice` |
| `/` | 除法 | `amount / count` |
| `%` | 取模 | `value % 2` |
| `**` | 幂运算 | `base ** exponent` |

#### 比较运算符

| 运算符 | 说明 | 示例 |
|--------|------|------|
| `===` | 严格相等 | `status === 'approved'` |
| `!==` | 严格不等 | `type !== 'draft'` |
| `>` | 大于 | `amount > 10000` |
| `>=` | 大于等于 | `age >= 18` |
| `<` | 小于 | `stock < 10` |
| `<=` | 小于等于 | `quantity <= maxLimit` |

#### 逻辑运算符

| 运算符 | 说明 | 示例 |
|--------|------|------|
| `&&` | 逻辑与 | `amount > 5000 && level === 'vip'` |
| `\|\|` | 逻辑或 | `isAdmin \|\| isOwner` |
| `!` | 逻辑非 | `!isEmpty(name)` |

### 条件表达式规范

各引擎中的条件表达式统一使用 JS 语法：

```javascript
// ✅ 正确 — JS 语法，变量通过 context 注入
amount > 10000 && status === 'confirmed'
customer.email.includes('@vip.com')
$now - createdAt > 30 * 24 * 3600 * 1000

// ❌ 错误 — 不再使用 SQL 语法
// SUM(orders.amount) WHERE orders.customer_id = record.id
// status = 'confirmed'
```

---

## 各引擎的表达式使用

### 流程引擎 — 条件分支

```jsonc
{
  "nodeId": "node_condition_01",
  "type": "condition",
  "name": "金额判断",
  "conditions": [
    {
      "branch": "high",
      "label": "大额订单",
      "expression": "amount > 50000"
    },
    {
      "branch": "vip",
      "label": "VIP 客户",
      "expression": "customerLevel === 'vip' || customerLevel === 'svip'"
    }
  ],
  "defaultBranch": "normal"
}
```

### 表单引擎 — 字段联动

```jsonc
{
  "type": "value",
  "trigger": { "field": "quantity", "field2": "unitPrice" },
  "target": { "field": "totalAmount" },
  "rule": {
    "type": "expression",
    "expression": "quantity * unitPrice"
  }
}
```

### 表单引擎 — 跨字段校验

```jsonc
{
  "name": "日期区间校验",
  "fields": ["startDate", "endDate"],
  "rule": "endDate >= startDate",
  "message": "结束日期不能早于开始日期"
}
```

### 自动化引擎 — 条件规则

自动化引擎支持两种条件模式，统一由运算引擎求值：

**模式一：表达式条件（推荐用于复杂逻辑）**

```jsonc
{
  "type": "expression",
  "expression": "record.amount > 10000 && record.status === 'confirmed'"
}
```

**模式二：结构化条件（推荐用于简单规则，支持 UI 可视化配置）**

```jsonc
{
  "logic": "and",
  "rules": [
    { "field": "record.amount", "operator": "gt", "value": 10000 },
    { "field": "record.status", "operator": "eq", "value": "confirmed" }
  ]
}
```

> 结构化条件在求值时由运算引擎转换为等价的 JS 表达式执行。`operator` 映射见下表：

| operator | JS 表达式 |
|----------|----------|
| `eq` | `===` |
| `ne` | `!==` |
| `gt` | `>` |
| `gte` | `>=` |
| `lt` | `< |
| `lte` | `<=` |
| `in` | `.includes()` |
| `not_in` | `!.includes()` |
| `contains` | `.includes()` |
| `is_empty` | `isEmpty()` |
| `is_not_empty` | `isNotEmpty()` |
| `between` | `>= && <=` |

---

## 表达式求值流程

```
┌──────────────┐
│ 表达式字符串  │  "amount > 10000 && status === 'vip'"
└──────┬───────┘
       ▼
┌──────────────┐
│ 词法分析      │  → Token 流: [amount, >, 10000, &&, status, ===, 'vip']
└──────┬───────┘
       ▼
┌──────────────┐
│ 语法分析      │  → AST (抽象语法树)
└──────┬───────┘
       ▼
┌──────────────┐
│ 安全检查      │  → 禁止访问全局对象、禁止危险函数
└──────┬───────┘
       ▼
┌──────────────┐
│ 变量绑定      │  → 注入 context 中的显式变量（$user、$now 等）
└──────┬───────┘
       ▼
┌──────────────┐
│ 沙箱求值      │  → 在隔离环境中执行 AST，返回结果
└──────┬───────┘
       ▼
┌──────────────┐
│ 类型转换      │  → 根据输出配置格式化结果
└──────────────┘
```

### 沙箱安全约束

| 约束 | 说明 |
|------|------|
| 禁止全局访问 | `window`、`global`、`process`、`require`、`import` 不可用 |
| 禁止原型链访问 | 不允许 `constructor`、`__proto__`、`prototype` 等访问 |
| 禁止副作用 | 不允许赋值（`=`）、`delete`、`new`（除 `new Date()`） |
| 执行超时 | `safeEvaluate` 通过 workerpool 在独立线程执行，超时 `pool.terminate(true)` 物理杀死线程（Node.js 和浏览器均有效） |
| 调用栈限制 | 递归深度上限 10 层 |

---

## 集成接口

### 求值 API

表达式引擎接口定义于 `packages/shared/src/engine/expression.ts`，通过 `@low-code/shared` 导出：

```typescript
interface ExpressionEngine {
  /** 求值表达式 */
  evaluate(expression: string, context: Record<string, unknown>): Promise<unknown>;
  /** 校验表达式语法 */
  validate(expression: string): { valid: boolean; errors: string[] };
  /** 分析表达式依赖的变量路径 */
  analyzeDependencies(expression: string): string[];
  /** 安全求值（带超时） */
  safeEvaluate(expression: string, context: Record<string, unknown>, timeout?: number): Promise<unknown>;
  /** 异步求值（接受字符串或 ExpressionBinding） */
  evaluateAsync(expression: string | ExpressionBinding, context: Record<string, unknown>, timeout?: number): Promise<unknown>;
  /** 解析模板字符串中的 {{path}} 变量 */
  resolveTemplate(template: string, context: Record<string, unknown>): string;
  /** 递归解析模板参数对象中的 {{path}} 变量 */
  resolveTemplateParams(params: Record<string, unknown>, context: Record<string, unknown>): Record<string, unknown>;
}
```

全局单例：

```typescript
import { expressionEngine } from '@low-code/shared';
```

工厂函数（带自定义配置）：

```typescript
import { createExpressionEngine } from '@low-code/shared';
const engine = createExpressionEngine({ defaultTimeout: 3000, strictMode: true });
```

---

## 与现有模块的关系

### 模块职责划分

| 包 | 职责 |
|---|------|
| `@low-code/shared`（`engine/expression.ts`） | **表达式引擎**：表达式求值、校验、依赖分析、模板解析。全局单例 `expressionEngine` |
| `@low-code/computation`（`operators.ts`） | **条件运算符**：结构化条件规则的比较运算（eq/gt/contains 等），供自动化引擎和流程引擎的结构化条件使用 |

### 各引擎的表达式使用

| 引擎 | 关系 |
|------|------|
| **流程引擎** | 条件分支、排他网关的条件表达式由表达式引擎求值；结构化条件由 `evaluateCondition` 运算 |
| **表单引擎** | 字段联动规则、跨字段校验、计算字段由表达式引擎求值 |
| **自动化引擎** | 结构化条件由 `evaluateCondition` 运算；表达式条件和动作中的变量插值由表达式引擎处理 |
| **数据引擎** | 数据表字段的计算字段由表达式引擎求值 |
| **渲染引擎** | 条件规则（显隐/禁用）中的表达式由表达式引擎求值 |
| **权限引擎** | 自定义数据权限规则中的条件表达式由表达式引擎求值 |

---

## 运算设计器

运算设计器是运算引擎的可视化配置工具，允许用户通过图形界面创建和编辑计算字段/公式规则。

### 功能特性

- **4 种运算类型**：字段计算、公式规则、聚合计算、数据转换
- **输入字段配置**：手动定义变量名、类型、描述
- **表达式编辑器**：复用 ExpressionEditor 组件，支持语法高亮、自动补全、类型推断
- **环境变量过滤**：只保留系统基础变量（`$user`、`$now`、`$env`），去掉页面相关变量
- **输出配置**：支持多种数据类型和格式化选项（货币、百分比、日期等）
- **预览功能**：实时预览运算结果，支持测试数据输入
- **流程节点引用**：流程计算节点可选择已定义的运算规则

### 路由格式

```
/:tenantId/designer/computations/:computationId
```

### 数据结构

```typescript
interface ComputationSchema {
  /** Schema 版本号 */
  schemaVersion: number;
  /** 业务版本号（乐观锁） */
  version: number;
  /** 运算规则 ID */
  computationId: string;
  /** 所属应用 ID */
  appId: string;
  /** 规则标题 */
  name: string;
  /** 规则描述 */
  description?: string;
  /** 运算类型：field | formula | aggregation | transform */
  type: ComputationType;
  /** 状态：draft | active | disabled */
  status: ComputationStatus;
  /** 输入字段列表 */
  inputs: ComputationInput[];
  /** 表达式（PropValue 格式） */
  expression: ExpressionBinding;
  /** 输出配置 */
  output: ComputationOutput;
  /** 关联数据表 ID */
  tableId?: string;
  /** 资源引用声明 */
  references?: { tables?: string[] };
  /** 创建/更新信息 */
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

interface ComputationInput {
  /** 字段标识（用于表达式中引用） */
  key: string;
  /** 显示名称 */
  label: string;
  /** 字段类型 */
  fieldType: 'string' | 'number' | 'boolean' | 'date' | 'json';
  /** 是否必填 */
  required?: boolean;
  /** 默认值 */
  defaultValue?: unknown;
  /** 字段描述 */
  description?: string;
}

interface ComputationOutput {
  /** 输出字段名 */
  name: string;
  /** 输出类型 */
  type: 'string' | 'number' | 'boolean' | 'date' | 'json';
  /** 格式化（如 currency、percentage、date） */
  format?: string;
  /** 小数精度（数字类型） */
  precision?: number;
  /** 描述 */
  description?: string;
}

/** 表达式绑定（PropValue 格式） */
interface ExpressionBinding {
  type: 'expression';
  value: string;   // 表达式内容
  async?: boolean;  // 是否异步（运算表达式默认 false）
}
```

### 环境变量

运算表达式只支持以下环境变量：

| 变量 | 说明 |
|------|------|
| `$user.id` | 当前用户 ID |
| `$user.name` | 当前用户姓名 |
| `$user.roles` | 用户角色列表 |
| `$user.department` | 部门 ID |
| `$user.departmentName` | 部门名称 |
| `$user.position` | 岗位名称 |
| `$now` | 当前时间戳（Unix ms） |
| `$env.NODE_ENV` | 运行环境 |

> **注意**：运算表达式不支持 `$component`、`$route`、`$data`、`$table`、`$fetch`、`$workflow` 等页面相关变量。

### API 接口

所有运算接口统一走应用路由，路径格式：`/api/apps/:appId/computations`

#### 列表查询

```http
GET /api/apps/:appId/computations

Response:
{
  "success": true,
  "data": [ComputationSchema, ...]
}
```

#### 获取详情

```http
GET /api/apps/:appId/computations/:id

Response:
{
  "success": true,
  "data": ComputationSchema
}
```

#### 创建

```http
POST /api/apps/:appId/computations
Content-Type: application/json

{
  "name": "订单金额计算",
  "description": "根据数量和单价计算订单金额",
  "type": "field",
  "inputs": [
    { "key": "quantity", "label": "数量", "fieldType": "number" },
    { "key": "unitPrice", "label": "单价", "fieldType": "number" }
  ],
  "expression": { "type": "expression", "value": "quantity * unitPrice", "async": false },
  "output": { "name": "totalAmount", "type": "number", "format": "currency" }
}

Response:
{
  "success": true,
  "data": ComputationSchema
}
```

#### 更新

```http
PUT /api/apps/:appId/computations/:id
Content-Type: application/json

{ ... }

Response:
{
  "success": true,
  "data": ComputationSchema
}
```

#### 删除

```http
DELETE /api/apps/:appId/computations/:id

Response:
{
  "success": true
}
```

#### 执行运算

```http
POST /api/apps/:appId/computations/:id/execute
Content-Type: application/json

{
  "params": {
    "quantity": 10,
    "unitPrice": 99.9
  }
}

Response:
{
  "success": true,
  "result": 999,
  "duration": 5
}
```

#### 预览表达式

```http
POST /api/apps/:appId/computations/preview
Content-Type: application/json

{
  "expression": "quantity * unitPrice",
  "context": { "quantity": 10, "unitPrice": 99.9 },
  "outputType": "number"
}

Response:
{
  "success": true,
  "result": 999,
  "duration": 3
}
```

### 设计器界面

运算设计器采用卡片式布局，包含以下区域：

1. **基本信息卡片**：运算名称、类型、状态、描述
2. **输入字段卡片**：变量名、显示名称、字段类型、是否必填
3. **表达式卡片**：表达式内容预览、编辑按钮（使用阉割版 ExpressionEditor）
4. **输出配置卡片**：字段名、类型、格式化选项
5. **预览结果卡片**：运算结果展示（调用预览 API 后显示）

### 流程节点集成

流程计算节点支持两种模式：

1. **自定义表达式**：直接编写表达式（原有模式）
2. **选择运算规则**：从运算中心选择已定义的规则，配置参数映射

#### 运算规则选择器

`ComputationSelector` 组件提供规则选择功能：
- 从 API 加载状态为 `active` 的运算规则
- 显示规则名称、类型、描述
- 支持搜索过滤

#### 参数映射

选择运算规则后，需要配置参数映射，将流程变量映射到运算规则的输入字段。

### 与其他模块的集成

- **表达式引擎**：复用 ExpressionEditor 组件，支持完整的表达式语法
- **运算执行器**：统一使用 `@low-code/shared` ExpressionEngine，支持沙箱执行和超时保护
- **流程引擎**：计算节点可选择运算规则，运行时传入参数执行
