# 项目测试用例文档

> 最后更新：2026-07-16
> 测试框架：Vitest
> 测试文件总数：63 个
> 测试用例总数：~500 个
> Vitest 配置文件：8 个（所有包均已配置）

---

## 一、测试目录结构

```
packages/
  renderer/src/__tests__/
    core/
      ComponentRegistry.test.ts
      DependencyGraph.test.ts
      DataBindingResolver.test.ts
      EventCompiler.test.ts
      ActionRegistry.test.ts
      ModalStack.test.ts
      ComponentMethodRegistry.test.ts
      LinkageEngine.test.ts
      ConditionRuleEngine.test.ts
      EnvironmentRegistry.test.ts
      FormRegistry.test.ts
      FormPreEvaluator.test.ts
    workflow/hooks/
      useBpmnConverter.test.ts (已有)

  workflow/src/__tests__/
    engine/
      StateMachine.test.ts
      DefinitionIndex.test.ts
      TimeoutManager.test.ts
      RunningRegistry.test.ts
      TaskStatsManager.test.ts
      SnapshotEngine.test.ts
      ExpressionEvaluator.test.ts
    executors/
      UserTaskExecutor.test.ts
      GatewayExecutor.test.ts
      ServiceTaskExecutor.test.ts
      DataOperationExecutors.test.ts
    schema/
      schema.test.ts (已有)
      engine.test.ts (已有)

  automation/tests/
    ConditionEvaluator.test.ts (已有)
    EffectiveTimeChecker.test.ts (已有)
    VariableResolver.test.ts (已有)
    Throttler.test.ts (已有)
    TriggerMatcher.test.ts (已有)

  data/src/__tests__/
    schema-builder.test.ts (已有)
    DatabaseManager.test.ts
    queryRecords.test.ts

  computation/src/__tests__/
    operators.test.ts

  shared/src/__tests__/
    expression-worker.test.ts (已有)
    ExpressionEngine.test.ts
    PermissionEngine.test.ts
    RoleRegistry.test.ts

  server/src/__tests__/
    TableService.test.ts (已有)
    WorkflowEngine.e2e.test.ts (已有)
    computation-engine.test.ts (已有)
    dynamic-table.e2e.test.ts (已有)
    FileDatabaseAdapter.test.ts (已有)
    routes/
      auth.test.ts
      apps.test.ts
      workflows.test.ts
      automations.test.ts
      computations.test.ts
      tenants.test.ts
```

---

## 二、各引擎测试用例统计

### 模块 1：渲染引擎

| 测试文件 | 测试用例数 | 状态 |
|---------|-----------|------|
| ComponentRegistry.test.ts | 15 | ✅ 新增 |
| DependencyGraph.test.ts | 12 | ✅ 新增 |
| DataBindingResolver.test.ts | 18 | ✅ 新增 |
| EventCompiler.test.ts | 20 | ✅ 新增 |
| ActionRegistry.test.ts | 25 | ✅ 新增 |
| ModalStack.test.ts | 15 | ✅ 新增 |
| ComponentMethodRegistry.test.ts | 18 | ✅ 新增 |
| LinkageEngine.test.ts | 22 | ✅ 新增 |
| ConditionRuleEngine.test.ts | 15 | ✅ 新增 |
| EnvironmentRegistry.test.ts | 16 | ✅ 新增 |
| FormRegistry.test.ts | 15 | ✅ 新增 |
| FormPreEvaluator.test.ts | 18 | ✅ 新增 |
| useBpmnConverter.test.ts | 10 | ✅ 已有 |
| **小计** | **219** | |

### 模块 2：流程引擎

| 测试文件 | 测试用例数 | 状态 |
|---------|-----------|------|
| StateMachine.test.ts | 15 | ✅ 新增 |
| DefinitionIndex.test.ts | 18 | ✅ 新增 |
| TimeoutManager.test.ts | 15 | ✅ 新增 |
| RunningRegistry.test.ts | 12 | ✅ 新增 |
| TaskStatsManager.test.ts | 14 | ✅ 新增 |
| SnapshotEngine.test.ts | 20 | ✅ 新增 |
| ExpressionEvaluator.test.ts | 18 | ✅ 新增 |
| UserTaskExecutor.test.ts | 22 | ✅ 新增 |
| GatewayExecutor.test.ts | 18 | ✅ 新增 |
| ServiceTaskExecutor.test.ts | 15 | ✅ 新增 |
| DataOperationExecutors.test.ts | 20 | ✅ 新增 |
| schema.test.ts | 12 | ✅ 已有 |
| engine.test.ts | 20 | ✅ 已有 |
| **小计** | **219** | |

