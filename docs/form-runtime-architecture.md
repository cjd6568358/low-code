# 表单运行时架构 (Form Runtime Architecture)

表单运行时的核心实现方案，涵盖**初始值注入**、**联动执行引擎**、**组件事件桥接**三大机制。
本文档是 [表单引擎](form-engine.md) 的实现层补充，侧重运行时行为而非 Schema 定义。

## 定位与关系

```
┌─────────────────────────────────────────────────────────────────┐
│                        渲染引擎 (render-engine)                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    运行时渲染器                              │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              表单运行时 (本文档)                       │  │  │
│  │  │                                                     │  │  │
│  │  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │  │  │
│  │  │  │ 初始值注入   │  │ 联动执行引擎 │  │ 组件事件桥接  │  │  │  │
│  │  │  │            │  │            │  │ + 动作系统    │  │  │  │
│  │  │  └────────────┘  └────────────┘  └──────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

| 关联文档 | 关系 |
|---------|------|
| [表单引擎 (form-engine)](form-engine.md) | Schema 层定义（联动规则、校验规则、子表单结构），本文档负责运行时执行 |
| [渲染引擎 (render-engine)](render-engine.md) | 定义 BaseProps、属性面板、运行时渲染器架构，本文档聚焦表单容器内部 |
| [数据引擎 (data-engine)](data-engine.md) | 提供格式化字段类型注册表，表单运行时消费字段类型映射关系 |
| [运算引擎 (computation-engine)](computation-engine.md) | 联动表达式和子表单汇总的计算执行依赖运算引擎 |
| [流程引擎 (workflow-engine)](workflow-engine.md) | 流程节点表单的数据来源（快照表）由本文档的初始值注入机制处理 |
| [权限引擎 (permission-engine)](permission-engine.md) | 字段级权限（只读/隐藏）在运行时通过属性联动机制落实 |

---

## 一、初始值注入

### 1.1 数据来源分类

| 来源 | 场景 | 数据获取方式 | 优先级 |
|------|------|-------------|--------|
| **默认值** | 新建表单 | Schema 中的 `default` / `defaultValueExpression` | 最低 |
| **URL 参数** | 通过链接预填 | 从 `location.search` 或 `location.hash` 解析 | 低 |
| **草稿数据** | 恢复未完成的填写 | localStorage / 服务端草稿接口 | 中 |
| **业务数据** | 编辑已有记录 | 根据 `recordId` 调用数据引擎接口 | 高 |
| **快照数据** | 流程审批节点 | 根据 `snapshotId` 从快照表加载 | 最高 |

### 1.2 FormDataContext 数据模型

表单运行时维护一个统一的上下文对象，贯穿表单整个生命周期：

```typescript
interface FormDataContext {
  /** 当前实时值（联动引擎持续更新） */
  values: Record<string, any>;

  /** 初始值快照（仅在加载时注入，后续不变，用于重置对比） */
  initialValues: Record<string, any>;

  /** 数据来源标记 */
  source: 'new' | 'edit' | 'draft' | 'snapshot';

  /** 元信息 */
  meta: {
    recordId?: string;       // 编辑模式下的记录 ID
    draftId?: string;        // 草稿 ID
    snapshotId?: string;     // 流程快照 ID
    formId: string;          // 表单 Schema ID
    loadedAt: number;        // 加载完成时间戳
  };

  /** 表单实例引用（用于调用校验、提交等方法） */
  formRef: FormInstance;
}
```

### 1.3 初始值加载时序

```
渲染器挂载
    │
    ├─ 1. 解析页面 Schema，收集所有表单字段定义
    │
    ├─ 2. 确定数据来源
    │     ├─ 路由参数含 recordId   → source = 'edit'
    │     ├─ 路由参数含 snapshotId → source = 'snapshot'
    │     ├─ 检测到未提交草稿       → source = 'draft'
    │     └─ 均无                  → source = 'new'
    │
    ├─ 3. 按来源加载数据
    │     ├─ new      → defaultValues + URL params
    │     ├─ edit     → API: GET /api/{entity}/{recordId}
    │     ├─ draft    → localStorage / API: GET /api/drafts/{draftId}
    │     └─ snapshot → API: GET /api/snapshots/{snapshotId}
    │
    ├─ 4. 数据合并（按优先级覆盖）
    │     finalValues = {
    │       ...defaultValues,        // Schema 默认值（最低）
    │       ...urlParams,            // URL 参数
    │       ...draftData,            // 草稿数据
    │       ...recordData / snapshotData,  // 业务数据 / 快照数据（最高）
    │     }
    │
    ├─ 5. 写入 FormDataContext
    │     context.values = finalValues
    │     context.initialValues = deepClone(finalValues)
    │
    └─ 6. 执行初始化联动（静默模式）
          · 按 DAG 拓扑序计算所有依赖关系
          · 仅更新 values，不触发 onChange 回调
          · 不触发校验
          → 表单就绪
```

### 1.4 Schema 中的默认值定义

```jsonc
{
  "field": "orderDate",
  "type": "datepicker",
  "label": "订单日期",
  // 静态默认值
  "default": "2024-01-01"
}
```

```jsonc
{
  "field": "applicant",
  "type": "input",
  "label": "申请人",
  // 动态默认值：表达式，初始化时由运算引擎求值
  "defaultValueExpression": "currentUser().name"
}
```

```jsonc
{
  "field": "department",
  "type": "select",
  "label": "部门",
  // 默认值可依赖其他字段（需保证被依赖字段先初始化，由拓扑序保证）
  "defaultValueExpression": "currentUser().departmentId"
}
```

### 1.4.1 表单预求值机制

组件 props 中的 `initialValue` 支持 `PropValue` 格式（字面量/变量引用/表达式）。当 `initialValue` 为异步表达式时，存在时序问题：antd `Form.Item` 只在首次挂载时读取 `initialValue`，但异步表达式此时还未求值。

**解决方案**：表单渲染前统一预求值所有子组件的表达式，`Form.Item` 挂载时就有正确值。

#### 预求值流程

```
FormWithProvider 挂载
  │
  ├─ 1. preEvaluateForm() 扫描所有子组件 props
  │     └─ 收集 expression bindings（如 initialValue: { type: 'expression', ... }）
  │
  ├─ 2. 按依赖拓扑排序
  │     └─ 无 $component 依赖的先求值，有依赖的后求值
  │
  ├─ 3. 批量求值（同步 safeEvaluate，异步 await evaluateAsync）
  │     └─ 结果写入 BindingCache（模块级表达式结果缓存）
  │
  ├─ 4. form.setFieldsValue(预求值结果)
  │
  ├─ 5. preEvalReady = true → 渲染子组件
  │     └─ 子组件 useBindings 查 BindingCache → 命中 → 直接复用，不重复计算
  │
  └─ 6. handleValuesChange 捕获初始值 → initialValuesRef
        └─ resetForm 恢复到 initialValuesRef
