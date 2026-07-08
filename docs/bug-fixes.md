# Bug 修复记录

## 2026-07-08 (三)

### CronScheduler 注释中 `*/` 提前关闭块注释导致后端无法启动

**现象**：后端启动报 `TransformError: Expected ";" but found "）"`，所有 API 返回 500。

**根因**：`CronScheduler.ts` 第 11 行块注释 `/** ... */` 中包含 `*/5`，其中的 `*/` 被 esbuild 解析为块注释结束符，导致 `5）` 被当作代码解析失败，整个后端进程崩溃。

**修复**：将注释中的 `*/5` 改为 `star/5，star 代表 *`，避免 `*/` 序列。

**涉及文件**：
- `server/src/services/CronScheduler.ts` — 注释文本修正

---

### 配置中心页面 API 路径错误导致 500

**现象**：`ConfigCenterPage.tsx` 的用户管理 Tab 调用 `/api/users` 返回 500 Internal Server Error。

**根因**：
1. 前端 `UserManagementTab` 硬编码 `/api/users` 路径，但服务端用户路由注册在 `/api/tenants/:tenantId/users`
2. `roles` 和 `permissions` 路由文件已创建但未在 `registerRoutes()` 中注册，导致 `/api/roles` 和 `/api/permissions/matrix` 也返回 404

**修复**：
1. **ConfigCenterPage.tsx**：`UserManagementTab` 引入 `useAuth()` 获取 `tenantId`，所有 API 路径改为 `/api/tenants/${tenantId}/users` 格式
2. **server/src/routes/index.ts**：注册 `createRolesRouter()` 和 `createPermissionsRouter()`

**涉及文件**：
- `frontend/src/pages/ConfigCenterPage.tsx` — 用户管理 API 路径修正
- `server/src/routes/index.ts` — 注册 roles/permissions 路由

---

## 2026-07-08 (续)

### 流程引擎节点配置与执行器不一致

**现象**：设计器配置的节点参数无法被引擎正确读取和执行。ServiceTask 读取 `extensionElements.serviceConfig` 但设计器保存的是顶层 `expression` 字段；数据操作任务的 `fields`/`filter` 类型与执行器期望的格式不匹配。

**根因**：执行器开发时采用了"理想化"的配置结构（`extensionElements.serviceConfig`、`Record<string, any>`），但设计器实际保存的字段格式不同（顶层 `expression`、`FieldMappingItem[]`/`ConditionItem[]` 数组格式）。两套代码独立开发，未对齐数据契约。

**修复**：
1. **ScriptTaskExecutor**（新建）：复用 `ConditionExpressionEvaluator` 执行同步表达式，读取节点顶层 `expression`/`script` 字段
2. **ServiceTaskExecutor**：新增表达式模式，优先读取顶层 `expression`，回退到 `extensionElements.serviceConfig`
3. **DataOperationExecutor**：新增 `convertFieldMappings()`/`convertConditions()` 方法，支持 `FieldMappingItem[]` 和 `ConditionItem[]` 数组格式自动转换
4. **四个数据操作子执行器**：修正 `execute()` 签名从 `execute(node, context)` 改为 `execute(context)`，配置从 `context.currentNode` 顶层字段读取
5. **UserTaskExecutor**：补全超时逻辑，支持 autoApprove/autoReject/notify/transfer 四种超时动作
6. **TimeoutManager**：新增节点级超时 `scheduleNodeTimeout()`/`clearNodeTimeout()`
7. **WorkflowEngine**：新增 `transfer()`/`addSign()`/`claimTask()`/`scheduleNodeTimeout()`/`clearNodeTimeout()` API

**涉及文件**：
- `packages/workflow/src/executors/ScriptTaskExecutor.ts` — 新建
- `packages/workflow/src/executors/ServiceTaskExecutor.ts` — 双模式执行
- `packages/workflow/src/executors/DataOperationExecutor.ts` — 数组格式适配
- `packages/workflow/src/executors/CreateRecordExecutor.ts` — 签名修正
- `packages/workflow/src/executors/UpdateRecordExecutor.ts` — 签名修正
- `packages/workflow/src/executors/QueryRecordExecutor.ts` — 签名修正
- `packages/workflow/src/executors/DeleteRecordExecutor.ts` — 签名修正
- `packages/workflow/src/executors/UserTaskExecutor.ts` — 超时逻辑
- `packages/workflow/src/engine/TimeoutManager.ts` — 节点级超时
- `packages/workflow/src/engine/WorkflowEngine.ts` — 新 API + 注册
- `packages/workflow/src/index.ts` — 导出 ScriptTaskExecutor

