# 运算引擎 (Computation Engine)

平台统一的声明式数据运算引擎，基于 JavaScript 表达式语法，为各引擎提供一致的表达式求值能力。

> **本文档是平台表达式语言的权威规范**。所有引擎（渲染引擎、流程引擎、自动化引擎、表单引擎、数据引擎）中的表达式均遵循本规范定义的语法。

---

## 表达式语言规范

### 设计原则

- **统一语法**：全平台使用同一套 JavaScript 表达式语法，消除 SQL/JS/JSON 条件混用
- **沙箱安全**：表达式在受限沙箱中执行，禁止访问全局对象（`window`、`process`、`require` 等）
- **类型感知**：运算引擎感知字段的格式化类型（`email`、`currency` 等），提供语义化运算
- **确定性**：相同输入始终产生相同输出，禁止使用 `Math.random()`、`Date.now()` 等非确定性 API

### 表达式类型

| 类型 | 用途 | 示例 |
|------|------|------|
| **值表达式** | 计算一个值 | `quantity * unitPrice` |
| **条件表达式** | 求值为布尔值 | `amount > 10000 && status === 'vip'` |
| **聚合表达式** | 对集合数据做聚合计算 | `SUM(items.amount)` |
| **管道表达式** | 链式数据变换 | `orders.filter(o => o.status === 'completed').map(o => o.amount)` |

### 变量作用域

| 变量 | 说明 | 可用场景 |
|------|------|---------|
| `this` | 当前记录 | 实体字段计算、表单联动 |
| `this.fieldName` | 当前记录的字段值 | 所有场景 |
| `record` | 同 `this`，别名 | 自动化引擎事件上下文 |
| `event` | 事件数据 | 自动化引擎动作配置 |
| `event.data.record` | 事件触发的记录数据 | 自动化引擎条件/动作 |
| `currentUser` | 当前用户信息 | 条件表达式、显示逻辑 |
| `currentDate` | 当前日期（`Date` 对象） | 日期运算 |

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

#### 字符串运算符

| 方法 | 说明 | 示例 |
|------|------|------|
| `.includes(sub)` | 包含 | `email.includes('@vip.com')` |
| `.startsWith(prefix)` | 前缀匹配 | `code.startsWith('ORD-')` |
| `.endsWith(suffix)` | 后缀匹配 | `file.endsWith('.pdf')` |
| `.match(pattern)` | 正则匹配 | `phone.match(/^1[3-9]\d{9}$/)` |

### 内置函数

#### 聚合函数（用于集合数据）

| 函数 | 说明 | 示例 |
|------|------|------|
| `SUM(array, field?)` | 求和 | `SUM(items, 'amount')` 或 `SUM(items.amount)` |
| `AVG(array, field?)` | 平均值 | `AVG(scores, 'value')` |
| `COUNT(array, filter?)` | 计数 | `COUNT(items)` 或 `COUNT(items, i => i.price > 100)` |
| `MAX(array, field?)` | 最大值 | `MAX(orders, 'amount')` |
| `MIN(array, field?)` | 最小值 | `MIN(orders, 'amount')` |
| `COUNT_DISTINCT(array, field?)` | 去重计数 | `COUNT_DISTINCT(orders, 'customerId')` |

#### 类型函数

| 函数 | 说明 | 示例 |
|------|------|------|
| `isEmpty(value)` | 判断空值（null/undefined/空字符串/空数组） | `isEmpty(this.remark)` |
| `isNotEmpty(value)` | 判断非空 | `isNotEmpty(this.phone)` |
| `typeof(value)` | 类型判断 | `typeof(this.amount) === 'number'` |
| `toString(value)` | 转字符串 | `toString(this.orderNo)` |
| `toNumber(value)` | 转数字 | `toNumber(this.quantity)` |

#### 日期函数

| 函数 | 说明 | 示例 |
|------|------|------|
| `NOW()` | 当前时间 | `this.expireDate < NOW()` |
| `TODAY()` | 今天日期 | `this.startDate >= TODAY()` |
| `DAYS_BETWEEN(d1, d2)` | 两日期之间的天数 | `DAYS_BETWEEN(this.endDate, this.startDate)` |
| `ADD_DAYS(date, n)` | 日期加 N 天 | `ADD_DAYS(this.createdAt, 30)` |
| `FORMAT_DATE(date, pattern)` | 格式化日期 | `FORMAT_DATE(this.createdAt, 'YYYY-MM-DD')` |

#### 字符串函数

| 函数 | 说明 | 示例 |
|------|------|------|
| `UPPER(str)` | 转大写 | `UPPER(this.code)` |
| `LOWER(str)` | 转小写 | `LOWER(this.email)` |
| `TRIM(str)` | 去除首尾空格 | `TRIM(this.name)` |
| `SUBSTRING(str, start, end)` | 截取子串 | `SUBSTRING(this.phone, 0, 3)` |
| `CONCAT(...strs)` | 拼接字符串 | `CONCAT(this.firstName, ' ', this.lastName)` |
| `REPLACE(str, search, replacement)` | 替换 | `REPLACE(this.address, ' ', '')` |

#### 数学函数

| 函数 | 说明 | 示例 |
|------|------|------|
| `ROUND(number, decimals?)` | 四舍五入 | `ROUND(this.amount, 2)` |
| `CEIL(number)` | 向上取整 | `CEIL(this.pages)` |
| `FLOOR(number)` | 向下取整 | `FLOOR(this.discount)` |
| `ABS(number)` | 绝对值 | `ABS(this.difference)` |
| `MAX(...numbers)` | 最大值 | `MAX(this.score1, this.score2)` |
| `MIN(...numbers)` | 最小值 | `MIN(this.price, this.maxPrice)` |