```

#### 核心模块

| 模块 | 职责 |
|------|------|
| `BindingCache` | 模块级表达式结果缓存，key = `componentId.propKey` |
| `FormPreEvaluator` | 扫描子组件 → 依赖排序 → 批量求值 → 写入缓存 |
| `useBindings` | 表达式求值前查 `BindingCache`，命中直接复用 |
| `FormWithProvider` | 调用 `preEvaluateForm`，预求值期间显示 loading |

#### 预求值期间的 UI

`FormWithProvider` 始终渲染 `<Form>` 元素（确保 `formInstance` 关联），预求值期间子内容显示 `<Spin>`，求值完成后切换为真正的 `children`。

```jsonc
// Schema 示例：initialValue 为异步表达式
{
  "id": "input_01",
  "type": "input",
  "props": {
    "label": "输入框_01",
    "initialValue": {
      "type": "expression",
      "value": "return $route.query.a",
      "async": true
    }
  }
}
```

#### 与 useBindings 的关系

预求值调用的是和 `useBindings` 相同的表达式引擎，结果写入共享的 `BindingCache`。子组件渲染时 `useBindings` 查缓存命中，直接复用结果，依赖变更时缓存失效重新求值。预求值是"提前调用 useBindings 的逻辑"，不是绕过它。

### 1.5 流程节点表单的初始值

流程审批节点嵌入的表单，数据来源固定为快照表，且需叠加字段级权限：

```
快照表数据
    │
    ▼
┌──────────────────────────────────────────┐
│  字段权限叠加（来自权限引擎）               │
│                                          │
│  字段         权限        初始值处理        │
│  ─────────   ──────     ──────────────   │
│  orderNo     readonly   填入，不可编辑     │
│  amount      readonly   填入，不可编辑     │
│  opinion     editable   填入（上节点值）    │
│              或为空       用户可修改        │
│  remark      editable   空，用户填写       │
│  secretField hidden     不渲染             │
└──────────────────────────────────────────┘
```

加载时序：

1. 根据 `snapshotId` 加载快照数据
2. 根据节点配置获取字段权限列表
3. 权限为 `hidden` 的字段从 values 中移除
4. 权限为 `readonly` 的字段标记 `disabled: true`
5. 权限为 `editable` 的字段正常填入，用户可修改
6. 执行初始化联动

---

## 二、联动执行引擎

### 2.1 引擎架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LinkageEngine                                 │
│                                                                     │
│  ┌──────────────┐                                                   │
│  │  触发索引层    │  field → LinkageRule[]                           │
│  │  (triggerIndex)│  字段变化时 O(1) 查找需要执行的规则                │
│  └──────┬───────┘                                                   │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────┐                                                   │
│  │  DAG 依赖图   │  构建字段间的有向依赖关系                           │
│  │              │  启动时拓扑排序，检测循环依赖                        │
│  └──────┬───────┘                                                   │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────┐    ┌──────────────────────────────────────────┐   │
│  │  执行调度器    │───▶│ 按拓扑序依次执行规则                       │   │
│  │              │    │ 同一触发批次内，每条规则只执行一次            │   │
│  └──────┬───────┘    └──────────────────────────────────────────┘   │
│         │                                                           │
│         ▼                                                           │
│  ┌───────────────────────────────────────────────────────────────────────────┐   │
│  │  规则执行器（按类型分发）                                                  │   │
│  │                                                                         │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │   │
│  │  │ 值联动      │ │ 条件赋值    │ │ 选项联动    │ │ 显隐联动    │ │ 属性联动   │ │   │
│  │  │ map        │ │ conditional│ │ query      │ │ condition  │ │ setter    │ │   │
│  │  │ expression │ │ branches   │ │            │ │            │ │           │ │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └───────────┘ │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────┐                                                   │
│  │  批量更新层    │  收集本轮所有字段变更，合并为一次 setState          │
│  │  (batchUpdate)│  避免级联传播导致的多次 re-render                  │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 触发索引构建

```typescript
class LinkageEngine {
  /** field name → 该字段变化时需触发的规则列表 */
  private triggerIndex: Map<string, LinkageRule[]> = new Map();

  /** field name → 该字段被哪些规则依赖（用于显隐/属性联动的反向查找） */
  private dependencyIndex: Map<string, LinkageRule[]> = new Map();

  /** 拓扑排序后的执行顺序 */
  private executionOrder: string[] = [];

  /**
   * 初始化：遍历所有联动规则，建立索引
   * 在表单 Schema 加载后调用一次
   */
  init(rules: LinkageRule[]): void {
    for (const rule of rules) {
      // 处理多字段触发（如 quantity + unitPrice → totalAmount）
      const triggerFields = rule.trigger.field2
        ? [rule.trigger.field, rule.trigger.field2]
        : [rule.trigger.field];

      for (const field of triggerFields) {
        this.addToIndex(this.triggerIndex, field, rule);
      }

      // ── 条件赋值：从 condition 表达式中提取隐式依赖 ──
      if (rule.rule.type === 'conditional') {
        for (const branch of rule.rule.branches) {
          // condition 表达式可能引用了 trigger 中未声明的字段
          const deps = computationEngine.analyzeDependencies(branch.condition);
          for (const dep of deps) {
            if (!triggerFields.includes(dep)) {
              this.addToIndex(this.triggerIndex, dep, rule);
            }
          }
          // valueType=expression 时，value 也可能依赖其他字段
          if (branch.valueType === 'expression') {
            const valueDeps = computationEngine.analyzeDependencies(branch.value);
            for (const dep of valueDeps) {
              if (!triggerFields.includes(dep)) {
                this.addToIndex(this.triggerIndex, dep, rule);
              }
            }
          }
        }
      }

      // 建立目标字段的反向依赖
      this.addToIndex(this.dependencyIndex, rule.target.field, rule);
    }

    // 构建 DAG 并检测循环依赖
    this.buildDAG(rules);
    this.executionOrder = this.topologicalSort();
  }