---

## 2026-07-08

### 流程节点配置回显丢失 + 展示组件不更新

**现象**：
1. 节点配置面板设置后保存，重新打开时配置丢失
2. 配置保存后，画布上的节点展示信息不更新（如创建记录节点仍显示"未指定表"）

**根因**：`react-flow-builder` 的 `save` 回调将数据存入 `node.data`（`selectedNode.data = values`），但：
- `NodeConfigComponent` 初始化时只展开 `...(node as any)`，未展开 `node.data`
- 所有 12 个节点展示组件从 `node.collection`、`node.fields` 等顶层属性读取，实际数据在 `node.data` 中

**修复**：
1. `NodeConfigComponent` 初始化时同时展开 `node.data`
2. 所有展示组件统一从 `node.data` 读取配置：
```typescript
const node = useContext(NodeContext) as any;
const data = node.data || {};
const collection = data.collection || '未指定表';
const name = data.name || node.name || '默认名称';
```

**涉及文件**：
- `packages/renderer/src/workflow/config/NodeConfigComponent.tsx`
- `packages/renderer/src/workflow/nodes/` — 全部 12 个展示组件

---

### VariableTreeSelector 打开后无限渲染

**现象**：点击"选择变量"后控制台报 `Maximum update depth exceeded`

**根因**：`VariableTreeSelector` 的环境变量注册 `useEffect` 依赖了 `pageDataSources` 对象。父组件每次渲染都产生新引用，导致 useEffect 无限触发 → `setRefreshCounter` → 重渲染 → 新引用 → 循环。

**修复**：`pageDataSources` 已通过 `pageDataSourcesRef.current` 访问，从依赖数组中移除：
```typescript
// Before
}, [visible, resolvedPageComponents, pageDataSources]);
// After
}, [visible, resolvedPageComponents]);
```

**涉及文件**：
- `packages/renderer/src/components/VariableTreeSelector.tsx`

---

### 流程节点配置保存后丢失

**现象**：审批节点配置面板设置审批人后保存，重新打开面板时选中值丢失

**根因**：`react-flow-builder` 的 `save` 回调是直接替换 `node.data`（`selectedNode.data = values`），不是合并。旧代码将 BPMN 属性存在 `node.data` 里，但 `NodeConfigComponent` 从 `node.assignee` 读取（undefined），保存时写到 `node.assignee`（不进 `data`）。

**修复**：
1. `NodeConfigComponent` 初始化从 `node.data` 读取所有配置，保存时平铺传给 `save()`（成为新的 `node.data`）
2. `useBpmnConverter` 的 `fromBpmnDocument` 将 `name` 同时写入 `node.data.name`
3. `toBpmnDocument` 从 `node.data.name` 读取名称（优先于 `node.name`）

**关键发现**：`react-flow-builder` 的 `save` 回调源码：
```js
var saveDrawer = function saveDrawer(values) {
  selectedNode.data = values;  // 直接替换，不是 Object.assign 合并
};
```

### 审批人指派选择器回显 ID 而非名称

**现象**：按部门/角色/岗位选完审批人后，Tag 显示 `dept_93b3515d` 而非部门名称

**根因**：`AssigneeSelector` 的基础引用数据（部门/角色/岗位）仅在弹窗打开时加载，但 Tag 回显在弹窗关闭时就需要。`value` 变化时 `departments` 还是空数组，fallback 到显示 ID。

**修复**：基础引用数据（部门/角色/岗位）挂载时即加载，不限于弹窗打开状态。用户列表仍仅在弹窗打开时加载（数据量大）。

## 2026-07-03

### 流程设计器刷新后结束节点消失

**现象**：创建流程后画布上显示开始和结束节点，但刷新页面后结束节点消失

**根因**：`useBpmnConverter.ts` 的 `fromBpmnDocument` 函数使用了 **children 嵌套结构**，但 react-flow-builder 官方 demo 使用的是 **平级数组 + path 属性** 结构！

**官方 demo 正确格式**：
```js
[
  { type: 'start', name: '开始', path: ['0'] },
  { type: 'node', name: '普通节点', path: ['1'] },
  { type: 'end', name: '结束', path: ['2'] },  // ← 平级数组！
]
```

**错误实现**：
```js
// 错误：结束节点被嵌套在 children 里
{
  type: 'start',
  children: [
    { type: 'end' }  // ← 错误！
  ]
}
```

**修复**：
1. 重写 `fromBpmnDocument` 函数，使用 BFS 遍历生成平级数组
2. 每个节点都添加 `path` 属性
3. 只有 branch/condition 节点才有 children

