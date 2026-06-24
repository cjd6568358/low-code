---
description: 运行 lc-schema scan 重新生成 JSON Schema 文件并验证结果
---

组件 JSON Schema 同步命令。修改 `schema.ts` 后运行此命令重新生成 `.json` 文件。

## 用法

```
/schema-sync                    # 扫描所有组件
/schema-sync button             # 只扫描 button 组件
/schema-sync --verify           # 扫描后验证生成的 JSON 是否符合预期
```

## 执行流程

1. 运行 `npx lc-schema scan`（或按参数指定子目录）
2. 检查退出码和输出中的错误
3. 如果指定 `--verify`，抽样检查生成的 JSON 文件的完整性
4. 报告生成/更新的文件数量

## 关键约束

- **JSON Schema 文件不能手动编辑** — 只能从 `schema.ts` 通过此命令自动生成
- 生成的文件位于 `packages/renderer/src/libraries/antd/{component}/{component}.json`
- 修改组件属性必须在 `schema.ts` 中进行，然后运行此命令同步

## 为什么需要这个命令

在过去 30 天中，`lc-schema scan` 相关命令被调用了 **13 次**，跨越 **3 个会话**。每次都在尝试不同的调用方式（npx、yarn、tsx、直接路径），且经常遇到路径/权限问题。这个命令标准化了调用方式。
