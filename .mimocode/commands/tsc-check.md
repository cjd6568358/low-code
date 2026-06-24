---
description: TypeScript 类型检查 - 支持按包/文件/组件过滤，自动排除已知噪音
---

TypeScript 类型检查命令。支持以下用法：

## 用法

```
/tsc-check                          # 检查 renderer 包（最常用）
/tsc-check renderer                 # 检查 renderer 包
/tsc-check frontend                 # 检查 frontend 包
/tsc-check shared                   # 检查 shared 包
/tsc-check all                      # 检查所有包
/tsc-check renderer --filter MonacoEditor  # 过滤特定组件/文件
/tsc-check renderer --focus VariablePicker # 只看特定组件的错误
```

## 执行流程

1. 根据 `$ARGUMENTS` 确定目标包（默认 `renderer`）
2. 运行 `npx tsc --noEmit --project packages/{pkg}/tsconfig.json 2>&1`
3. 自动过滤已知噪音（TS6305/TS6307/UnifiedDependencyGraph 等项目特有的非错误输出）
4. 如果指定了 `--filter`，排除匹配的错误行
5. 如果指定了 `--focus`，只显示匹配的错误行
6. 汇总错误数量，按文件分组展示

## 已知噪音模式

以下 TypeScript 输出在本项目中不是真正的错误，应自动排除：
- `TS6305` — 输出文件未被项目引用（项目 monorepo 结构导致）
- `TS6307` — 同上
- `UnifiedDependencyGraph` — tsc build mode 的内部信息
- `MonacoEditor` 相关 — 第三方编辑器类型声明问题（已知，不修复）

## 为什么需要这个命令

在过去的 30 天中，`npx tsc --noEmit` 变体被调用了 **409 次**，跨越 **24 个会话**。每次会话都在重新发明相同的命令和过滤逻辑。这个命令将所有变体统一为一个标准入口。