**涉及文件**：
- `packages/renderer/src/workflow/hooks/useBpmnConverter.ts` — 重写转换逻辑

**教训**：
- 拿到官方示例后，必须逐字段对照，不要脑补格式
- react-flow-builder 的 `path` 属性是必须的，用于定位节点在流程中的位置

---

### 新建流程没有结束节点

**现象**：通过 API 创建新流程后，流程文件中只有元数据，没有 BPMN 节点结构（缺少开始/结束事件）

**根因**：`server/src/routes/apps.ts` 创建流程时，只添加了 `description`、`schema`、`status` 字段，但没有自动生成默认的 BPMN Schema 结构

**修复**：
1. 创建流程时，如果未提供 `schema`，自动生成包含 `StartEvent` + `EndEvent` 的默认 BPMN 结构
2. 默认结构包含：开始节点 → 结束节点，通过 SequenceFlow 连接
3. 更新现有空流程文件，补充默认节点

**涉及文件**：
- `server/src/routes/apps.ts` — 添加默认 Schema 生成逻辑
- `tenants/tenant_90ef6d72/apps/app_80e88653/workflows/workflow_bff536a1.json` — 补充默认节点

**教训**：
- 资源创建时应提供合理的默认值，避免用户面对空白画布无法操作

---

### 流程设计器默认节点格式错误及结束节点缺失

**现象**：
1. 流程设计器初始化时没有显示开始和结束节点
2. 结束节点放在了开始节点的 children 里，导致格式不符合 react-flow-builder 要求

**根因**：
1. **格式错误**：没有参考官方 demo，自创了 children 嵌套格式。官方 demo 要求平级数组 + `path` 属性
2. **结束节点缺失**：`react-flow-builder` 库内部会过滤 `isEnd` 节点，不在 + 号菜单中显示。结束节点必须在初始数据中提供

**修复**：
1. **默认节点格式**：改为官方 demo 的平级数组格式
2. **初始数据**：当 `value` 为空或 `processes` 为空时，使用默认的 `开始 -> 结束` 节点结构

**涉及文件**：
- `packages/renderer/src/workflow/designer/WorkflowDesigner.tsx`

**教训**：
- 拿到官方示例后，必须逐字段对照，不要脑补格式

---

### 资源删除后刷新又出现

**现象**：流程、自动化等资源删除后，刷新页面又出现了

**根因**：删除接口使用软删除（标记 `_deleted: true`），但扫描接口没有过滤 `_deleted` 标记

**修复**：
1. `workflows.ts`：`scanWorkflows` 和 `GET /:id` 添加 `_deleted` 过滤
2. `automations.ts`：`scanRules` 和 `GET /:id` 添加 `_deleted` 过滤
3. `apps.ts`：`scanAllResources` 添加 `_deleted` 过滤

**涉及文件**：
- `server/src/routes/workflows.ts`
- `server/src/routes/automations.ts`
- `server/src/routes/apps.ts`

---

## 2026-07-02 (续)

### 流程设计器弹窗闪烁及节点重置

**现象**：
1. 点击 + 号选择节点类型后，弹窗一闪而过，无法正常添加节点
2. 添加节点后节点消失，被重置为初始状态

**根因**：
1. **弹窗闪烁**：自定义 `PopoverComponent` 包装组件与 `react-flow-builder` 内部状态管理冲突。官方 demo 要求直接使用 antd `Popover` 组件，不做任何包装
2. **节点重置**：`onChange` 回调触发父组件更新 `value`，`useEffect` 检测到 `value` 变化后重新初始化节点，形成循环

**修复**：
1. **PopoverComponent**：直接使用 `Popover` 组件，不做包装：`PopoverComponent={Popover}`
2. **状态同步**：使用 `useRef` 标记内部更新，避免 `useEffect` 循环重置：
   ```tsx
   const isInternalUpdate = useRef(false);

   useEffect(() => {
     if (value && !isInternalUpdate.current) {
       setNodes(fromBpmnDocument(value));
     }
     isInternalUpdate.current = false;
   }, [value]);

   const handleChange = useCallback((newNodes) => {
     setNodes(newNodes);
     isInternalUpdate.current = true;
     onChange?.(toBpmnDocument(newNodes));
   }, [onChange]);
   ```

**涉及文件**：
- `packages/renderer/src/workflow/designer/WorkflowDesigner.tsx`

**教训**：
- 官方文档和 demo 是最权威的参考，不要自作主张"优化"
- React 受控组件的 `onChange` → `value` 循环是常见陷阱，必须用 ref 标记内部更新

---

## 2026-07-02

### 页面设计器开启水印报错

