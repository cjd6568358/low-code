# 流程引擎 (Workflow Engine)

支持业务流程的可视化编排与自动化执行。

## 触发方式

上层封装提供 3 种触发入口，底层统一调用 `POST /api/apps/:appId/workflows/:id/trigger`：

| 触发入口 | 说明 |
|---------|------|
| **手动触发** | 用户通过 API 或管理界面直接触发流程 |
| **表单按钮触发** | 表单页面按钮配置 `triggerWorkflow` action，提交时自动触发 |
| **自动化定时触发** | 自动化引擎规则动作配置 `trigger_workflow`，由事件/定时任务驱动 | |

### 按钮触发模型

表单页面通过按钮配置触发流程，支持多按钮触发不同流程：

```
┌─────────────────────────────────────────────────────────────┐
│                      表单页面                                │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 保存草稿  │  │  提交审批     │  │ 直接提交      │          │
│  │ (无流程)  │  │ (触发流程A)   │  │ (触发流程B)   │          │
│  └──────────┘  └──────────────┘  └──────────────┘          │
│       │              │                  │                   │
│       ▼              ▼                  ▼                   │
│   仅落库         业务表写草稿       业务表写草稿              │
│                  + 写快照表         + 写快照表               │
│                  + 启动流程         + 启动流程               │
└─────────────────────────────────────────────────────────────┘
```

#### 按钮配置 Schema

```jsonc
{
  "type": "submit",
  "label": "提交审批",
  "actions": [
    {
      "type": "saveRecord",
      "tableId": "orders"
    },
    {
      "type": "triggerWorkflow",
      "workflowId": "wf_order_approval",
      "snapshotOptions": {
        "fields": ["orderNo", "amount", "items", "applicant"],
        "includeComputedFields": true
      }
    }
  ]
}
```

#### 执行时序

```
用户点击"提交审批"按钮
  │
  ├─ 1. 表单校验（Level 1~3 客户端校验）
  │
  ├─ 2. 业务表写入草稿记录（status = pending，仅占位）
  │
  ├─ 3. 服务端校验（Level 4）
  │
  ├─ 4. 初始快照写入快照表（snapshotType: INITIAL）
  │
  └─ 5. 启动流程实例（workflowService.start）
```

## 流程能力

- **流程分支**：支持条件分支、并行分支、排他网关等常见流程控制
- **审批节点**：支持人工审批、会签、或签等审批模式
- **数据操作节点**：支持对接第三方数据库，实现跨库数据读写
- **自动化节点**：支持调用外部 API、发送通知等自动化操作
- **节点级快照**：每个节点流出时自动捕获数据快照，支持完整溯源

### 流程示例

```
[触发] ──▶ [条件判断] ──┬──▶ [审批节点A] ──▶ [数据库操作] ──▶ [结束]
                        │
                        └──▶ [审批节点B] ──▶ [API调用]   ──▶ [结束]
```

---

## 数据存储模型

### 核心原则：流程期间数据只在快照表

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   业务数据表 (orders)          流程快照表 (workflow_snapshots)        │
│   ┌─────────────────┐         ┌─────────────────────────┐          │
│   │ 仅存最终态数据    │         │ 存储流程全生命周期数据    │          │
│   │ 流程期间不修改    │         │ 每个节点流出时写入快照    │          │
│   │ 审批结束才回写    │         │ 流程期间所有读写在此表    │          │
│   └─────────────────┘         └─────────────────────────┘          │
│                                                                     │
│   流程启动 ──▶ 业务表写草稿(status=pending) + 初始快照写入快照表      │
│   流程流转 ──▶ 业务表不动，快照表持续记录每节点流出数据               │
│   审批结束 ──▶ 最终快照数据回写业务表，业务表 status 更新为终态       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 数据生命周期

```
┌─────────────────────────────────────────────────────────────────────┐
│                        流程实例生命周期                               │
│                                                                     │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐        │
│  │ 流程启动  │──▶│ 节点A    │──▶│ 节点B    │──▶│ 流程结束  │        │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘        │
│       │              │              │              │                │
│       ▼              ▼              ▼              ▼                │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐        │
│  │ 初始快照  │   │ A流出快照 │   │ B流出快照 │   │ 终态快照  │        │
│  │(快照表)   │   │(快照表)   │   │(快照表)   │   │(快照表)   │        │
│  └──────────┘   └──────────┘   └──────────┘   └────┬─────┘        │
│                                                     │               │
│                                                     ▼               │
│                                              ┌──────────┐          │
│                                              │ 回写业务表 │          │
│                                              │(终态数据)  │          │
│                                              └──────────┘          │
│                                                                     │
│  业务表: [草稿占位] ──────────────────────────── [终态数据回写]       │
│  快照表: 初始 ──▶ 节点A流出 ──▶ 节点B流出 ──▶ 终态                   │
└─────────────────────────────────────────────────────────────────────┘
```

**各阶段数据归属：**

| 阶段 | 业务数据表 | 快照表 | 说明 |
|------|-----------|--------|------|
| 流程启动 | 写入草稿记录（status=pending） | 写入初始快照（INITIAL） | 业务表仅占位，实际数据在快照表 |
| 节点A处理 | **不动** | 节点A流出时写入快照（NODE_COMPLETE） | 所有修改在快照表 |
| 节点B处理 | **不动** | 节点B流出时写入快照（NODE_COMPLETE） | 所有修改在快照表 |
| 审批驳回 | **不动** | 驳回时写入快照（NODE_REJECT） | 驳回到某节点重新处理 |
| 流程结束 | **回写终态数据**，status 更新为终态 | 写入终态快照（FINAL） | 快照表数据同步到业务表 |
| 流程终止 | status 更新为 cancelled | 写入终止快照（TERMINATED） | 业务表恢复为草稿或删除 |

