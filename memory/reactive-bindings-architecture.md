---
name: reactive-bindings-architecture
description: 响应式绑定架构 — ReactiveEnvContext + useBindings + DependencyGraph 精准通知
metadata:
  type: project
---

## 响应式绑定架构（2026-06-21）

### 核心组件

1. **ReactiveEnvContext** (`packages/renderer/src/core/ReactiveEnvContext.ts`)
   - 统一管理所有环境变量（$user, $component, $data, $fetch 等）
   - `set(path, value)` 更新变量，通过 DependencyGraph 精准通知依赖组件
   - `getContext()` 返回稳定对象引用（不会因内部值变化而改变）
   - `getVersion()` 返回版本号，用于 React memoization

2. **useBindings** (`packages/renderer/src/hooks/useBindings.ts`)
   - 统一处理字面量、变量引用、表达式
   - 所有依赖统一注册到 DependencyGraph
   - 变量引用：同步解析，`setVarVersion` 触发重算
   - 表达式：异步执行，仅重算受影响的表达式
   - 无依赖的绑定不受其他变量变更影响

3. **DependencyGraph** (`packages/renderer/src/core/DependencyGraph.ts`)
   - `notifyVariableChange` 支持前缀匹配
   - `$component.xxx.value` 变更会通知依赖 `$component.xxx` 的绑定
   - 精准通知：只有依赖该路径的组件才重渲染

### 数据流

```
组件 onChange
  → reactiveCtx.set('$component.xxx.value', newValue)
  → DependencyGraph.notifyVariableChange('$component.xxx.value')
  → 前缀匹配找到依赖 $component.xxx 的绑定
  → setVarVersion → syncResolved 重算 → 组件重渲染
```

### 关键设计决策

- **上下文引用稳定**：`reactiveCtx.getContext()` 返回同一个对象，不会因内部值变化而改变引用
- **前缀匹配**：注册 `$component.xxx`，变更 `$component.xxx.value` 能正确通知
- **表达式自动调用**：`async () => { ... }` 形式的表达式会被自动调用，而不是返回函数引用
- **evaluateAsync**：支持 await 的异步求值方法，用于数据源和异步表达式

**Why:** 之前变量引用和表达式使用两套独立的依赖管理逻辑，变更通知不精准，无依赖的表达式也会被重新计算。

**How to use:** 页面运行时使用 `ReactiveEnvContext` 管理环境变量，组件使用 `ResolvedComponent` + `useBindings` 解析绑定。