### 模块 3：自动化引擎

| 测试文件 | 测试用例数 | 状态 |
|---------|-----------|------|
| TriggerMatcher.test.ts | 8 | ✅ 已有 |
| ConditionEvaluator.test.ts | 10 | ✅ 已有 |
| EffectiveTimeChecker.test.ts | 6 | ✅ 已有 |
| VariableResolver.test.ts | 5 | ✅ 已有 |
| Throttler.test.ts | 4 | ✅ 已有 |
| **小计** | **33** | |

### 模块 4：数据引擎

| 测试文件 | 测试用例数 | 状态 |
|---------|-----------|------|
| schema-builder.test.ts | 15 | ✅ 已有 |
| DatabaseManager.test.ts | 12 | ✅ 新增 |
| queryRecords.test.ts | 20 | ✅ 新增 |
| **小计** | **47** | |

### 模块 5：运算引擎

| 测试文件 | 测试用例数 | 状态 |
|---------|-----------|------|
| ExpressionEngine.test.ts | 18 | ✅ 新增 |
| operators.test.ts | 20 | ✅ 新增 |
| expression-worker.test.ts | 5 | ✅ 已有 |
| **小计** | **43** | |

### 模块 6：权限引擎

| 测试文件 | 测试用例数 | 状态 |
|---------|-----------|------|
| PermissionEngine.test.ts | 20 | ✅ 新增 |
| RoleRegistry.test.ts | 15 | ✅ 新增 |
| **小计** | **35** | |

### 服务端 API 路由

| 测试文件 | 测试用例数 | 状态 |
|---------|-----------|------|
| auth.test.ts | 10 | ✅ 新增 |
| apps.test.ts | 12 | ✅ 新增 |
| workflows.test.ts | 15 | ✅ 新增 |
| automations.test.ts | 18 | ✅ 新增 |
| computations.test.ts | 15 | ✅ 新增 |
| tenants.test.ts | 12 | ✅ 新增 |
| TableService.test.ts | 10 | ✅ 已有 |
| WorkflowEngine.e2e.test.ts | 8 | ✅ 已有 |
| computation-engine.test.ts | 6 | ✅ 已有 |
| **小计** | **106** | |

---

## 三、测试用例详细说明

### 3.1 运算引擎测试

#### ExpressionEngine.test.ts
- 基础求值：算术、字符串、三元表达式
- 变量访问：嵌套路径、数组方法
- 语法验证：括号匹配、语法错误检测
- 全局对象限制：window、process、require、globalThis
- 依赖分析：变量路径提取、去重
- 模板字符串：变量插值、嵌套路径
- 安全沙箱：超时终止、异步执行

#### operators.test.ts
- 比较操作符：eq、neq、gt、gte、lt、lte
- 字符串操作符：contains、not_contains、starts_with、ends_with
- 集合操作符：in、not_in、between
- 空值操作符：is_empty、is_not_empty
- 正则操作符：regex
- 边界情况：null、undefined、大小写敏感

### 3.2 权限引擎测试

#### PermissionEngine.test.ts
- 角色继承：递归展开、子角色覆盖父角色
- 权限合并：多角色合并、自动包含 department_default
- 权限检查：hasPermission、通配符 resourceId
- 菜单过滤：按角色、按用户、按部门
- 按钮过滤：按角色、按用户
- 权限上下文：has、hasAny、getResourceIds

#### RoleRegistry.test.ts
- 角色注册：注册、覆盖
- 角色查询：getRole、getAllRoles、getRolesByLevel
- 继承链解析：单继承、多继承、循环检测
- 角色注销：注销成功、内置角色保护

### 3.3 数据引擎测试