---

## 快照机制

### 设计目标

- 每个节点**流出时**捕获一次快照（流出快照）
- 流程期间所有数据读写基于快照表，业务表不参与
- 审批结束时将终态快照数据回写业务表
- 快照数据不可变，形成完整变更链

### 快照表设计

```sql
-- 流程快照表（流程期间的数据载体，审批结束后数据回写业务表）
CREATE TABLE workflow_snapshots (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  instance_id     INTEGER NOT NULL,           -- 流程实例ID
  node_id         TEXT,                       -- 节点定义ID（初始快照为 NULL）
  node_name       TEXT,                       -- 节点名称（冗余，方便查询）
  source_id       TEXT NOT NULL,              -- 业务记录ID
  source_table    TEXT NOT NULL,              -- 业务表名
  data            TEXT NOT NULL,              -- 完整快照数据（JSON，该节点流出时的全量数据）
  changed_fields  TEXT,                       -- 相对上一快照的变更字段明细（JSON）
  snapshot_type   TEXT NOT NULL,              -- INITIAL | NODE_COMPLETE | NODE_REJECT | FINAL | TERMINATED
  operator_id     TEXT,                       -- 操作人ID
  operator_name   TEXT,                       -- 操作人姓名（冗余）
  comment         TEXT,                       -- 操作备注（如审批意见）
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_snapshots_instance ON workflow_snapshots (instance_id);
CREATE INDEX idx_snapshots_source ON workflow_snapshots (source_table, source_id);
```

### 流程期间数据读写

```
┌─────────────────────────────────────────────────────────────┐
│                    审批节点处理                               │
│                                                             │
│  1. 加载数据：从快照表读取上一节点的流出快照                    │
│     └─ SELECT data FROM workflow_snapshots                  │
│        WHERE instance_id = ? ORDER BY id DESC LIMIT 1       │
│                                                             │
│  2. 渲染表单：基于快照数据 + 节点表单配置渲染                  │
│     └─ 快照数据填充只读区域                                   │
│     └─ 节点配置决定可编辑区域                                 │
│                                                             │
│  3. 用户操作：审批 / 填写 / 驳回                              │
│                                                             │
│  4. 写回快照：节点流出时捕获新快照                             │
│     └─ 合并只读数据 + 用户填写数据                             │
│     └─ 计算 changedFields（对比上一快照）                     │
│     └─ INSERT INTO workflow_snapshots (...)                 │
│                                                             │
│  5. 业务表：全程不动                                         │
└─────────────────────────────────────────────────────────────┘
```

### 审批结束回写业务表

```
┌─────────────────────────────────────────────────────────────┐
│                    流程结束处理                               │
│                                                             │
│  1. 获取终态快照                                             │
│     └─ 最后一个 NODE_COMPLETE 快照的 data                    │
│                                                             │
│  2. 写入终态快照                                             │
│     └─ INSERT INTO workflow_snapshots                       │
│        (snapshot_type = 'FINAL', data = 终态数据)            │
│                                                             │
│  3. 回写业务表                                               │
│     └─ UPDATE orders SET                                    │
│          orderNo = snapshot.data.orderNo,                   │
│          amount = snapshot.data.amount,                     │
│          items = snapshot.data.items,                       │
│          status = 'approved',                               │
│          ...                                                │
│        WHERE id = source_id                                 │
│                                                             │
│  4. 更新流程实例状态                                         │
│     └─ UPDATE workflow_instances SET status = 'completed'   │
└─────────────────────────────────────────────────────────────┘
```

### 快照数据结构

```jsonc
{
  "id": 1002,
  "instanceId": 5001,
  "nodeId": "node_approval_01",
  "nodeName": "部门经理审批",
  "sourceId": "order_2024001",
  "sourceTable": "orders",
  "snapshotType": "NODE_COMPLETE",          // 该节点流出时的快照
  "operatorId": 2001,
  "operatorName": "张三",
  "comment": "同意，金额合理",
  "data": {
    "orderNo": "ORD-2024-001",
    "amount": 50000,
    "status": "pending",                    // 流程期间业务状态始终为 pending
    "applicant": "李四",
    "items": [
      { "productName": "产品A", "quantity": 10, "unitPrice": 3000 },
      { "productName": "产品B", "quantity": 5, "unitPrice": 4000 }
    ],
    "approvalRemark": "金额合理，同意",      // 审批人在该节点填写
    "budgetCode": "B2024-003"
  },
  "changedFields": {
    "approvalRemark": { "from": null, "to": "金额合理，同意" },
    "budgetCode": { "from": null, "to": "B2024-003" }
  },
  "createdAt": "2024-01-16T14:30:00Z"
}
```

### changedFields 变更追踪

`changedFields` 记录相对上一快照的增量变更，支持精确溯源：

