# 流程引擎 (Workflow Engine)

支持业务流程的可视化编排与自动化执行。

## 触发方式

| 触发类型 | 说明 |
|---------|------|
| **表单按钮** | 用户在表单页面点击按钮触发流程（主要方式） |
| Webhook | 外部系统通过 HTTP Webhook 触发流程 |
| 定时任务 | 基于 Cron 表达式的定时触发（可选） |

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
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  instance_id     BIGINT NOT NULL,           -- 流程实例ID
  node_id         VARCHAR(64),               -- 节点定义ID（初始快照为 NULL）
  node_name       VARCHAR(128),              -- 节点名称（冗余，方便查询）
  source_id       VARCHAR(64) NOT NULL,      -- 业务记录ID
  source_table    VARCHAR(64) NOT NULL,      -- 业务表名
  data            JSON NOT NULL,             -- 完整快照数据（该节点流出时的全量数据）
  changed_fields  JSON,                      -- 相对上一快照的变更字段明细
  snapshot_type   VARCHAR(32) NOT NULL,      -- INITIAL | NODE_COMPLETE | NODE_REJECT | FINAL | TERMINATED
  operator_id     BIGINT,                    -- 操作人ID
  operator_name   VARCHAR(64),               -- 操作人姓名（冗余）
  comment         TEXT,                      -- 操作备注（如审批意见）
  created_at      DATETIME DEFAULT NOW(),

  INDEX idx_instance (instance_id),
  INDEX idx_source (source_table, source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
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

| 节点类型 | 可修改数据 | 流出快照 |
|---------|-----------|---------|
| **审批节点** | ✅ 可填写附加字段、修改业务数据 | 节点完成/驳回时捕获 |
| **数据操作节点** | ✅ 自动写入/更新数据 | 节点执行后捕获 |
| **条件分支** | ❌ 不修改数据 | 不产生快照（隐式流转） |
| **并行分支** | 取决于子节点 | 汇聚时产生合并快照 |
| **API调用节点** | ✅ 可根据返回值更新数据 | 节点执行后捕获 |
| **人工填写节点** | ✅ 填写指定字段 | 节点完成时捕获 |

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
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  workflow_key VARCHAR(64) NOT NULL,      -- 流程标识（不变）
  version     INT NOT NULL,               -- 版本号
  name        VARCHAR(128),
  schema      JSON NOT NULL,              -- 流程定义 JSON
  status      VARCHAR(32),                -- DRAFT | PUBLISHED | ARCHIVED
  created_by  BIGINT,
  created_at  DATETIME DEFAULT NOW(),

  UNIQUE KEY uk_key_version (workflow_key, version)
);
```

**版本规则：**

- 修改已发布的流程时，自动创建新版本（version + 1）
- 运行中的流程实例绑定创建时的版本号，不受新版本影响
- 支持将运行中的实例迁移到新版本（需兼容性校验）

### 流程实例

```sql
CREATE TABLE workflow_instances (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  workflow_def_id  BIGINT NOT NULL,        -- 流程定义ID（含版本）
  workflow_key     VARCHAR(64) NOT NULL,    -- 流程标识
  version          INT NOT NULL,            -- 使用的版本号
  source_table     VARCHAR(64),             -- 关联业务表
  source_id        VARCHAR(64),             -- 关联业务记录ID
  current_snapshot_id BIGINT,               -- 当前最新流出快照ID
  status           VARCHAR(32),             -- running | pending | completed | rejected | cancelled | failed（见 system-dictionaries.md workflow_instance_statuses）
  started_by       BIGINT,
  started_at       DATETIME DEFAULT NOW(),
  completed_at     DATETIME,

  INDEX idx_source (source_table, source_id),
  INDEX idx_status (status)
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
| BPMN Schema | `@low-code/workflow-bpmn` | ✅ 完成 | BPMN 2.0 类型定义、校验器、序列化器 |
| 流程引擎 | `@low-code/workflow` | ✅ 完成 | WorkflowEngine、StateMachine、SnapshotEngine |
| 节点执行器 | `@low-code/workflow` | ✅ 完成 | Start/End/UserTask/Gateway/Timer/Service |
| 服务端 API | `server/src/routes` | ✅ 完成 | 流程定义、实例、任务 CRUD |
| 文件适配器 | `server/src/services` | ✅ 完成 | FileDatabaseAdapter、FileSnapshotService |
| 流程设计器 | `packages/renderer/src/workflow` | ✅ 完成 | WorkflowDesigner、8 种节点组件 |
| 审批运行时 | `packages/renderer/src/workflow` | ✅ 完成 | ApprovalForm、TaskList、FlowChart |

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/workflows?appId=xxx` | 获取流程定义列表 |
| GET | `/api/workflows/:id?appId=xxx` | 获取单个流程定义 |
| POST | `/api/workflows` | 创建流程定义 |
| PUT | `/api/workflows/:id?appId=xxx` | 更新流程定义 |
| DELETE | `/api/workflows/:id?appId=xxx` | 删除流程定义 |
| POST | `/api/workflows/:id/publish?appId=xxx` | 发布流程定义 |
| POST | `/api/workflows/:id/trigger?appId=xxx` | 触发流程实例 |
| GET | `/api/workflow-instances?appId=xxx` | 获取实例列表 |
| GET | `/api/workflow-instances/:id?appId=xxx` | 获取单个实例 |
| POST | `/api/workflow-instances/:id/terminate?appId=xxx` | 终止流程 |
| GET | `/api/workflow-instances/:id/history?appId=xxx` | 获取审批历史 |
| GET | `/api/workflow-tasks?appId=xxx` | 获取任务列表 |
| GET | `/api/workflow-tasks/:id?appId=xxx` | 获取单个任务 |
| POST | `/api/workflow-tasks/:id/approve?appId=xxx` | 审批通过 |
| POST | `/api/workflow-tasks/:id/reject?appId=xxx` | 审批驳回 |
| POST | `/api/workflow-tasks/:id/transfer?appId=xxx` | 转办任务 |

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