#### DatabaseManager.test.ts
- 系统库初始化：创建、单例、WAL 模式
- 租户库管理：创建、查询、删除
- 租户扫描：活跃租户、非活跃租户、无效目录
- 元数据管理：写入、读取

#### queryRecords.test.ts
- 基础查询：全量查询、软删除过滤
- 条件查询：$eq、$ne、$gt、$gte、$lt、$lte
- 集合查询：$in、$not_in、$between
- 字符串查询：$like、$not_like
- 空值查询：$is_null、$is_not_null
- 逻辑查询：$and、$or
- 高级查询：分页、排序、聚合

### 3.4 流程引擎测试

#### StateMachine.test.ts
- 状态转换：created→running、running→waiting、waiting→running
- 终态转换：running→completed、running→terminated
- 非法转换：created→completed、completed→running
- 状态查询：isTerminal、isActive、getNextStates

#### DefinitionIndex.test.ts
- 索引构建：节点映射、连线映射、出口/入口映射
- O(1) 查找：节点查找、连线查找、批量查找
- 路径查询：下一节点、上一节点、分支节点
- 统计信息：节点数量、连线数量、类型统计

#### TimeoutManager.test.ts
- 实例级超时：调度、执行、清除、覆盖
- 节点级超时：调度、执行、清除、批量清除
- 状态查询：活跃计数、是否继续

#### RunningRegistry.test.ts
- 实例注册：注册、注销、多个实例
- 实例中止：中止、批量中止
- 状态查询：运行中实例列表、数量、元数据
- 并发控制：最大并发数限制

#### TaskStatsManager.test.ts
- 任务创建统计：累加待办数量
- 任务完成统计：减少待办、增加完成
- 任务驳回统计：减少待办、增加驳回
- 统计查询：用户统计、所有统计、高负载用户
- 重新计算：基于任务列表重新统计

#### SnapshotEngine.test.ts
- 快照捕获：初始、节点完成、驳回、终态
- 快照链查询：完整链、时间排序
- 快照对比：字段变更、新增、删除
- 数据回写：终态快照回写业务表
- 变更计算：calculateChanges、mergeSnapshotData
- 子表单变更：行级新增、修改、删除

#### ExpressionEvaluator.test.ts
- 变量替换：简单变量、嵌套变量、多个变量
- 布尔求值：比较、等于、不等于、逻辑运算
- 语法校验：有效表达式、语法错误、括号不匹配
- 比较运算：>、>=、<、<=
- 函数调用：length、includes、startsWith、endsWith、isEmpty

#### UserTaskExecutor.test.ts
- 单人审批：创建任务、完成流转
- 会签模式：多个任务、等待所有人完成
- 或签模式：任一人完成继续、全部驳回驳回
- 竞签模式：第一人认领、其他取消
- 审批人解析：按用户、按角色、按部门、按岗位
- 超时处理：自动通过、自动驳回

#### GatewayExecutor.test.ts
- 排他网关：条件分支、默认分支、多条件选一
- 并行网关：同时激活所有分支、汇聚等待
- 包含网关：激活所有条件为真的分支
- 条件表达式：比较运算、逻辑运算、字符串操作

#### ServiceTaskExecutor.test.ts
- 表达式模式：同步执行、异步执行、结果写入变量
- API 调用：HTTP GET、HTTP POST
- Webhook 模式：发送通知
- 错误处理：执行失败、重试策略

#### DataOperationExecutors.test.ts
- CreateRecord：创建记录、默认值、变量引用、表达式、常量值
- UpdateRecord：更新记录、安全校验（必须有 filter）、条件更新
- QueryRecord：查询记录、排序、分页、字段选择
- DeleteRecord：删除记录、安全校验（必须有 filter）、软删除

### 3.5 渲染引擎测试

#### ComponentRegistry.test.ts
- 组件注册：单个注册、批量注册、组件库注册
- 组件查询：resolve、resolveComponent、list、listByCategory
- 组件管理：unregister、has、覆盖注册
- 分类过滤：按 category、按 library

#### DependencyGraph.test.ts
- 依赖注册：单依赖、多依赖、多表达式依赖同一变量
- 变更通知：精确路径、子路径、父路径、去重
- 依赖查询：getDependencies、getDependents
- 循环检测：直接循环、多级循环
- 依赖提取：extractDependencies