```jsonc
// 粒度到子表单行级别
{
  "amount": { "from": 45000, "to": 50000 },
  "items": {
    "type": "subform",
    "changes": [
      { "action": "update", "index": 0, "field": "quantity", "from": 8, "to": 10 },
      { "action": "add", "index": 2, "value": { "productName": "产品C", "quantity": 3 } },
      { "action": "delete", "index": 1, "value": { "productName": "产品D", "quantity": 2 } }
    ]
  }
}
```

### 快照服务接口

```typescript
interface SnapshotService {
  /** 捕获流出快照 */
  capture(params: CaptureParams): Promise<Snapshot>;

  /** 获取流程实例的完整快照链 */
  getSnapshotChain(instanceId: string): Promise<Snapshot[]>;

  /** 获取最新的流出快照（用于下一节点渲染） */
  getLatestSnapshot(instanceId: string): Promise<Snapshot>;

  /** 对比两个快照的差异 */
  diff(snapshotIdA: string, snapshotIdB: string): Promise<SnapshotDiff>;

  /** 回写终态快照数据到业务表 */
  commitToSourceTable(instanceId: string): Promise<void>;

  /** 获取业务记录关联的所有流程快照 */
  getSnapshotsByRecord(sourceTable: string, sourceId: string): Promise<Snapshot[]>;
}

interface CaptureParams {
  instanceId: string;
  nodeId?: string;
  nodeName?: string;
  sourceTable: string;
  sourceId: string;
  data: Record<string, any>;
  snapshotType: 'INITIAL' | 'NODE_COMPLETE' | 'NODE_REJECT' | 'FINAL' | 'TERMINATED';
  operatorId?: string;
  operatorName?: string;
  comment?: string;
  /** 上一快照ID，用于计算 changedFields */
  previousSnapshotId?: string;
}
```

---

## 节点类型与快照行为

### 节点类型总览

| 节点类型 | BPMN 类型 | 说明 | 可修改数据 | 流出快照 |
|---------|-----------|------|-----------|---------|
| **开始节点** | `bpmn:StartEvent` | 流程起点 | ❌ | 不产生 |
| **结束节点** | `bpmn:EndEvent` | 流程终点 | ❌ | 终态快照 |
| **审批节点** | `bpmn:UserTask` | 人工审批 | ✅ | 完成/驳回时捕获 |
| **条件节点** | `bpmn:ExclusiveGateway` | 条件分支 | ❌ | 不产生 |
| **并行节点** | `bpmn:ParallelGateway` | 并行分支 | 取决于子节点 | 汇聚时合并 |
| **延时节点** | `bpmn:TimerEvent` | 定时等待 | ❌ | 执行后捕获 |
| **通知节点** | `bpmn:SendTask` | 消息通知 | ❌ | 执行后捕获 |
| **自动化节点** | `bpmn:ServiceTask` | API调用/表达式执行 | ✅ | 执行后捕获 |
| **计算节点** | `bpmn:ScriptTask` | 同步表达式计算 | ✅（写入结果） | 执行后捕获 |
| **创建记录** | `bpmn:CreateTask` | 创建数据记录 | ✅ | 执行后捕获 |
| **更新记录** | `bpmn:UpdateTask` | 更新数据记录 | ✅ | 执行后捕获 |
| **查询记录** | `bpmn:QueryTask` | 查询数据记录 | ❌（只读） | 执行后捕获 |
| **删除记录** | `bpmn:DeleteTask` | 删除数据记录 | ✅ | 执行后捕获 |

### 审批节点快照

```
┌─────────────────────────────────────────────────────────────┐
│                    审批节点                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  表单数据（从上一节点流出快照加载）                      │    │
│  │  ┌──────────────┐  ┌──────────────┐                 │    │
│  │  │ 只读区域      │  │ 可编辑区域    │                 │    │
│  │  │ · 订单号      │  │ · 审批意见    │                 │    │
│  │  │ · 金额        │  │ · 预算编码    │                 │    │
│  │  │ · 商品明细    │  │ · 附加备注    │                 │    │
│  │  └──────────────┘  └──────────────┘                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  同意     │  │  驳回     │  │  转办     │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│       │                                                      │
│       ▼                                                      │
│  1. 校验可编辑区域                                             │
│  2. 合并数据（只读 + 可编辑）                                   │
│  3. 写入流出快照（快照表，snapshotType: NODE_COMPLETE）         │
│  4. 流转到下一节点（业务表不动）                                │
└─────────────────────────────────────────────────────────────┘
```

### 数据操作节点快照

```jsonc
// 节点定义
{
  "nodeId": "node_data_op_01",
  "type": "dataOperation",
  "name": "更新库存",
  "operations": [
    {
      "type": "update",
      "target": "snapshot",               // 操作目标：snapshot（快照表）| source（业务表）
      "field": "items[].stock",
      "expression": "items.quantity * 2"  // 基于快照数据计算
    }
  ]
}
```

> 注意：数据操作节点默认操作快照表数据，而非直接操作业务表。只有显式配置 `target: "source"` 时才直接操作业务表（用于跨库数据写入等场景）。

### 并行分支快照

```
                ┌──▶ [审批节点A] ──▶ 流出快照A ──┐
[并行网关] ─────┤                                 ├──▶ [汇聚网关] ──▶ 合并流出快照
                └──▶ [审批节点B] ──▶ 流出快照B ──┘

合并快照 = 合并快照A和快照B的所有字段变更
若冲突（同一字段被两个分支修改），以配置的冲突策略为准：
  - firstWin: 以第一个完成的分支为准
  - lastWin: 以最后一个完成的分支为准
  - error: 报错，需人工干预
```