  /**
   * 递归收集：当 field 变化时，所有直接和间接受影响的字段
   * 用于显隐联动等需要重新计算整条链的场景
   */
  getAffectedFields(field: string): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const traverse = (f: string) => {
      if (visited.has(f)) return;
      visited.add(f);

      const rules = this.triggerIndex.get(f) || [];
      for (const rule of rules) {
        if (!visited.has(rule.target.field)) {
          result.push(rule.target.field);
          traverse(rule.target.field); // 递归找下游
        }
      }
    };

    traverse(field);
    return result;
  }
}
```

### 2.3 联动规则执行

#### 值联动

```typescript
private executeValueLinkage(rule: LinkageRule, values: Record<string, any>): any {
  const { rule: linkRule } = rule;

  switch (linkRule.type) {
    // ── 静态映射 ──
    // 场景：省份 → 区号、状态码 → 状态文本
    case 'map': {
      const triggerValue = values[rule.trigger.field];
      return linkRule.mapping[String(triggerValue)];
    }

    // ── 表达式计算 ──
    // 场景：数量 × 单价 = 金额、结束日期 - 开始日期 = 天数
    case 'expression': {
      // 通过运算引擎求值，支持 Math、Date 等内置函数
      return computationEngine.evaluate(linkRule.expression, values);
    }

    // ── 条件分支赋值 ──
    // 场景：客户等级+金额 → 折扣率、区域 → 负责人
    case 'conditional': {
      return this.executeConditionalLinkage(linkRule, values);
    }

    // ── 异步查询 ──
    // 场景：选择产品后自动填充单价
    case 'query': {
      const result = await dataEngine.query({
        dataSource: linkRule.dataSource,
        filter: this.resolveTemplate(linkRule.filter, values),
        labelField: linkRule.labelField,
        valueField: linkRule.valueField,
      });
      return result;
    }
  }
}
```

#### 条件赋值联动

```typescript
interface ConditionalBranch {
  /** 条件表达式（JS 语法，由运算引擎求值） */
  condition: string;
  /** 赋值：字面量、表达式或变量路径 */
  value: any;
  /** 值类型：literal=字面量 | expression=表达式 | variable=变量路径 */
  valueType?: 'literal' | 'expression' | 'variable';
}

interface ConditionalRule {
  type: 'conditional';
  /** 条件分支列表，按顺序匹配，命中第一个即返回 */
  branches: ConditionalBranch[];
  /** 兜底值（所有分支均未命中时使用） */
  default?: any;
}

/**
 * 条件赋值执行器
 * 按 branches 顺序逐条求值 condition，命中即返回对应 value
 * 支持三种赋值模式：
 *   literal   — 直接返回字面量（0.85、"VIP" 等）
 *   expression — 通过运算引擎求值（如 "price * 0.8"）
 *   variable  — 按路径从上下文中取值（如 "currentUser.department.manager"）
 */
private async executeConditionalLinkage(
  rule: ConditionalRule,
  values: Record<string, any>
): Promise<any> {
  const context = this.buildEvalContext(values);

  for (const branch of rule.branches) {
    const matched = await computationEngine.evaluate<boolean>(
      branch.condition,
      context,
      { expectedType: 'boolean' }
    );

    if (matched) {
      return this.resolveBranchValue(branch, context);
    }
  }

  // 兜底值
  return rule.default;
}

/**
 * 解析分支赋值
 */
private resolveBranchValue(
  branch: ConditionalBranch,
  context: EvalContext
): any | Promise<any> {
  const valueType = branch.valueType || 'literal';

  switch (valueType) {
    case 'literal':
      return branch.value;

    case 'expression':
      return computationEngine.evaluate(branch.value, context);

    case 'variable':
      // 按点路径从上下文中取值，如 "currentUser.department.manager"
      return get(context, branch.value);
  }
}
```

**条件赋值的三种赋值模式示例**：

```jsonc
// 模式 1: literal — 直接给字面量
{
  "condition": "customerLevel === 'vip'",
  "value": 0.85
}

// 模式 2: expression — 通过表达式计算
{
  "condition": "orderAmount > 10000",
  "value": "orderAmount * 0.005",
  "valueType": "expression"
}

// 模式 3: variable — 从上下文变量中取值
{
  "condition": "region === 'east'",
  "value": "currentUser.department.managerEast",
  "valueType": "variable"
}
```

#### 选项联动

```typescript
private async executeOptionsLinkage(
  rule: LinkageRule,
  values: Record<string, any>
): Promise<Option[]> {
  const { rule: linkRule } = rule;

  // 构建查询条件：将模板变量 {{field}} 替换为实际值
  const filter = this.resolveTemplate(linkRule.filter, values);

  // 调用数据引擎查询
  const records = await dataEngine.query({
    dataSource: linkRule.dataSource,
    filter,
    labelField: linkRule.labelField,
    valueField: linkRule.valueField,
  });

  return records.map(r => ({
    label: r[linkRule.labelField],
    value: r[linkRule.valueField],
  }));
}
```

#### 显隐联动

```typescript
private executeVisibleLinkage(
  rule: LinkageRule,
  values: Record<string, any>
): boolean {
  const { rule: linkRule } = rule;

  // 条件表达式求值，返回布尔值
  // 示例: "hasRemark === true"  "status !== 'draft'"
  const visible = computationEngine.evaluate(linkRule.condition, values);

  return Boolean(visible);
}
```

#### 属性联动

```typescript
private executeAttributeLinkage(
  rule: LinkageRule,
  values: Record<string, any>
): Record<string, any> {
  const { rule: linkRule } = rule;

  // 根据条件动态计算目标字段的属性值
  // 示例: 选择 VIP → { disabled: false, required: true }
  //        选择普通 → { disabled: true, required: false }
  const attributes = computationEngine.evaluate(linkRule.expression, values);

  return attributes; // { disabled?, required?, placeholder?, ... }
}
```

### 2.4 执行调度与批量更新

单次字段变化可能触发多条联动规则，级联传播会导致中间状态的多次 re-render。通过批量更新合并为单次渲染：

```typescript
class LinkageEngine {
  private pendingUpdates: Map<string, any> = new Map();
  private flushScheduled = false;

