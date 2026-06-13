---
name: sync-requirements-to-docs
description: 所有会话中提到的需求必须同步到对应文档，不能遗漏
metadata:
  type: feedback
---

所有会话中提到的需求、设计决策、功能变更都必须同步更新到对应文档中，不能有遗漏。

**文档同步清单：**
- README.md — 项目概述、功能列表、快速开始、技术栈
- docs/application.md — 应用管理相关需求
- docs/tenant-admin.md — 租户管理后台相关需求
- docs/permission-engine.md — 权限引擎相关需求
- docs/workflow-engine.md — 流程引擎相关需求
- docs/render-engine.md — 渲染引擎/设计器相关需求
- docs/tenant-delivery/ — 租户交付文档
- CLAUDE.md — 架构说明、常用命令

**Why:** 文档是交付物的一部分，需求只在会话中提到但不同步到文档会导致信息丢失，后续会话无法追溯。

**How to apply:** 每次实现功能或做出设计决策后，立即检查哪些文档需要更新并同步。不要等到会话结束才补文档。