---

## 节点表单配置

每个流程节点可配置独立的表单视图，控制当前节点参与者可查看和编辑的字段。

### 节点表单 Schema

```jsonc
{
  "nodeId": "node_approval_01",
  "type": "approval",
  "name": "部门经理审批",
  "formConfig": {
    "inheritFrom": "sourceForm",           // 继承来源表单
    "overrides": [
      {
        "field": "orderNo",
        "permission": "readonly"           // readonly | editable | hidden
      },
      {
        "field": "amount",
        "permission": "readonly"
      },
      {
        "field": "approvalRemark",
        "permission": "editable",
        "validation": { "required": true, "maxLength": 500 }
      },
      {
        "field": "budgetCode",
        "permission": "editable",
        "label": "预算编码",
        "validation": { "pattern": "^B\\d{4}-\\d{3}$" }
      }
    ],
    "subFormOverrides": [
      {
        "field": "items",
        "permission": "readonly",          // 整体只读
        "columnOverrides": [
          { "column": "quantity", "permission": "editable" }  // 仅数量可编辑
        ]
      }
    ]
  }
}
```

### 节点表单渲染流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 从快照表加载  │────▶│ 应用节点覆盖  │────▶│ 合并权限控制  │
│ 最新流出快照  │     │ 配置          │     │ (字段级)     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │ 渲染节点表单  │
                                          │ (含可编辑区)  │
                                          └──────┬───────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │ 用户提交      │
                                          │ → 合并数据    │
                                          │ → 写入流出快照│
                                          │ → 流转下一节点│
                                          └──────────────┘
```

---

## 流程版本管理

### 流程定义版本化

```sql
CREATE TABLE workflow_definitions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_key  TEXT NOT NULL,              -- 流程标识（不变）
  version       INTEGER NOT NULL,           -- 版本号
  name          TEXT,
  schema        TEXT NOT NULL,              -- 流程定义 JSON
  status        TEXT,                       -- DRAFT | PUBLISHED | ARCHIVED
  created_by    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (workflow_key, version)
);
```

**版本规则：**

- 修改已发布的流程时，自动创建新版本（version + 1）
- 运行中的流程实例绑定创建时的版本号，不受新版本影响
- 支持将运行中的实例迁移到新版本（需兼容性校验）

### 流程实例

```sql
CREATE TABLE workflow_instances (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_def_id     INTEGER NOT NULL REFERENCES workflow_definitions(id),
  workflow_key        TEXT NOT NULL,
  version             INTEGER NOT NULL,
  source_table        TEXT,
  source_id           TEXT,
  current_snapshot_id INTEGER,
  current_node_id     TEXT,                  -- 当前执行节点ID
  status              TEXT CHECK (status IN ('running', 'waiting', 'pending', 'completed', 'rejected', 'cancelled', 'failed', 'terminated')),
  variables           TEXT,                  -- 流程变量（JSON）
  checkpoint          TEXT,                  -- 检查点（JSON，延时节点等场景）
  started_by          TEXT,
  started_by_name     TEXT,
  started_at          TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at        TEXT
);
```

### 流程任务（审批任务）

```sql
CREATE TABLE workflow_tasks (
  id            TEXT PRIMARY KEY,
  instance_id   INTEGER NOT NULL REFERENCES workflow_instances(id),
  node_id       TEXT NOT NULL,
  node_name     TEXT,
  assignee_id   TEXT,                        -- 审批人ID
  assignee_name TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'completed', 'rejected', 'cancelled')),
  form_data     TEXT,                        -- 审批表单数据（JSON）
  comment       TEXT,                        -- 审批意见
  due_date      TEXT,
  completed_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 节点执行记录（Job）

参考 NocoBase 的 jobs 表设计，每个节点执行完产生一条 job 记录，用于审计追溯和重试机制。

```sql
CREATE TABLE workflow_jobs (
  id            TEXT PRIMARY KEY,
  instance_id   INTEGER NOT NULL REFERENCES workflow_instances(id),
  node_id       TEXT NOT NULL,
  node_key      TEXT,                        -- 跨版本稳定的节点引用
  upstream_id   TEXT,                        -- 上游Job ID（链式记录执行路径）
  status        TEXT NOT NULL
                  CHECK (status IN ('pending', 'resolved', 'failed', 'error', 'aborted', 'retry_needed')),
  result        TEXT,                        -- 节点输出结果（JSON）
  meta          TEXT,                        -- 元数据（JSON，如审批意见、重试次数等）
  error         TEXT,
  retry_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 溯源与对比

### 快照链查询

```typescript
// 获取流程实例的完整流出快照链
const chain = await snapshotService.getSnapshotChain('instance_5001');

// 返回有序快照列表
// [
//   { seq: 0, snapshotType: 'INITIAL',       nodeName: null,             operatorName: '李四', createdAt: '...' },
//   { seq: 1, snapshotType: 'NODE_COMPLETE',  nodeName: '部门经理审批',   operatorName: '张三', createdAt: '...' },
//   { seq: 2, snapshotType: 'NODE_COMPLETE',  nodeName: '财务审批',       operatorName: '王五', createdAt: '...' },
//   { seq: 3, snapshotType: 'FINAL',          nodeName: '流程结束',       operatorName: null,   createdAt: '...' },
// ]
```

### 快照对比

```typescript
// 对比任意两个快照
const diff = await snapshotService.diff(snapshotId1, snapshotId2);