**现象**：页面设计器点击开启水印后，控制台报错 `InvalidStateError: Failed to execute 'drawImage' on 'CanvasRenderingContext2D': The image argument is a canvas element with a width or height of 0.`

**根因**：水印启用但未配置 `content` 或 `image` 时，antd Watermark 组件仍尝试渲染，导致内部 canvas 尺寸为 0。

**修复**：
1. **DesignCanvas.tsx**：水印启用但无 content/image 时，提供默认文案 `'水印'`
2. **PageRuntime.tsx**：运行时同样补充默认文案兜底

**涉及文件**：
- `packages/renderer/src/designer/panels/DesignCanvas.tsx`
- `frontend/src/components/PageRuntime.tsx`

---

## 2026-06-29 (续)

### 流程设计器添加按钮不显示

**现象**：流程设计器只有开始和结束节点，无法添加其他节点（没有 + 号按钮）。

**根因**：
1. `useBpmnConverter` 的 `fromBpmnDocument` 函数没有正确处理 BPMN edges 到 react-flow-builder 树形结构的转换
2. `react-flow-builder` 需要 `PopoverComponent` 属性才能显示添加按钮，但未提供

**修复**：
1. **useBpmnConverter.ts**：重写 `fromBpmnDocument` 和 `toBpmnDocument` 函数
   - `fromBpmnDocument`：从开始节点递归构建树形结构（`children` 属性）
   - `toBpmnDocument`：递归遍历树形结构生成 nodes 和 edges
2. **WorkflowDesigner.tsx**：添加 `PopoverComponent` 属性，使用 antd `Popover` 组件
3. **WorkflowDesigner.tsx**：为每个节点类型添加 `addableNodeTypes` 属性

**涉及文件**：
- `packages/renderer/src/workflow/hooks/useBpmnConverter.ts` — BPMN 转换器重写
- `packages/renderer/src/workflow/designer/WorkflowDesigner.tsx` — 添加 PopoverComponent 和 addableNodeTypes
- `packages/renderer/src/workflow/hooks/useBpmnConverter.test.ts` — 新增测试用例（13 个）
- `frontend/src/pages/WorkflowTestPage.tsx` — 新增调试用测试页面

**测试**：
```bash
cd packages/renderer && npx vitest run src/workflow/hooks/useBpmnConverter.test.ts
```

---

### AutomationLogViewer 导入错误

**现象**：`Uncaught SyntaxError: The requested module does not provide an export named 'SkipOutlined'`

**根因**：`@ant-design/icons` 中没有 `SkipOutlined` 图标

**修复**：将 `SkipOutlined` 替换为 `RightOutlined`

**涉及文件**：
- `frontend/src/designers/automation/AutomationLogViewer.tsx`

---

## 2026-06-29

### P0 任务完成

#### 1. 自动化设计器接入路由

- `AppDesignPage.tsx` 的 `ResourceDesigner` 新增 `automations` 分支
- `designers/index.ts` 导出 `AutomationDesign`
- 移除 `AutomationDesign` 中的 `window.location.href` 跳转（设计器 tab 模式下不应整页跳转）

#### 2. 数据表编辑器完善

- **字段类型扩展**：新增 `enum` 类型到 `TableFieldType`
- **字段约束系统**：新增 `StringFieldConstraints`、`NumberFieldConstraints`、`DateFieldConstraints`、`EnumFieldConstraints` 类型，`TableColumn` 新增 `constraints` 字段
- **索引管理**：新增 `TableIndex` 类型，`TableSchema` 新增 `indexes` 字段，`schema-builder.ts` 新增 `generateCreateIndexSQL` 和 `syncIndexes` 函数
- **校验规则**：新增 `ValidationRule` 类型，`TableColumn` 新增 `validations` 字段
- **设计器 UI**：字段表格新增"约束"列（Popover 按类型配置）和"校验"列（Popover 编辑规则列表），下方新增索引管理面板

#### 3. 前端 Mock 数据替换为真实 API

- **WorkspacePage**：删除 MOCK_TODOS/MOCK_NOTIFICATIONS/MOCK_APPS，改为从 API 加载
- **AppCenterPage**：发布按钮对接 `POST /api/apps/:appId/publish`
- **ConfigCenterPage**：用户/角色/权限/租户设置全部对接 API
- **新增服务端 API**：
  - `server/src/routes/users.ts` — 用户 CRUD（联查部门/岗位/角色）
  - `server/src/routes/roles.ts` — 角色 CRUD（内置角色保护）
  - `server/src/routes/permissions.ts` — 权限 CRUD + 矩阵查询
  - `server/src/routes/messages.ts` — 消息查询/已读操作