  /**
   * 字段变化入口 —— 由表单 onChange 触发
   */
  onFieldChange(
    fieldName: string,
    value: any,
    values: Record<string, any>,
    options: { silent?: boolean } = {}
): void {
    // 1. 更新触发字段自身的值（由表单层完成，此处仅处理联动）

    // 2. 查找该字段触发的所有规则
    const rules = this.triggerIndex.get(fieldName) || [];
    if (rules.length === 0) return;

    // 3. 按拓扑序执行
    for (const rule of this.sortByTopology(rules)) {
      if (!this.shouldExecute(rule, values)) continue;

      const result = this.executeRule(rule, values);

      // 4. 收集更新，不立即应用
      this.pendingUpdates.set(rule.target.field, result);

      // 5. 级联传播：检查目标字段是否也有下游规则
      const downstreamRules = this.triggerIndex.get(rule.target.field) || [];
      for (const downstream of downstreamRules) {
        // 用"即将生效的值"来计算下游，而不是旧值
        const virtualValues = { ...values, ...this.pendingUpdates };
        const downstreamResult = this.executeRule(downstream, virtualValues);
        this.pendingUpdates.set(downstream.target.field, downstreamResult);
      }
    }

    // 6. 批量 flush（合并为一次 setState）
    this.scheduleFlush(values);
  }

  /**
   * 初始化联动（静默模式）—— 不触发 onChange 回调，不触发校验
   */
  initLinkage(values: Record<string, any>): Record<string, any> {
    const updates: Record<string, any> = {};

    for (const field of this.executionOrder) {
      const rules = this.dependencyIndex.get(field) || [];
      for (const rule of rules) {
        const virtualValues = { ...values, ...updates };
        const result = this.executeRule(rule, virtualValues);
        if (result !== undefined) {
          updates[rule.target.field] = result;
        }
      }
    }

    return updates;
  }