// 返回
{
  "changedFields": {
    "amount": { "from": 45000, "to": 50000 },
    "items": { "type": "subform", "changes": [...] }
  },
  "addedFields": ["budgetCode"],
  "removedFields": [],
  "unchangedCount": 15,
  "changedCount": 2
}
```

### 溯源场景

| 场景 | 操作 |
|------|------|
| 查看某笔订单的完整审批历程 | `getSnapshotsByRecord('orders', 'order_001')` |
| 对比提交时与最终审批通过的数据差异 | `diff(initialSnapshotId, finalSnapshotId)` |
| 查看某个审批人具体改了什么 | 筛选 `operatorId` + 查看 `changedFields` |
| 驳回后查看驳回时的数据状态 | 筛选 `snapshotType: NODE_REJECT` |
| 数据异常时定位是哪个节点改的 | 遍历快照链，逐个检查 `changedFields` |

---

## 审计日志集成

每个快照操作自动写入审计日志：

```jsonc
{
  "event": "workflow.snapshot.captured",
  "resource": {
    "type": "workflow_instance",
    "id": "5001"
  },
  "detail": {
    "snapshotId": "1003",
    "nodeId": "node_approval_01",
    "nodeName": "部门经理审批",
    "snapshotType": "NODE_COMPLETE",
    "changedFieldCount": 2,
    "sourceTable": "orders",
    "sourceId": "order_2024001"
  },
  "operator": {
    "id": 2001,
    "name": "张三"
  },
  "timestamp": "2024-01-16T14:30:00Z"
}
```

---

## 实现状态

### 已实现模块

| 模块 | 包 | 状态 | 说明 |
|------|-----|------|------|
| BPMN Schema | `@low-code/workflow` (schema/) | ✅ 完成 | BPMN 2.0 类型定义、校验器、序列化器 |
| 流程引擎 | `@low-code/workflow` | ✅ 完成 | WorkflowEngine、StateMachine、SnapshotEngine |
| 节点执行器 | `@low-code/workflow` | ✅ 完成 | Start/End/UserTask/Gateway/Timer/Service + 数据操作执行器 |
| 服务端 API | `server/src/routes` | ✅ 完成 | 流程定义、实例、任务 CRUD |
| 文件适配器 | `server/src/services` | ✅ 完成 | FileDatabaseAdapter、FileSnapshotService |
| 流程设计器 | `packages/renderer/src/workflow` | ✅ 完成 | WorkflowDesigner、12 种节点组件 |
| 审批运行时 | `packages/renderer/src/workflow` | ✅ 完成 | ApprovalForm、TaskList、FlowChart |
| **Jobs 持久化** | `@low-code/workflow` | ✅ 完成 | 节点执行结果记录，支持审计追溯 |
| **超时管理** | `@low-code/workflow` | ✅ 完成 | TimeoutManager，超时自动中止 |
| **运行注册表** | `@low-code/workflow` | ✅ 完成 | RunningRegistry，支持外部中止执行中实例 |
| **重试机制** | `@low-code/workflow` | ✅ 完成 | 节点执行失败自动重试（指数退避） |
| **多人审批** | `@low-code/workflow` | ✅ 完成 | 单人/会签/或签/竞签四种模式 |
| **任务统计** | `@low-code/workflow` | ✅ 完成 | TaskStatsManager，用户维度待办/已办统计 |
| **结束节点输出** | `@low-code/workflow` | ✅ 完成 | 结束节点支持 output 配置，定义终态数据 |
| **变量作用域** | `@low-code/workflow` | ✅ 完成 | 条件网关支持 $env/$now 等作用域变量 |
| **数据操作执行器** | `@low-code/workflow` | ✅ 完成 | CreateRecord/UpdateRecord/QueryRecord/DeleteRecord，支持 FieldMappingItem[]/ConditionItem[] 设计器格式 |
| **计算节点** | `@low-code/workflow` | ✅ 完成 | ScriptTaskExecutor，复用表达式引擎执行同步计算 |
| **服务任务表达式** | `@low-code/workflow` | ✅ 完成 | ServiceTask 支持表达式模式（设计器输出）+ 扩展配置模式（回退） |
| **节点级超时** | `@low-code/workflow` | ✅ 完成 | TimeoutManager 支持节点级超时，UserTask 超时支持 autoApprove/autoReject/notify/transfer |
| **转办** | `@low-code/workflow` | ✅ 完成 | WorkflowEngine.transfer()，取消原任务并创建新任务给目标人 |
| **加签** | `@low-code/workflow` | ✅ 完成 | WorkflowEngine.addSign()，支持 before/after/parallel 三种模式 |
| **任务认领** | `@low-code/workflow` | ✅ 完成 | WorkflowEngine.claimTask()，竞签模式专用 |
| **流程实例列表** | `frontend` | ✅ 完成 | WorkflowCenterPage，按应用/状态筛选，对接真实 API |
| **实例详情/快照查看** | `frontend` | ✅ 完成 | WorkflowInstanceDetailPage，FlowChart + 执行时间线 + 快照详情 |

### API 端点

**基本 CRUD（统一走 apps 路由）：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/apps/:appId/workflows` | 获取流程定义列表 |
| GET | `/api/apps/:appId/workflows/:id` | 获取单个流程定义 |
| POST | `/api/apps/:appId/workflows` | 创建流程定义 |
| PUT | `/api/apps/:appId/workflows/:id` | 更新流程定义 |
| DELETE | `/api/apps/:appId/workflows/:id` | 删除流程定义 |

