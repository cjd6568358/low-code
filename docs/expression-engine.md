# 表达式引擎

> 最后更新：2026-07-14

## 概述

表达式引擎是 `@low-code/shared` 包的核心模块，为渲染器（前端）和自动化引擎（后端）提供统一的表达式求值能力。

**文件**：`packages/shared/src/engine/expression.ts`

## 核心能力

| 能力 | 方法 | 说明 |
|------|------|------|
| 同步求值 | `evaluate()` | 标准表达式求值，返回 Promise |
| 同步安全求值 | `safeEvaluateSync()` | 同步版本，用于渲染路径等同步上下文 |
| 异步求值 | `evaluateAsync()` | 支持 `ExpressionBinding` 和纯字符串两种模式 |
| 模板插值 | `resolveTemplate()` | 解析 `{{path}}` 模板变量 |
| 依赖分析 | `analyzeDependencies()` | 提取表达式中 `$variable.path` 形式的引用 |
| 语法校验 | `validate()` | 检查禁止引用、括号平衡、语法合法性 |

## 安全沙箱

表达式在 `new Function()` 沙箱中执行，禁止访问以下全局对象：

`globalThis`、`global`、`window`、`self`、`top`、`parent`、`frames`、`document`、`location`、`navigator`、`history`、`fetch`、`XMLHttpRequest`、`WebSocket`、`Worker`、`importScripts`、`require`、`module`、`exports`、`process`、`__dirname`、`__filename`

通过 `findForbiddenReferences()` 在求值前检测，命中则抛出 `reference` 类型错误。

## 性能优化

### 正则预编译

禁止全局变量的检测正则在模块加载时一次性创建，避免每次求值重建 22 个 RegExp 对象。

```typescript
const FORBIDDEN_REGEXES = FORBIDDEN_GLOBALS.map(
  global => ({ name: global, regex: new RegExp(`\\b${global}\\b`, 'g') })
);
```

### 表达式编译缓存

`new Function()` 是 V8 无法优化的热路径——每次调用都要解析字符串 → 生成 AST → 编译为机器码。对于一个页面 50 个表达式 × 每次用户输入触发联动的场景，每秒可达上千次编译。

**策略**：以 `${expression}::${contextKeys.join(',')}` 为 key 缓存编译后的函数，同一表达式在运行期间只编译一次，后续直接复用。

```typescript
const compiledCache = new Map<string, Function>();
const asyncCompiledCache = new Map<string, Function>();

private getOrCompile(expression: string, contextKeys: string[], cache: Map<string, Function>, async_?: boolean): Function {
  const key = `${expression}::${contextKeys.join(',')}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const Ctor = async_ ? AsyncFunction : Function;
  const fn = new Ctor(...contextKeys, `"use strict"; return (${expression})`);
  cache.set(key, fn);
  return fn;
}
```

**缓存覆盖范围**：

| 方法 | 缓存 | 说明 |
|------|------|------|
| `evaluate()` | `compiledCache` | 标准同步求值 |
| `safeEvaluateSync()` | `compiledCache` | 同步安全求值 |
| `evaluateAsync()` 字符串模式 | `asyncCompiledCache` | 异步表达式使用 AsyncFunction 构造器 |
| `evaluateAsync()` ExpressionBinding 模式 | `compiledCache` | 内联缓存，sandboxCode 含完整包装 |

**效果**：从 O(n) 次 `new Function` 编译降到 O(1)，首次调用编译并缓存，后续调用直接命中。

## 使用方式

### 全局单例

```typescript
import { expressionEngine } from '@low-code/shared';

// 求值
const result = await expressionEngine.evaluate('$form.name.value + " hello"', {
  $form: { name: { value: '张三' } }
});
// => "张三 hello"

// 依赖分析
const deps = expressionEngine.analyzeDependencies('$form.name.value + $form.age.value');
// => ['$form.age.value', '$form.name.value']
```

### 创建独立实例

```typescript
import { createExpressionEngine } from '@low-code/shared';

const engine = createExpressionEngine({
  defaultTimeout: 3000,
  strictMode: true,
});
```
