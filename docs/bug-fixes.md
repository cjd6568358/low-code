# Bug 修复记录

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