**流程特有操作：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/apps/:appId/workflows/:id/publish` | 发布流程定义 |
| POST | `/api/apps/:appId/workflows/:id/trigger` | 触发流程实例 |

**流程实例：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/apps/:appId/workflow-instances` | 获取实例列表 |
| GET | `/api/apps/:appId/workflow-instances/:id` | 获取单个实例 |
| POST | `/api/apps/:appId/workflow-instances/:id/terminate` | 终止流程 |
| GET | `/api/apps/:appId/workflow-instances/:id/history` | 获取审批历史 |
| GET | `/api/apps/:appId/workflow-instances/:id/jobs` | 获取节点执行记录（新增） |

**审批任务：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/apps/:appId/workflow-tasks` | 获取任务列表 |
| GET | `/api/apps/:appId/workflow-tasks/stats?userId=xxx` | 获取用户任务统计（新增） |
| GET | `/api/apps/:appId/workflow-tasks/:id` | 获取单个任务 |
| POST | `/api/apps/:appId/workflow-tasks/:id/approve` | 审批通过 |
| POST | `/api/apps/:appId/workflow-tasks/:id/reject` | 审批驳回 |
| POST | `/api/apps/:appId/workflow-tasks/:id/transfer` | 转办任务 |
| POST | `/api/apps/:appId/workflow-tasks/:id/claim` | 竞签认领（新增） |
| POST | `/api/apps/:appId/workflow-tasks/:id/add-sign` | 加签（新增） |

**前端页面：**

| 路由 | 页面 | 说明 |
|------|------|------|
| `/:tenantId/workflows` | WorkflowCenterPage | 流程实例列表，按应用筛选，支持状态 Tab |
| `/:tenantId/app/:appId/workflows/:instanceId` | WorkflowInstanceDetailPage | 实例详情：左侧流程图 + 右侧执行时间线 |

### 默认流程 Schema

创建新流程时，服务端会自动生成包含 **开始事件** 和 **结束事件** 的默认 BPMN Schema：

```json
{
  "id": "workflow_{uuid}",
  "name": "流程名称",
  "processes": [
    {
      "id": "process_1",
      "name": "主流程",
      "nodes": [
        {
          "id": "start_1",
          "$type": "bpmn:StartEvent",
          "name": "开始",
          "outgoing": ["edge_start_to_end"]
        },
        {
          "id": "end_1",
          "$type": "bpmn:EndEvent",
          "name": "结束",
          "incoming": ["edge_start_to_end"]
        }
      ],
      "edges": [
        {
          "id": "edge_start_to_end",
          "$type": "bpmn:SequenceFlow",
          "name": "",
          "sourceRef": "start_1",
          "targetRef": "end_1"
        }
      ]
    }
  ]
}
```

**设计决策（2026-07-03）：**
- 新建流程自动包含 StartEvent + EndEvent，符合 BPMN 2.0 规范
- 避免用户创建空流程后无法在设计器中操作
- 与 react-flow-builder 的默认节点结构保持一致

---

## 审批人指派策略

审批节点通过 `AssigneeStrategy` 配置审批人，支持四种维度，**设计时存储策略，运行时动态解析为具体用户**：

| 策略类型 | type 值 | 说明 | 运行时解析 |
|---------|---------|------|-----------|
| 指定人员 | `'user'` | 直接选择具体用户 | `UserResolver.findByIds()` |
| 按角色 | `'role'` | 选择角色（如"管理员"） | `UserResolver.findByRoles()` |
| 按部门 | `'department'` | 选择部门（如"技术部"） | `UserResolver.findByDepartments()` |
| 按岗位 | `'position'` | 选择岗位（如"部门经理"） | `UserResolver.findByPositions()` |

### 设计理念

- **设计时**：配置面板存储策略描述（如 `{ type: 'role', roleIds: ['admin'] }`），不绑定具体人员
- **运行时**：引擎调用 `UserResolver` 将策略解析为具体用户列表，人员变动不影响已发布的流程
- **存储位置**：`UserTask.assignee` 字段（BPMN JSON）

### UserResolver 接口

```typescript
interface UserResolver {
  findByIds(userIds: string[]): Promise<ResolvedUser[]>;
  findByRoles(roleIds: string[]): Promise<ResolvedUser[]>;
  findByDepartments(deptIds: string[]): Promise<ResolvedUser[]>;
  findByPositions(positionIds: string[]): Promise<ResolvedUser[]>;
}
```

服务层通过 `TenantUserResolver` 实现，查询租户 SQLite 数据库（`users`、`user_roles`、`user_departments` 表）。

---

## 审批模式

支持四种审批模式：

| 模式 | mode 值 | 说明 |
|------|---------|------|
| **单人审批** | `'single'` | 任一审批人完成即继续（默认） |
| **会签** | `'countersign'` | 所有审批人都必须完成才继续 |
| **或签** | `'orSign'` | 一人完成即继续，全部驳回才驳回 |
| **竞签** | `'raceSign'` | 先到先得，一人认领后其他任务自动取消 |

### 审批决策逻辑

```typescript
// 单人模式
if (mode === 'single') {
  const done = distribution.find(d => d.status !== 'pending' && d.count > 0);
  return done ? done.status : null; // null = 继续等待
}

