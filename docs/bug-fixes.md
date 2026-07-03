# Bug 修复记录

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
