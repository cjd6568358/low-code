---
name: workflow-node-snapshot
description: 流程引擎采用流出快照设计，流程期间数据只在快照表，审批结束才回写业务表
metadata: 
  node_type: memory
  type: project
  originSessionId: c463d65b-b618-4728-946e-624ff6d1c3ef
---

流程引擎数据快照设计决策（2026-06-04）：

- **触发方式**：采用按钮点击配置触发流程（非数据表 CREATE 触发），支持多按钮触发不同流程
- **快照粒度**：每个节点**流出时**捕获一次快照（流出快照），非进出都捕获
- **数据归属**：流程期间数据**只在快照表**，业务表不参与；审批结束后终态数据回写业务表
- **快照类型**：INITIAL（启动）| NODE_COMPLETE（节点流出）| NODE_REJECT（驳回流出）| FINAL（终态）| TERMINATED（终止）
- **变更追踪**：`changedFields` 字段记录相对上一快照的增量变更，支持子表单行级变更追踪
- **存储设计**：独立 `workflow_snapshots` 表，数据只读不可变
- **节点表单**：每个审批节点可独立配置表单视图（readonly/editable/hidden），数据从快照表加载

**Why:** 审批过程中每个节点都有可能修改表单数据（审批人填写附加字段、数据操作节点自动写入等），流程期间数据只在快照表可避免业务表处于不一致状态，审批结束后一次性回写终态数据更干净。

**How to apply:**
- 流程启动：业务表写草稿占位（status=pending），初始快照写入快照表
- 节点处理：从快照表加载最新流出快照渲染表单，节点流出时写入新快照（业务表不动）
- 审批结束：终态快照数据回写业务表，status 更新为终态
- 参见 [workflow-engine.md](docs/workflow-engine.md) 快照机制章节