// 会签模式
if (mode === 'countersign') {
  if (resolved.count === assignees.length) return 'resolved';
  if (rejected.count > 0) return 'rejected';
  return null; // 继续等待
}

// 或签模式
if (mode === 'orSign') {
  if (resolved.count > 0) return 'resolved';
  if (rejectedCount === assignees.length) return 'rejected';
  return null; // 继续等待
}

// 竞签模式
if (mode === 'raceSign') {
  // 有人已完成（认领后完成）
  if (resolved.count > 0) return 'resolved';
  // 有人已驳回
  if (rejected.count > 0) return 'rejected';
  // 有人已认领但未完成，继续等待
  if (claimed.count > 0) return null;
  return null; // 继续等待
}
```

### 竞签模式说明

竞签模式适用于"抢任务"场景：
1. 任务创建时，引擎根据指派策略解析出的所有用户都能看到待办任务
2. 第一个认领（claim）任务的人成为审批人
3. 其他人的任务自动取消
4. 认领人完成审批后，节点继续流转

### 驳回动作

| 动作 | 说明 |
|------|------|
| `rejectToStart` | 驳回到流程开始（默认） |
| `rejectToPrevious` | 驳回到上一节点 |
| `rejectToNode` | 驳回到指定节点 |
| `rejectToEnd` | 直接结束流程 |

### 节点超时

审批节点支持配置超时策略，超时后自动执行指定动作：

```jsonc
{
  "timeout": {
    "duration": 3600000,        // 超时时长（毫秒），如 1 小时
    "action": "autoApprove",    // 超时动作
    "transferTo": "user_001"    // 转办目标人（action=transfer 时）
  }
}
```

| 超时动作 | 说明 |
|---------|------|
| `autoApprove` | 自动通过所有待办任务 |
| `autoReject` | 自动驳回所有待办任务 |
| `notify` | 发送超时通知（暂未实现） |
| `transfer` | 转办给指定人 |

### 转办与加签

引擎支持运行时动态调整审批人：

| 操作 | 方法 | 说明 |
|------|------|------|
| 转办 | `engine.transfer(params)` | 取消当前任务，创建新任务给目标人 |
| 加签（前） | `engine.addSign({type: 'before', ...})` | 先让加签人审批，完成后恢复原任务 |
| 加签（后） | `engine.addSign({type: 'after', ...})` | 当前任务完成后，再创建加签人任务 |
| 加签（并行） | `engine.addSign({type: 'parallel', ...})` | 为当前节点创建额外的并行审批任务 |
| 竞签认领 | `engine.claimTask(taskId, userId)` | 第一个认领的人获得任务，其他自动取消 |

---

## 数据操作节点

支持对数据表进行 CRUD 操作，配置存储在节点的顶层字段中（设计器通过 `useBpmnConverter` 平铺到 BPMN 节点）。

### 数据结构

#### 字段映射 (FieldMappingItem)

字段赋值使用结构化的数组格式，每项包含表字段名和变量绑定：

```typescript
interface FieldMappingItem {
  field: string;           // 表字段名
  value: string;           // 绑定值（变量路径或常量）
  valueType: 'variable' | 'constant';  // 绑定类型
}
```

#### 条件项 (ConditionItem)

筛选条件使用结构化的数组格式，每项包含字段名、操作符和值：

```typescript
interface ConditionItem {
  field: string;           // 表字段名
  operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'like' | 'in';
  value: string;           // 绑定值（变量路径或常量）
  valueType: 'variable' | 'constant';  // 绑定类型
}
```

### 创建记录 (CreateRecord)

配置面板：数据表选择 + 字段赋值（表字段 = 变量选择器）

```jsonc
{
  "collection": "orders",
  "dataSource": "default",
  "fields": [
    { "field": "orderNo", "value": "ORD-2024-001", "valueType": "constant" },
    { "field": "amount", "value": 50000, "valueType": "constant" },
    { "field": "status", "value": "pending", "valueType": "constant" },
    { "field": "applicant", "value": "$jobsMapByNodeKey.start-1.operator.name", "valueType": "variable" }
  ]
}
```

### 更新记录 (UpdateRecord)

配置面板：数据表选择 + 匹配条件 + 字段赋值

```jsonc
{
  "collection": "orders",
  "dataSource": "default",
  "filter": [
    { "field": "id", "operator": "=", "value": "$jobsMapByNodeKey.query-1.record.id", "valueType": "variable" }
  ],
  "fields": [
    { "field": "status", "value": "approved", "valueType": "constant" },
    { "field": "approvedAt", "value": "$env.now", "valueType": "variable" }
  ]
}
```

### 查询记录 (QueryRecord)

配置面板：数据表选择 + 匹配条件

```jsonc
{
  "collection": "orders",
  "dataSource": "default",
  "filter": [
    { "field": "status", "operator": "=", "value": "pending", "valueType": "constant" },
    { "field": "amount", "operator": ">", "value": 10000, "valueType": "constant" }
  ],
  "sort": { "createdAt": "desc" },
  "pagination": { "limit": 10, "offset": 0 }
}
```

### 删除记录 (DeleteRecord)

配置面板：数据表选择 + 匹配条件

```jsonc
{
  "collection": "temp_records",
  "dataSource": "default",
  "filter": [
    { "field": "createdAt", "operator": "<", "value": "$env.7daysAgo", "valueType": "variable" }
  ]
}
```

### 安全机制

- **UpdateRecord/DeleteRecord** 必须配置 `filter`，禁止更新/删除全表
- 支持变量引用：`$jobsMapByNodeKey.xxx.yyy` 引用上游节点结果
- 支持环境变量：`$env.now`、`$user` 等
- 配置面板使用 `VariableTreeSelector` 选择变量，支持类型校验

---

## 节点配置面板

流程设计器支持点击节点弹出配置面板，配置面板使用 antd Drawer 组件实现。

### 配置面板支持的节点类型

| 节点类型 | 可配置项 |
|---------|---------|
| 审批节点 | 审批模式（单人/会签/或签/竞签）、审批人（支持按人员/角色/部门/岗位指派）、驳回动作 |
| 条件节点 | 条件表达式（ExpressionEditor） |
| 延时节点 | 延时类型、时长/时间 |
| 通知节点 | 通知渠道、接收人（选人组件）、内容 |
| 自动化节点 | 执行表达式（ExpressionEditor，支持 $fetch） |
| 计算节点 | 计算表达式（ExpressionEditor） |
| 创建记录 | 数据表选择（下拉）、字段赋值（FieldMappingEditor：表字段 = 变量选择器） |
| 更新记录 | 数据表选择（下拉）、匹配条件（ConditionRowEditor：字段 操作符 变量）、字段赋值（FieldMappingEditor） |
| 删除记录 | 数据表选择（下拉）、匹配条件（ConditionRowEditor：字段 操作符 变量） |

### 数据操作节点配置组件

#### FieldMappingEditor（字段映射编辑器）

三列布局：表字段 | = | 变量选择器

- 左列：从数据表 Schema 动态加载字段列表（下拉选择）
- 中列：固定显示 `=` 符号
- 右列：点击弹出 `VariableTreeSelector` 选择变量
- 支持添加/删除映射行
- 已选字段自动禁用，防止重复映射

#### ConditionRowEditor（条件行编辑器）

三列布局：字段 | 操作符 | 变量选择器

- 左列：从数据表 Schema 动态加载字段列表（下拉选择）
- 中列：操作符选择（=、≠、>、≥、<、≤、包含、在...中）
- 右列：点击弹出 `VariableTreeSelector` 选择变量
- 支持添加/删除条件行

### 表达式编辑器集成

流程节点配置使用 `ExpressionEditor` 组件，支持：
- JSDoc 自动生成（根据环境变量动态生成函数签名）
- Monaco 代码补全和悬浮提示
- 同步/异步模式切换
- 类型推断和校验

**变量过滤**：流程节点表达式只显示流程相关变量，通过 `allowedVariables` 属性过滤掉页面变量（`$user`、`$platform`、`$route`、`$component`、`$data`）。

流程表达式可用变量：
| 变量 | 说明 |
|------|------|
| `$env` | 环境变量（NODE_ENV 等） |
| `$now` | 当前时间戳（Unix ms） |
| `$initiator` | 流程发起人（id、name） |
| `$operator` | 当前操作人（id、name） |
| `$workflow` | 流程上下文（instanceId、nodeId、variables、snapshots） |
| `$fetch` | HTTP 请求（get、post、put、delete） |
| `$table` | 数据表查询 |
| `$computation` | 运算引擎 |

### 选人/指派组件

**审批节点**使用 `AssigneeSelector` 组件配置审批人，支持四种指派维度 Tab 切换：
- 指定人员（选择具体用户）
- 按角色（选择角色，运行时解析为用户）
- 按部门（选择部门，运行时解析为用户）
- 按岗位（选择岗位，运行时解析为用户）

**通知节点**使用 `UserSelector` 组件选择接收人，支持：
- 单选/多选模式
- 按部门树、岗位、角色筛选
- 关键词搜索

API 路由（租户级）：
- `GET /api/tenants/:tenantId/departments` - 部门树
- `GET /api/tenants/:tenantId/positions` - 岗位列表
- `GET /api/tenants/:tenantId/roles` - 角色列表
- `GET /api/tenants/:tenantId/users/selectable` - 选人组件专用
- `GET /api/tenants/:tenantId/users/batch` - 批量获取用户

### 实现细节

- 使用 `React.forwardRef` 包装配置组件以支持 ref
- 自定义 `DrawerComponent`、`PopoverComponent`、`PopconfirmComponent` 适配 antd v5
- 删除节点需要 `PopconfirmComponent` 支持确认对话框
- 表达式触发器参考 `PropValueField` 的 `BindingDisplay` 模式

---

## 与现有模块的关系

| 模块 | 关系 |
|------|------|
| **渲染引擎** | 流程节点表单基于渲染引擎渲染，数据源从快照表加载而非业务表 |
| **数据引擎** | 快照数据结构与数据引擎的格式化字段对齐，审批结束后回写业务表 |
| **表单引擎** | 按钮触发流程、节点表单的字段联动与校验复用表单引擎能力 |
| **运算引擎** | 流程条件判断使用运算引擎表达式，节点数据操作可触发运算 |
| **权限引擎** | 节点表单的字段可见/可编辑权限由权限引擎控制 |
| **安全审计** | 快照操作自动写入审计日志，支持合规审查 |
