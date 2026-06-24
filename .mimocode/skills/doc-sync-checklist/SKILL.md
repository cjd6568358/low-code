---
description: 文档同步检查表 — 每次代码改动后执行，确保所有相关文档已更新
---

代码改动后执行文档同步检查，确保没有遗漏任何需要更新的文档。

## 用法

```
/doc-sync                   # 根据最近的代码改动自动检查
/doc-sync --files file1,file2  # 指定改动的文件列表
```

## 执行流程

1. 如果未指定 `--files`，通过 `git diff --name-only HEAD~1` 获取最近改动的文件
2. 对照以下检查表，确定哪些文档需要同步：

| 改动类型 | 必须同步的文档 |
|---------|--------------|
| 目录结构变更 | README.md、CLAUDE.md |
| API 接口变更 | README.md |
| 数据库 Schema 变更 | docs/data-layer.md |
| 引擎能力变更 | 对应的 docs/xxx-engine.md |
| 租户/应用模型变更 | docs/application.md、docs/tenant-admin.md |
| 权限/角色变更 | docs/permission-engine.md、docs/tenant-admin.md |
| 设计器变更 | docs/render-engine.md |
| 新增/删除资源类型 | README.md、docs/application.md、docs/render-engine.md |
| 种子数据变更 | docs/tenant-delivery/山水集团-租户交付文档.md |
| 全局字典变更 | docs/system-dictionaries.md |
| 技术难点/设计决策 | TODO.md |
| 启动命令变更 | README.md、CLAUDE.md |

3. 检查每个需要更新的文档是否已被修改
4. 列出遗漏的文档更新
5. 在响应末尾输出："已同步文档：xxx、xxx" 或 "需要更新：xxx（未更新）"

## 为什么需要这个技能

文档同步检查表已在 CLAUDE.md 中定义，但执行依赖人工记忆。在过去 30 天的会话中，文档遗漏更新是反复出现的问题。这个技能将检查表转化为可执行的自动化流程。