#### DataBindingResolver.test.ts
- 字面量解析：数字、字符串、布尔、null、undefined
- 变量引用解析：简单变量、嵌套变量、数组元素、组件属性
- 表达式解析：同步表达式、异步表达式、条件判断、数组方法
- 批量解析：resolveProps、混合字面量和变量引用
- 依赖注册：registerDependencies

#### EventCompiler.test.ts
- 编译：空动作链、单个动作、多个动作
- 执行动作：setValue、setValues、showMessage、navigate、showModal、invokeMethod、triggerWorkflow
- 条件分支：then 分支、else 分支、嵌套条件、防止无限嵌套
- disabled 跳过：跳过 disabled 的动作
- 模板变量解析：resolveTemplate
- $result 透传：上一步结果写入 $result

#### ActionRegistry.test.ts
- 动作注册：register、覆盖、list
- 内置动作：setValue、setValues、showMessage、navigate、showModal、closeModal、invokeMethod、triggerWorkflow、refreshComponent、submit、resetForm、validate、setVisible、setDisabled、setLoading、executeScript
- setValue 动作：设置表单字段值、支持变量引用
- showMessage 动作：显示消息
- navigate 动作：导航到指定 URL
- showModal 动作：显示弹窗、返回结果
- invokeMethod 动作：调用组件方法、传递参数

#### ModalStack.test.ts
- showModal：打开弹窗、返回 Promise、多层嵌套、记录顺序
- closeModal：关闭最顶层、携带 result resolve Promise、关闭所有、按顺序 resolve
- resolveModal：resolve 指定弹窗的 Promise
- 状态查询：getStack、getCurrentModal、isEmpty、size
- 卸载清理：dispose 关闭所有弹窗

#### ComponentMethodRegistry.test.ts
- register：注册方法处理器、覆盖、多个组件、同一组件多个方法
- preRegister：预注册空壳处理器、多个组件、跳过已注册
- invoke：调用注册方法、结果写入 $result、抛出错误当不存在、无参数调用
- 组件方法元数据：Table、Form、Drawer、Modal

#### LinkageEngine.test.ts
- register：注册联动规则、拒绝循环依赖
- 值联动：静态映射、表达式计算、条件分支赋值、异步查询
- 选项联动：查询选项、label/value 映射
- 显隐联动：条件表达式求值返回 boolean
- 属性联动：动态计算 disabled、required 属性
- 批量更新：合并多个更新
- 计算字段标记：computedFields、dependsOn、ruleTypes

#### ConditionRuleEngine.test.ts
- evaluate：简单条件、AND 条件、OR 条件、NOT 条件
- evaluateRules：评估多条规则、返回匹配规则的动作
- validateCondition：验证有效条件、检测无效条件、检测空条件
- extractVariables：提取条件中的变量、嵌套条件变量

#### EnvironmentRegistry.test.ts
- register：注册环境变量、覆盖已存在
- get/has：查询变量元数据、判断变量存在
- list：返回所有注册的变量
- getVariableTree：生成变量树、Monaco 代码提示数据
- registerPageComponents：注册页面组件到 $component
- registerPageDataSources：注册页面数据源到 $data
- registerAvailableTables：注册可用数据表到 $table

#### FormRegistry.test.ts
- register：注册表单实例、覆盖、多个表单
- unregister：注销表单、处理不存在
- get/has：查询表单实例、判断存在
- list：返回所有表单 ID
- getValues/setValues：获取/设置表单值
- validate/reset：验证/重置表单

#### FormPreEvaluator.test.ts
- preEvaluate：预求值表单字段、跳过非表达式、按依赖拓扑排序、同层并行求值
- scanExpressions：扫描子组件表达式绑定、提取表达式路径
- detectCycles：检测循环依赖
- topologicalSort：按依赖关系排序、同层组件分组
- 错误处理：表达式求值失败、空子组件数组

### 3.6 服务端 API 路由测试

#### auth.test.ts
- 密码验证：正确密码、错误密码
- JWT 生成：生成、验证、过期、无效
- 租户守卫：匹配、不匹配、平台管理员
- 登录流程：参数验证、查询用户、状态检查