---

## 2026-06-27

### 1. QueryParamsPicker 表达式编辑入口不显示

**现象**：navigate 动作的"查询参数"字段，变量/表达式切换按钮不出现，无法配置表达式。

**根因**：`QueryParamsPicker` 内部的 `PropValueField` 未传 `label` prop，而 `PropValueField` 的 `ModeSelector` 只在 `label` 存在时才渲染。外层 `ParamField` 的 `label="查询参数"` 不会传递给 `PropValueField`。

**修复**：
- `QueryParamsPicker` 新增 `label` prop，透传给 `PropValueField`
- 移除外层 `ParamField` 包装，`label` 直接由 `PropValueField` 内部渲染

**涉及文件**：
- `packages/renderer/src/designer/panels/EventActionChainEditor.tsx` — QueryParamsPicker 接受 label prop，移除 ParamField 包装

---

### 2. ExpressionEngine 阻止 `$fetch` 上下文变量

**现象**：页面渲染时控制台报 `Expression validation failed: Blocked identifier: fetch`。

**根因**：`EnvironmentContext` 使用非 `$` 前缀的 key（如 `fetch`），而 `Renderer.tsx` 的 `envContext` 又创建了 `$fetch`。两者合并后 `runtimeContext` 同时包含 `fetch` 和 `$fetch`。`evaluateAsync` 构建表达式函数外壳时 `Object.keys(context)` 包含裸 `fetch`，安全校验正则 `(?<!\$)\bfetch\b` 将其拦截。

**修复**：`EnvironmentContext` 接口 key 统一改为 `$` 前缀（`user` → `$user`、`fetch` → `$fetch` 等），所有构建 context 的地方同步更新。

**涉及文件**：
- `packages/shared/src/types/environment.ts` — EnvironmentContext key 改为 $ 前缀
- `packages/shared/src/types/context.ts` — 同步 JSDoc
- `packages/renderer/src/core/RenderContext.ts` — RenderContextBuilder.build() 改用 $ 前缀
- `packages/renderer/src/core/Renderer.tsx` — envContext 从 $ 前缀 key 读值
- `packages/renderer/src/core/VariableBindingEngine.ts` — resolveVariable 保留 $ 前缀
- `frontend/src/components/PageRuntime.tsx` — buildContext 改用 $ 前缀

---

### 3. 异步 initialValue 表达式不生效

**现象**：Form.Item 的 `initialValue` 设为异步表达式（如 `return $route.query.b`），运行时初始值为空。

**根因**：antd `Form.Item` 只在首次挂载时读取 `initialValue`。异步表达式在组件挂载时还未求值，`initialValue` 为 `undefined`。后续表达式求值完成后 `withPlatform` 调用 `form.setFieldsValue()` 设置值，但 `Form.Item` 已挂载不再读取。

**修复**：引入表单预求值机制 — `FormWithProvider` 渲染子组件前调用 `preEvaluateForm()` 扫描子组件 expression bindings，按依赖拓扑序批量求值，结果写入 `BindingCache` + `form.setFieldsValue()`。子组件 `useBindings` 命中缓存直接复用。

**涉及文件**：
- `packages/renderer/src/core/BindingCache.ts` — 新增，表达式结果缓存
- `packages/renderer/src/core/FormPreEvaluator.ts` — 新增，表单预求值器
- `packages/renderer/src/hooks/useBindings.ts` — 查缓存逻辑
- `packages/renderer/src/libraries/antd/form/component.tsx` — 调用 preEvaluateForm
- `packages/renderer/src/core/Renderer.tsx` — 传递 _componentMap/_context 给表单
- `packages/renderer/src/components/platform/withPlatform.tsx` — PLATFORM_KEYS 增加新 props

---

### 4. resetForm 无法恢复正确的初始值

**现象**：表单字段手动修改后点击 resetForm 按钮，值没有恢复到初始值。

**根因**：`FormDataContextManager.getInitialValues()` 返回的 `initialValues` 为空。`handleValuesChange` 依赖 `onValuesChange` 回调捕获初始值，但 `onValuesChange` 在渲染阶段同步触发时 `managerRef.current` 还是 `null`（`useEffect` 未执行），导致初始值未被捕获。

**修复**：随表单预求值机制一并解决 — `useEffect` 中通过 `formInstance.getFieldsValue()` 主动读取预求值后的表单值作为初始值快照，存入 `initialValuesRef`。reset handler 闭包直接读 ref。

**涉及文件**：
- `packages/renderer/src/libraries/antd/form/component.tsx` — initialValuesRef + useEffect 捕获