  private scheduleFlush(values: Record<string, any>): void {
    if (this.flushScheduled) return;
    this.flushScheduled = true;

    // 微任务级别合并，同一事件循环内的多次联动更新合并为一次
    queueMicrotask(() => {
      if (this.pendingUpdates.size > 0) {
        this.batchUpdate(this.pendingUpdates, values);
        this.pendingUpdates.clear();
      }
      this.flushScheduled = false;
    });
  }
}
```

### 2.5 循环依赖检测

```typescript
private buildDAG(rules: LinkageRule[]): void {
  // 构建邻接表: field → [依赖它的字段]
  const graph = new Map<string, Set<string>>();

  for (const rule of rules) {
    const from = rule.trigger.field;
    const to = rule.target.field;

    if (!graph.has(from)) graph.set(from, new Set());
    graph.get(from)!.add(to);
  }

  // Kahn 算法检测环
  const inDegree = new Map<string, number>();
  for (const [from, targets] of graph) {
    if (!inDegree.has(from)) inDegree.set(from, 0);
    for (const to of targets) {
      inDegree.set(to, (inDegree.get(to) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [node, degree] of inDegree) {
    if (degree === 0) queue.push(node);
  }

  let count = 0;
  while (queue.length > 0) {
    const node = queue.shift()!;
    count++;
    for (const target of graph.get(node) || []) {
      const newDegree = inDegree.get(target)! - 1;
      inDegree.set(target, newDegree);
      if (newDegree === 0) queue.push(target);
    }
  }

  // 如果入度为 0 的节点数不等于总节点数，说明存在环
  if (count !== inDegree.size) {
    const cycleFields = [...inDegree.entries()]
      .filter(([_, d]) => d > 0)
      .map(([f]) => f);
    throw new Error(
      `联动规则存在循环依赖: ${cycleFields.join(' → ')}，请检查设计器中的联动配置`
    );
  }
}
```

---

## 三、组件事件桥接

### 3.1 设计目标

- 组件本身保持纯净，只负责 UI 渲染和原生事件触发
- 所有低代码逻辑（动作编排、条件判断、模板变量）在桥接层处理
- 设计器中可视化配置的事件，运行时自动编译为可执行函数

### 3.2 事件配置模型

设计器的「事件」Tab 产出如下 Schema：

```jsonc
{
  "componentId": "btn_submit",
  "type": "button",
  "events": {
    // key = 原生事件名，value = 动作链（按顺序执行）
    "onClick": [
      {
        "id": "action_001",
        "type": "validate",
        "params": { "formId": "form_order" }
      },
      {
        "id": "action_002",
        "type": "submit",
        "params": {
          "api": "/api/orders",
          "method": "POST",
          "successMessage": "提交成功"
        }
      },
      {
        "id": "action_003",
        "type": "navigate",
        "params": { "url": "/order/success?id={{orderId}}" },
        "condition": "$result.success === true"
      },
      {
        "id": "action_004",
        "type": "showMessage",
        "params": { "type": "error", "content": "提交失败：{{$result.message}}" },
        "condition": "$result.success === false"
      }
    ]
  }
}
```

### 3.3 标准动作类型 (ActionType)

#### 数据类

| Action | 说明 | 参数 |
|--------|------|------|
| `setValue` | 设置单个字段值 | `{ field, value }` |
| `setValues` | 批量设置字段值 | `{ fields: { [field]: value } }` |
| `resetForm` | 重置表单到初始值 | `{ formId?, fields?: string[] }` |
| `submit` | 提交表单 | `{ api, method?, headers?, successMessage? }` |

#### 校验类

| Action | 说明 | 参数 |
|--------|------|------|
| `validate` | 触发表单校验 | `{ formId?, fields?: string[] }` |
| `clearValidate` | 清除校验错误 | `{ formId?, fields?: string[] }` |

#### 请求类

| Action | 说明 | 参数 |
|--------|------|------|
| `apiCall` | 调用接口 | `{ url, method, data?, headers?, responseMapping? }` |
| `navigate` | 页面跳转 | `{ url, queryParams?: PropValue, target?: '_self' \| '_blank' }` |
| `redirect` | 当前页跳转（替换历史） | `{ url, queryParams?: PropValue }` |

#### UI 类

| Action | 说明 | 参数 |
|--------|------|------|
| `showModal` | 打开弹窗（返回 Promise，阻塞链条直到弹框关闭） | `{ modalId, data? }` |
| `closeModal` | 关闭弹窗（携带返回值，resolve 对应 showModal 的 Promise） | `{ modalId, result? }` |
| `showMessage` | 消息提示 | `{ type: 'success' \| 'error' \| 'warning' \| 'info', content }` |
| `setVisible` | 控制组件显隐 | `{ componentId, visible: boolean }` |
| `setDisabled` | 控制组件禁用 | `{ componentId, disabled: boolean }` |
| `setLoading` | 控制组件加载态 | `{ componentId, loading: boolean }` |

#### 流程类

| Action | 说明 | 参数 |
|--------|------|------|
| `triggerWorkflow` | 触发工作流 | `{ workflowId, snapshotOptions? }` |

#### 自定义类

| Action | 说明 | 参数 |
|--------|------|------|
| `customScript` | 执行自定义 JS | `{ script: string }` |

### 3.4 事件桥接层实现

#### 桥接流程

```
设计器事件 Schema
    │
    ▼
┌─────────────────────────────────────────────────┐
│              EventCompiler                       │
│                                                  │
│  输入: events = { onClick: ActionDefinition[] }  │
│                                                  │
│  1. 遍历每个事件名                                │
│  2. 将 ActionDefinition[] 编译为 async function  │
│  3. 注入条件判断、模板变量解析、错误处理           │
│                                                  │
│  输出: { onClick: (e) => Promise<void> }         │
└─────────────────────────────────────────────────┘
    │
    ▼
  作为 props 传入组件，与原生事件名一致
```

#### 核心代码

```typescript
/**
 * 将事件 Schema 编译为可执行的事件处理器映射
 */
function compileEventHandlers(
  events: Record<string, ActionDefinition[]>,
  context: FormDataContext,
  actionRegistry: Map<string, ActionExecutor>
): Record<string, Function> {
  const handlers: Record<string, Function> = {};

  for (const [eventName, actions] of Object.entries(events)) {
    handlers[eventName] = async (nativeEvent?: any) => {
      // 上一个动作的返回值，可通过 $result 引用
      let lastResult: any = null;

      for (const action of actions) {
        // ── 条件判断 ──
        if (action.condition) {
          const shouldExecute = safeEval(action.condition, {
            ...context.values,
            $result: lastResult,
            $event: nativeEvent,
          });
          if (!shouldExecute) continue;
        }

        // ── 延迟执行 ──
        if (action.delay) {
          await sleep(action.delay);
        }

        // ── 解析模板变量 ──
        const resolvedParams = resolveTemplate(action.params, {
          ...context.values,
          $result: lastResult,
        });

        // ── 执行动作 ──
        const executor = actionRegistry.get(action.type);
        if (!executor) {
          console.warn(`[EventBridge] Unknown action type: ${action.type}`);
          continue;
        }

        try {
          lastResult = await executor.execute(resolvedParams, context, nativeEvent);
        } catch (error) {
          console.error(`[EventBridge] Action "${action.type}" failed:`, error);
          // 默认中断后续动作，除非配置了 continueOnError
          if (!action.continueOnError) break;
          lastResult = { success: false, error };
        }
      }
    };
  }

  return handlers;
}
```

#### 模板变量解析

```typescript
/**
 * 将参数中的 {{expression}} 模板替换为实际值
 * 支持嵌套路径: {{user.address.city}}
 */
function resolveTemplate(
  params: Record<string, any>,
  context: Record<string, any>
): Record<string, any> {
  const resolved: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      resolved[key] = value.replace(/\{\{(.+?)\}\}/g, (_, expr) => {
        return get(context, expr.trim()); // lodash.get
      });
    } else if (typeof value === 'object' && value !== null) {
      resolved[key] = resolveTemplate(value, context); // 递归处理嵌套对象
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}
```

### 3.5 动作执行器注册

```typescript
// 每个 ActionType 对应一个 ActionExecutor
interface ActionExecutor {
  execute(
    params: Record<string, any>,
    context: FormDataContext,
    nativeEvent?: any
  ): Promise<any>;
}

// ── setValue ──
const setValueExecutor: ActionExecutor = {
  async execute(params, context) {
    context.setFieldValue(params.field, params.value);
    return { success: true };
  }
};

// ── submit ──
const submitExecutor: ActionExecutor = {
  async execute(params, context) {
    // 1. 触发客户端校验
    const valid = await context.formRef.validate();
    if (!valid) {
      return { success: false, message: '客户端校验未通过' };
    }

    // 2. 调用提交接口
    const result = await request(params.api, {
      method: params.method || 'POST',
      data: context.values,
      headers: params.headers,
    });

    // 3. 提示
    if (params.successMessage) {
      message.success(params.successMessage);
    }

    return { success: true, data: result };
  }
};

// ── apiCall ──
const apiCallExecutor: ActionExecutor = {
  async execute(params, context) {
    const result = await request(params.url, {
      method: params.method || 'GET',
      data: params.data,
      headers: params.headers,
    });

    // 响应映射：将接口返回值写入表单字段
    if (params.responseMapping) {
      for (const [field, path] of Object.entries(params.responseMapping)) {
        context.setFieldValue(field, get(result, path as string));
      }
    }

    return result;
  }
};

// ── customScript ──
const customScriptExecutor: ActionExecutor = {
  async execute(params, context, nativeEvent) {
    // 在沙箱中执行用户自定义脚本
    // 暴露有限的 API，禁止访问全局对象
    // $form 从 formRegistry.getFormData() 获取，指向当前活跃表单的数据
    return await safeEvalAsync(params.script, {
      $form: context.formRegistry?.getFormData(params.formId) ?? {},
      $values: context.formRegistry?.getFormData(params.formId) ?? {},
      $event: nativeEvent,
      $message: message,
      $request: request,
    });
  }
};

// 注册所有执行器
const actionRegistry = new Map<string, ActionExecutor>([
  ['setValue',         setValueExecutor],
  ['setValues',       setValuesExecutor],
  ['resetForm',       resetFormExecutor],
  ['validate',        validateExecutor],
  ['clearValidate',   clearValidateExecutor],
  ['submit',          submitExecutor],
  ['apiCall',         apiCallExecutor],
  ['navigate',        navigateExecutor],
  ['redirect',        redirectExecutor],
  ['showModal',       showModalExecutor],
  ['closeModal',      closeModalExecutor],
  ['showMessage',     showMessageExecutor],
  ['setVisible',      setVisibleExecutor],
  ['setDisabled',     setDisabledExecutor],
  ['setLoading',      setLoadingExecutor],
  ['triggerWorkflow', triggerWorkflowExecutor],
  ['customScript',    customScriptExecutor],
]);
```

### 3.6 弹框栈机制（ModalStack）

#### 设计目标

`showModal` 打开弹框后，action chain 需要**暂停等待**弹框关闭，并获取弹框的返回值。支持多层弹框嵌套（A 打开 B，B 关闭后返回给 A，A 再关闭返回给调用方）。

#### 核心数据结构

```typescript
class ModalStack {
  /** 栈底 → 栈顶 */
  private stack: ModalEntry[] = [];

  /** 状态变化回调（供宿主 UI 监听以渲染/关闭弹框） */
  private onChange?: (event: ModalChangeEvent) => void;
}

interface ModalEntry {
  modalId: string;
  data?: any;
  resolve: (result?: any) => void;  // showModal 的 Promise resolve
}
```

#### 执行流程

```
调用方 action chain
  │
  ▼ 步骤1: showModal("A", data)
     ModalStack.open() → 压栈，返回 Promise（链条暂停 await）
  ┌─────────────────────────────────────┐
  │  弹框 A 的 action chain              │
  │                                     │
  │  showModal("B", data2)              │
  │    → ModalStack.open() 再压栈        │
  │  ┌──────────────────────────┐       │
  │  │  弹框 B 的 action chain   │       │
  │  │  closeModal("B", result) │       │
  │  │    → ModalStack.close()  │       │
  │  │    → Promise<B> resolve  │       │
  │  └──────────────────────────┘       │
  │  $result = result (来自 B)           │
  │  closeModal("A", result2)           │
  │    → Promise<A> resolve             │
  └─────────────────────────────────────┘
  │
  ▼ $result = result2 (来自 A)
  步骤2: setFormValue("field", "{{$result.xxx}}")
```

#### 关键设计点

| 特性 | 说明 |
|------|------|
| **Promise 驱动** | `showModal` 返回 Promise，`await` 自然暂停链条，无需手动管理状态 |
| **栈隔离** | 每层弹框有独立的 `$result` 作用域，互不干扰 |
| **级联关闭** | `closeModal("A")` 自动关闭其上方的所有弹框（避免幽灵弹框残留） |
| **宿主通知** | 通过 `onChange` 回调通知宿主渲染/关闭弹框 UI，渲染层本身不关心具体 UI 组件 |
| **卸载清理** | 页面/组件卸载时 `ModalStack.clear()` 自动 resolve 所有挂起的 Promise |

#### 弹框内 action chain 的 $result 传递

弹框内的 action chain 与主页面共享同一套 `$result` 链式传递机制。`closeModal` 的 `result` 参数支持模板变量：

```jsonc
// 弹框内：用户选择后关闭，返回选中数据
{
  "action": "closeModal",
  "params": {
    "modalId": "userSelector",
    "result": {
      "userId": "{{selectedUser.id}}",
      "userName": "{{selectedUser.name}}"
    }
  }
}

// 主页面：showModal 的返回值自动注入 $result
// 后续步骤可通过 {{$result.userId}} 引用
{
  "action": "setValue",
  "params": {
    "field": "assignee",
    "value": "{{$result.userName}}"
  }
}
```

### 3.7 onChange 的特殊处理

`onChange` 事件承担双重职责：更新表单值 + 执行用户自定义动作。必须保证执行顺序：

```typescript
/**
 * 为表单字段构建 onChange 处理器
 * 执行顺序: 更新值 → 校验 → 联动 → 用户自定义事件
 */
function buildFieldOnChangeHandler(
  field: string,
  userActions: ActionDefinition[],   // 设计器中配置的自定义动作
  context: FormDataContext,
  linkageEngine: LinkageEngine,
  actionRegistry: Map<string, ActionExecutor>
): (value: any, nativeEvent?: any) => Promise<void> {

  // 将用户自定义动作编译为可执行函数
  const userHandler = compileSingleEvent(userActions, context, actionRegistry);

  return async (value: any, nativeEvent?: any) => {
    // ── 第 1 步: 更新表单值 ──
    context.setFieldValue(field, value);

    // ── 第 2 步: 触发该字段的校验 (Level 1, 即时反馈) ──
    context.validateField(field);

    // ── 第 3 步: 触发联动引擎 ──
    linkageEngine.onFieldChange(field, value, context.values);

    // ── 第 4 步: 执行用户配置的自定义事件 ──
    if (userHandler) {
      await userHandler(nativeEvent);
    }
  };
}
```

### 3.8 组件渲染时的事件注入

```typescript
/**
 * 运行时渲染器中，渲染单个组件时注入事件
 */
function renderComponentWithEvents(
  schema: ComponentSchema,
  context: FormDataContext,
  linkageEngine: LinkageEngine,
  actionRegistry: Map<string, ActionExecutor>
): React.ReactElement {
  const { type, props, events } = schema;

  // 获取组件实现（从组件库适配器）
  const Component = componentRegistry.get(type);

  // ── 构建事件处理器 ──
  const eventHandlers: Record<string, Function> = {};

  if (events) {
    for (const [eventName, actions] of Object.entries(events)) {
      if (eventName === 'onChange') {
        // onChange 走特殊的字段级处理
        eventHandlers.onChange = buildFieldOnChangeHandler(
          schema.field!,
          actions,
          context,
          linkageEngine,
          actionRegistry
        );
      } else {
        // 其他事件（onClick, onBlur 等）直接编译
        const compiled = compileEventHandlers(
          { [eventName]: actions },
          context,
          actionRegistry
        );
        Object.assign(eventHandlers, compiled);
      }
    }
  }

  // ── 合并 props 并渲染 ──
  return <Component {...props} {...eventHandlers} />;
}
```

---

## 四、整体数据流

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           表单生命周期                                    │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 阶段 1: 初始化                                                      │  │
│  │                                                                   │  │
│  │  Schema ──▶ LinkageEngine.init()     建立索引 + 检测循环依赖       │  │
│  │         ──▶ 加载初始数据               edit/draft/snapshot/new     │  │
│  │         ──▶ 合并为 values             按优先级覆盖                 │  │
│  │         ──▶ LinkageEngine.initLinkage()  静默执行初始化联动        │  │
│  │         ──▶ 表单就绪，用户可操作                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 阶段 2: 用户交互（循环）                                             │  │
│  │                                                                   │  │
│  │  用户操作组件                                                       │  │
│  │    │                                                              │  │
│  │    ▼                                                              │  │
│  │  组件原生 onChange / onClick / onBlur                              │  │
│  │    │                                                              │  │
│  │    ▼                                                              │  │
│  │  EventBridge 拦截                                                  │  │
│  │    ├─ 更新 values[field]                                          │  │
│  │    ├─ 校验 (Level 1, 即时)                                        │  │
│  │    ├─ LinkageEngine.onFieldChange()                               │  │
│  │    │    ├─ 查找触发索引                                             │  │
│  │    │    ├─ 按拓扑序执行联动规则                                     │  │
│  │    │    ├─ 批量更新 values                                         │  │
│  │    │    └─ 级联传播到下游字段                                       │  │
│  │    └─ 执行用户自定义事件（设计器配置的 actions）                      │  │
│  │         ├─ setValue / apiCall / submit / navigate / ...            │  │
│  │         └─ 条件判断 + 模板变量解析                                  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 阶段 3: 提交                                                       │  │
│  │                                                                   │  │
│  │  用户点击提交按钮                                                   │  │
│  │    ├─ Level 1~3 客户端校验                                         │  │
│  │    ├─ 调用提交接口                                                  │  │
│  │    ├─ Level 4 服务端校验                                            │  │
│  │    ├─ 数据落库                                                      │  │
│  │    └─ 触发后续流程（工作流 / 运算 / 消息 / 审计）                     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 五、设计器侧配置界面

### 5.1 事件 Tab 面板

```
┌─────────────────────────────────────┐
│  [属性]  [样式]  [事件]  [数据]       │
├─────────────────────────────────────┤
│                                     │
│  ▼ onClick                          │
│  ┌─────────────────────────────────┐│
│  │ ① 校验表单              [删除]  ││
│  │   类型: validate               ││
│  │   表单: form_order    [▼]      ││
│  ├─────────────────────────────────┤│
│  │ ② 提交数据              [删除]  ││
│  │   类型: submit                  ││
│  │   接口: /api/orders             ││
│  │   方法: POST           [▼]      ││
│  ├─────────────────────────────────┤│
│  │ ③ 页面跳转              [删除]  ││
│  │   类型: navigate                ││
│  │   地址: /success?id={{orderId}} ││
│  │   条件: $result.success === true││
│  │                        [▼]      ││
│  └─────────────────────────────────┘│
│                                     │
│  [+ 添加动作]                        │
│                                     │
│  ▶ onBlur (0 个动作)                 │
│  ▶ onChange (0 个动作)                │
│                                     │
└─────────────────────────────────────┘
```

### 5.2 动作选择器

点击「添加动作」后弹出动作选择面板：

```
┌──────────────────────────────────┐
│  选择动作类型         🔍 搜索     │
├──────────────────────────────────┤
│                                  │
│  数据操作                         │
│  ├ 设置字段值 (setValue)          │
│  ├ 批量设置值 (setValues)         │
│  ├ 重置表单 (resetForm)           │
│  └ 提交表单 (submit)              │
│                                  │
│  校验操作                         │
│  ├ 触发校验 (validate)            │
│  └ 清除校验 (clearValidate)       │
│                                  │
│  请求操作                         │
│  ├ 调用接口 (apiCall)             │
│  └ 页面跳转 (navigate)            │
│                                  │
│  界面操作                         │
│  ├ 消息提示 (showMessage)         │
│  ├ 打开弹窗 (showModal)           │
│  ├ 显示/隐藏 (setVisible)         │
│  └ 禁用/启用 (setDisabled)        │
│                                  │
│  流程操作                         │
│  └ 触发工作流 (triggerWorkflow)   │
│                                  │
│  高级                             │
│  └ 自定义脚本 (customScript)      │
│                                  │
└──────────────────────────────────┘
```

---

## 六、安全考虑

### 6.1 自定义脚本沙箱

用户配置的 `customScript` 在沙箱中执行，禁止访问危险 API：

```typescript
// 沙箱白名单
const SANDBOX_GLOBALS = {
  Math,
  Date,
  JSON,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  // 禁止: window, document, eval, Function, import, require, fetch, XMLHttpRequest
};

async function safeEvalAsync(script: string, context: Record<string, any>): Promise<any> {
  // 使用 new Function + with 语句构建沙箱作用域
  // 或使用 iframe sandbox / Web Worker / vm2 等隔离方案
  const sandboxed = new Function(
    ...Object.keys(SANDBOX_GLOBALS),
    ...Object.keys(context),
    `"use strict"; return (async () => { ${script} })()`
  );
  return sandboxed(...Object.values(SANDBOX_GLOBALS), ...Object.values(context));
}
```

### 6.2 模板变量注入防护

模板变量解析仅支持字段值读取，不支持执行任意表达式：

```typescript
// ✅ 允许: {{fieldName}}  {{user.name}}
// ❌ 禁止: {{alert('xss')}}  {{fetch('http://evil.com')}}
function resolveTemplate(template: string, context: Record<string, any>): string {
  return template.replace(/\{\{(.+?)\}\}/g, (_, path) => {
    // 仅支持点路径取值，不支持表达式
    if (/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(path.trim())) {
      const val = get(context, path.trim());
      return val !== undefined ? String(val) : '';
    }
    return ''; // 非法路径，返回空
  });
}
```

### 6.3 API 调用权限

`apiCall` 动作的目标 URL 需要做白名单校验，防止 SSRF：

```typescript
const apiCallExecutor: ActionExecutor = {
  async execute(params, context) {
    // 校验 URL 是否在白名单内
    if (!isAllowedApiUrl(params.url)) {
      throw new Error(`API URL not allowed: ${params.url}`);
    }
    // ...
  }
};

function isAllowedApiUrl(url: string): boolean {
  // 只允许相对路径（当前域）或配置的可信域名
  if (url.startsWith('/')) return true;
  const trustedDomains = getTrustedDomains(); // 从配置读取
  return trustedDomains.some(domain => url.startsWith(domain));
}
```

---

## 七、设计器侧计算字段标记

### 7.1 设计目标

设计器中需要让用户一眼看出哪些字段是「自动计算」的（类 Vue computed），避免手动填写被联动覆盖的值。通过遍历联动规则，在组件 Schema 上打标记实现。

### 7.2 标记算法

```typescript
interface ComputedFieldMeta {
  /** 是否为计算字段 */
  computed: boolean;
  /** 依赖的触发字段列表 */
  dependsOn: string[];
  /** 联动规则类型（用于图标区分） */
  ruleTypes: ('expression' | 'conditional' | 'map' | 'query')[];
  /** 条件赋值时的分支摘要（用于 tooltip 展示） */
  branchSummary?: string[];
}

/**
 * 遍历联动规则，为每个目标字段生成计算标记
 * 在设计器加载 Schema 后调用一次
 */
function buildComputedFieldMap(
  linkages: LinkageRule[]
): Map<string, ComputedFieldMeta> {
  const computedMap = new Map<string, ComputedFieldMeta>();

  for (const linkage of linkages) {
    const targetField = linkage.target.field;

    if (linkage.type !== 'value') continue;

    if (!computedMap.has(targetField)) {
      computedMap.set(targetField, {
        computed: true,
        dependsOn: [],
        ruleTypes: [],
      });
    }

    const meta = computedMap.get(targetField)!;

    // 收集触发字段
    const triggers = [linkage.trigger.field];
    if (linkage.trigger.field2) triggers.push(linkage.trigger.field2);
    meta.dependsOn.push(...triggers);

    // 记录规则类型
    if (!meta.ruleTypes.includes(linkage.rule.type as any)) {
      meta.ruleTypes.push(linkage.rule.type as any);
    }

    // 条件赋值：生成分支摘要
    if (linkage.rule.type === 'conditional') {
      meta.branchSummary = linkage.rule.branches.map(b => {
        const val = b.valueType === 'variable'
          ? `{${b.value}}`
          : b.valueType === 'expression'
            ? `=${b.value}`
            : String(b.value);
        return `if ${b.condition} → ${val}`;
      });
      if (linkage.rule.default !== undefined) {
        meta.branchSummary.push(`default → ${linkage.rule.default}`);
      }
    }
  }

  return computedMap;
}
```

### 7.3 设计器组件树展示

```
┌─ 字段列表 ─────────────────────────────────────┐
│                                                 │
│  📝 客户名称     (input)                         │
│  📝 订单金额     (number)                        │
│  📝 客户等级     (select)                        │
│  🔗 折扣         (number)  ← computed 标记       │
│     └ 依赖: 客户等级, 订单金额                   │
│     └ 条件: vip+>5000→0.85, svip+>10000→0.7... │
│  🔗 总金额       (number)  ← computed 标记       │
│     └ 依赖: 数量, 单价                          │
│     └ 公式: quantity * unitPrice                 │
│  🔗 区号         (input)   ← computed 标记       │
│     └ 依赖: 省份                                │
│     └ 映射: 北京→010, 上海→021...               │
│                                                 │
└─────────────────────────────────────────────────┘
```

- 🔗 图标表示该字段为计算字段，不可手动编辑默认值
- hover tooltip 展示完整的依赖链和计算逻辑
- 点击可跳转到对应的联动规则配置面板

### 7.4 编辑器联动

当用户在设计器中选中一个 `computed` 字段时：

```
┌─ 属性面板 ─────────────────────────────────────┐
│                                                 │
│  折扣 (discount)                          [🔗]  │
│                                                 │
│  类型: number                                   │
│  默认值: ────────────────── (置灰，不可编辑)     │
│         ↑ 该字段由联动规则自动计算               │
│                                                 │
│  ┌─ 联动规则 ─────────────────────────────────┐ │
│  │  规则类型: 条件赋值                          │ │
│  │  触发字段: customerLevel                     │ │
│  │                                             │ │
│  │  ① customerLevel === 'svip'                 │ │
│  │     && orderAmount > 10000  → 0.7           │ │
│  │  ② customerLevel === 'vip'                  │ │
│  │     && orderAmount > 5000   → 0.85          │ │
│  │  ③ orderAmount > 1000       → 0.95          │ │
│  │  ④ default                  → 1.0           │ │
│  │                                             │ │
│  │  [编辑规则]  [断开联动(转为手动值)]           │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```