### 属性访问

| 语法 | 说明 | 示例 |
|------|------|------|
| `this.field` | 访问当前记录字段 | `this.amount` |
| `this.nested.field` | 嵌套字段访问 | `this.address.city` |
| `this.array[index]` | 数组索引访问 | `this.items[0].name` |
| `this.array.length` | 数组长度 | `this.items.length` |
| `this.array[N].field` | 数组元素字段 | `this.items[0].quantity` |

### 条件表达式规范

各引擎中的条件表达式统一使用 JS 语法：

```javascript
// ✅ 正确 — JS 语法
amount > 10000 && status === 'confirmed'
customer.email.includes('@vip.com')
DAYS_BETWEEN(NOW(), this.createdAt) > 30

// ❌ 错误 — 不再使用 SQL 语法
// SUM(orders.amount) WHERE orders.customer_id = this.id
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
      "expression": "this.amount > 50000"
    },
    {
      "branch": "vip",
      "label": "VIP 客户",
      "expression": "this.customerLevel === 'vip' || this.customerLevel === 'svip'"
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

### 应用管理 — 计算字段

```jsonc
{
  "fieldId": "field_order_amount",
  "name": "累计订单金额",
  "code": "order_amount",
  "type": "number",
  "format": "currency",
  "computed": true,
  "expression": "SUM(orders.filter(o => o.customer_id === this.id), 'amount')"
}
```

### 数据引擎 — 类型感知运算

格式化字段类型通过 `computation` 配置声明支持的运算，运算引擎据此提供类型感知的计算：

```jsonc
// 金额字段 (currency)
{
  "computation": {
    "aggregations": ["sum", "avg", "min", "max"],
    "operations": ["equal", "not_equal", "gt", "gte", "lt", "lte", "between"],
    "casters": { "number": "toNumber", "string": "formatCurrency" }
  }
}

// 邮箱字段 (email)
{
  "computation": {
    "aggregations": ["count", "count_distinct"],
    "operations": ["equal", "not_equal", "contains", "ends_with", "domain"],
    "casters": { "string": "toString" }
  }
}
```

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
│ 变量绑定      │  → 注入 this/record/event/currentUser 等上下文变量
└──────┬───────┘
       ▼
┌──────────────┐
│ 沙箱求值      │  → 在隔离环境中执行 AST，返回结果
└──────┬───────┘
       ▼
┌──────────────┐
│ 类型转换      │  → 根据字段格式化类型格式化输出
└──────────────┘
```

### 沙箱安全约束

| 约束 | 说明 |
|------|------|
| 禁止全局访问 | `window`、`global`、`process`、`require`、`import` 不可用 |
| 禁止 `this` 逃逸 | 不允许 `this.constructor`、`this.__proto__` 等原型链访问 |
| 禁止副作用 | 不允许赋值（`=`）、`delete`、`new`（除 `new Date()`） |
| 执行超时 | 单次表达式求值超时 100ms 自动终止 |
| 调用栈限制 | 递归深度上限 10 层 |

---

## 集成接口

### 求值 API

```typescript
interface ComputationEngine {
  /**
   * 求值表达式
   * @param expression JS 表达式字符串
   * @param context 变量上下文
   * @param options 求值选项
   */
  evaluate<T = any>(
    expression: string,
    context: EvalContext,
    options?: EvalOptions
  ): Promise<T>;

  /**
   * 批量求值（共享编译缓存）
   */
  evaluateBatch<T = any>(
    expressions: { id: string; expression: string }[],
    context: EvalContext,
    options?: EvalOptions
  ): Promise<Map<string, T>>;

  /**
   * 校验表达式语法（不求值）
   */
  validate(expression: string): ValidationResult;

  /**
   * 分析表达式依赖的字段
   */
  analyzeDependencies(expression: string): string[];
}

interface EvalContext {
  /** 当前记录数据 */
  this?: Record<string, any>;
  /** 别名 */
  record?: Record<string, any>;
  /** 事件数据 */
  event?: { type: string; data: Record<string, any> };
  /** 当前用户 */
  currentUser?: { id: string; name: string; roles: string[] };
  /** 关联数据 */
  relations?: Record<string, any[]>;
}

interface EvalOptions {
  /** 求值超时（ms），默认 100 */
  timeout?: number;
  /** 期望返回类型 */
  expectedType?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** 是否允许聚合函数（集合场景才开启） */
  allowAggregation?: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors?: { message: string; position?: { line: number; column: number } }[];
  warnings?: { message: string }[];
}
```

---

## 与现有模块的关系

| 模块 | 关系 |
|------|------|
| **流程引擎** | 条件分支、排他网关的条件表达式由运算引擎求值 |
| **表单引擎** | 字段联动规则、跨字段校验、计算字段由运算引擎求值 |
| **自动化引擎** | 结构化条件转换为 JS 表达式后由运算引擎求值；动作中的变量插值也由运算引擎处理 |
| **数据引擎** | 格式化字段类型的 `computation` 配置定义该类型支持的运算，运算引擎据此提供类型感知计算 |
| **渲染引擎** | 条件规则（显隐/禁用）中的表达式由运算引擎求值 |
| **权限引擎** | 自定义数据权限规则中的条件表达式由运算引擎求值 |
