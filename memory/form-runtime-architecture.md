---
name: form-runtime-architecture
description: 表单运行时架构设计文档：初始值注入、联动执行引擎、组件事件桥接+动作系统+弹框栈机制的实现方案
metadata:
  node_type: memory
  type: reference
  originSessionId: eb309d1e-7e07-4532-a27a-1d6da53feaa2
---

已创建 `docs/form-runtime-architecture.md`，作为 `docs/form-engine.md` 的运行时实现层补充。表单引擎现为自动渲染引擎的子模块。

文档覆盖四个核心机制：

1. **初始值注入 (FormDataContext)** — 统一数据模型，支持 5 种来源（默认值/URL参数/草稿/业务数据/快照），按优先级合并，初始化时静默执行联动
2. **联动执行引擎 (LinkageEngine)** — 触发索引 + DAG 拓扑排序 + 批量更新，支持值联动/选项联动/显隐联动/属性联动的运行时执行，含循环依赖检测
3. **组件事件桥接 (EventBridge + ActionSystem)** — 组件保持纯净只触发原生事件，桥接层将设计器配置的事件 Schema 编译为可执行函数，定义了 17 种标准动作类型（setValue/submit/apiCall/customScript 等）
4. **弹框栈机制 (ModalStack)** — `showModal` 返回 Promise 阻塞 action chain，`closeModal` 携带 result resolve 该 Promise，通过栈结构支持多层弹框嵌套（A→B→C 逐级返回），级联关闭防止幽灵弹框
5. **组件方法调用 (ComponentMethodRegistry)** — `invokeMethod` 动作通过注册表查找并执行组件方法。组件树渲染前预注册空壳处理器（解决渲染顺序依赖），组件挂载后通过 `useComponentMethods` hook 注册真实实现。设计时从 `ComponentRegistration.methods` 收集可用方法，支持内置组件（7 种 18 个方法）和自定义卡片（CardRenderer.createMethodInvoker 自动注册 interface.methods）。`RendererConfig.cardDefinitions` 传入卡片定义

关键实现文件：
- `packages/renderer/src/core/ModalStack.ts` — 弹框栈管理器
- `packages/shared/src/types/actions.ts` — ActionContext 类型（showModal 返回 Promise，closeModal 接受 result）
- `packages/renderer/src/core/ActionRegistry.ts` — showModal/closeModal 执行器
- `packages/renderer/src/core/Renderer.tsx` — 注入 ModalStack 到 ActionContext
- `packages/renderer/src/core/ComponentMethodRegistry.ts` — 组件方法注册表
- `packages/renderer/src/components/ComponentMethodRegistryContext.tsx` — React Context + useComponentMethods hook
- `packages/renderer/src/libraries/antd/component-methods.ts` — 内置组件方法元数据声明

关联文档：[[workflow-node-snapshot]]、form-engine.md、auto-rendering-engine.md