#### apps.test.ts
- 目录结构：创建目录、资源子目录、写入元数据
- 资源文件：读取、扫描、过滤已删除
- ID 生成：8 位 hex、唯一性
- 资源类型：pages、cards、tables、workflows、automations、computations

#### workflows.test.ts
- 流程定义文件：创建、扫描、过滤已删除
- 流程状态：DRAFT、PUBLISHED、ARCHIVED
- BPMN 文档：流程定义、条件分支、并行分支
- 流程触发：手动、表单按钮、自动化

#### automations.test.ts
- 规则文件：创建、扫描、过滤已删除
- 规则状态：enabled、disabled、draft
- 触发器配置：data_change、schedule
- 条件配置：单条件、AND、OR
- 动作配置：trigger_workflow、execute_expression、send_notification、data_operation
- 节流配置：cooldown、dailyLimit
- 生效时间：时间范围、无限期

#### computations.test.ts
- 运算规则文件：创建、扫描、过滤已删除
- 运算类型：formula、field、aggregation、transform
- 输入配置：参数定义、字段类型
- 输出配置：输出字段、输出格式
- 表达式配置：同步、异步
- 执行结果：成功、失败
- 安全约束：禁止全局访问、禁止危险操作

#### tenants.test.ts
- 租户元数据：读取、不存在处理
- 用户管理：查询、创建、更新、禁用、过滤
- 部门管理：创建、子部门、部门树、用户分配
- 角色管理：创建、分配、查询
- 权限管理：创建、分配、查询
- 密码哈希：生成、验证

---

## 四、Vitest 配置

所有包均已配置 `vitest.config.ts`，统一使用以下配置：

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    passWithNoTests: true,
  },
});
```

**特殊配置**：
- `packages/automation` — 包含覆盖率配置（v8 provider）
- `server` — 包含覆盖率配置和自定义 include 路径

---

## 五、运行测试

```bash
# 运行所有测试
yarn test

# 运行单个包测试
cd packages/shared && vitest run
cd packages/data && vitest run
cd packages/workflow && vitest run
cd packages/renderer && vitest run
cd packages/automation && vitest run
cd packages/computation && vitest run
cd server && vitest run

# 运行带覆盖率
cd packages/shared && vitest run --coverage

# 监听模式开发
cd packages/workflow && vitest

# 运行特定测试文件
cd packages/shared && vitest run src/__tests__/ExpressionEngine.test.ts
```

---

## 六、测试覆盖率目标

| 模块 | 目标覆盖率 | 当前状态 |
|------|-----------|---------|
| 运算引擎 | 90% | ✅ 核心功能已覆盖 |
| 权限引擎 | 85% | ✅ 核心功能已覆盖 |
| 数据引擎 | 80% | ✅ 核心功能已覆盖 |
| 流程引擎 | 80% | ✅ 核心功能已覆盖 |
| 渲染引擎 | 75% | ✅ 核心模块已覆盖 |
| 自动化引擎 | 70% | ✅ 核心功能已覆盖 |
| 服务端 API | 70% | ✅ 路由逻辑已覆盖 |

---

## 七、后续优化建议

1. **前端组件测试**
   - 需要配置 @testing-library/react
   - 编写 withPlatform、FormWithProvider 等组件测试
   - 编写设计器 UI 交互测试

2. **集成测试**
   - 完整流程 E2E（设计器→发布→运行）
   - 跨引擎集成（自动化触发流程→流程调用运算）

3. **性能测试**
   - 大数据量查询性能
   - 并发流程执行性能
   - 表达式引擎执行性能

4. **安全测试**
   - SQL 注入防护
   - XSS 攻击防护
   - 权限绕过测试

---

## 八、已知问题

1. **Windows 文件锁定**
   - SQLite 数据库关闭后需要等待文件释放
   - 测试中使用 `await sleep(100)` 解决

2. **异步测试超时**
   - 沙箱执行测试需要足够超时时间
   - 使用 `{ timeout: 5000 }` 配置

3. **Mock 数据一致性**
   - 部分测试使用内存数据库
   - 需要确保测试间数据隔离
