# 自动化引擎 (Automation Engine)

基于 **ECA (Event-Condition-Action)** 模型的自动化规则引擎，支持配置条件规则，在满足条件时自动触发流程引擎、发送通知或执行数据操作。

## 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            自动化引擎                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────── 事件监听层 ─────────────────────────┐              │
│  │                                                            │              │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │              │
│  │  │ 数据变更  │  │ 定时触发  │  │ 表单事件  │  │ 审批事件  │  │              │
│  │  │ (Entity) │  │ (Cron)   │  │ (Form)   │  │(Workflow)│  │              │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │              │
│  │       │              │              │              │        │              │
│  │       └──────────────┴──────────────┴──────────────┘        │              │
│  │                          ▼                                  │              │
│  └────────────────────────────────────────────────────────────┘              │
│                                                                             │
│  ┌─────────────────────── 条件求值层 ─────────────────────────┐              │
│  │                                                            │              │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │              │
│  │  │ 条件表达式     │  │ 多条件组合    │  │ 运算引擎集成  │     │              │
│  │  │ (Expression) │  │ (AND/OR)     │  │ (Compute)    │     │              │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │              │
│  │                                                            │              │
│  └──────────────────────────┬─────────────────────────────────┘              │
│                             ▼                                               │
│  ┌─────────────────────── 动作执行层 ─────────────────────────┐              │
│  │                                                            │              │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │              │
│  │  │ 触发流程  │  │ 发送通知  │  │ 数据操作  │  │ API调用   │  │              │
│  │  │(Workflow)│  │(Message) │  │  (Data)  │  │ (HTTP)   │  │              │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │              │
│  │                                                            │              │
│  └────────────────────────────────────────────────────────────┘              │
│                                                                             │
│  ┌─────────────────────── 执行日志 ──────────────────────────┐              │
│  │  触发记录  │  条件求值结果  │  动作执行状态  │  错误详情      │              │
│  └────────────────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 与流程引擎的区别

| 维度 | 自动化引擎 | 流程引擎 |
|------|-----------|---------|
| 模型 | ECA（事件-条件-动作） | BPMN（流程编排） |
| 复杂度 | 单步触发，快速响应 | 多步骤，含人工审批 |
| 执行方式 | 事件驱动，自动执行 | 有状态，需人工介入 |
| 设计方式 | 表单配置规则 | 可视化拖拽流程图 |
| 典型场景 | 数据变更自动通知、超时预警、字段自动填充 | 请假审批、采购审批、跨部门协作 |

> 自动化引擎可作为流程引擎的**触发入口**，两者协同工作。

## 触发器类型

| 触发器 | 说明 | 触发时机 |
|--------|------|---------|
| 数据变更 | 监听实体记录的创建/更新/删除 | `entity.created` / `entity.updated` / `entity.deleted` |
| 定时触发 | 基于 Cron 表达式的定时任务 | 按配置的时间周期触发 |
| 表单事件 | 表单提交、字段值变更 | `form.submitted` / `form.field_changed` |
| 审批事件 | 流程审批通过/拒绝/完成 | `workflow.approved` / `workflow.rejected` / `workflow.completed` |
| 自定义事件 | 平台事件总线中的任意事件 | 自定义事件类型 |

### 触发器配置

```typescript
interface AutomationTrigger {
  /** 触发器类型 */
  type: 'data_change' | 'schedule' | 'form_event' | 'workflow_event' | 'custom_event';

  /** 数据变更触发器配置 */
  dataChange?: {
    entityCode: string;                   // 监听的实体
    operations: ('create' | 'update' | 'delete')[];  // 监听的操作类型
    watchFields?: string[];               // 仅监听指定字段变更（为空则监听全部）
  };

  /** 定时触发器配置 */
  schedule?: {
    cron: string;                         // Cron 表达式
    timezone?: string;                    // 时区（默认租户时区）
    startDate?: string;                   // 生效开始时间
    endDate?: string;                     // 生效结束时间
  };

  /** 表单事件触发器配置 */
  formEvent?: {
    pageId: string;                       // 关联页面
    events: ('submitted' | 'field_changed')[];
    fieldCode?: string;                   // field_changed 时指定字段
  };

  /** 审批事件触发器配置 */
  workflowEvent?: {
    workflowId?: string;                  // 指定流程（为空则监听所有）
    events: ('approved' | 'rejected' | 'completed' | 'started')[];
    nodeCode?: string;                    // 指定节点
  };

  /** 自定义事件触发器配置 */
  customEvent?: {
    eventType: string;                    // 事件类型
    source?: string;                      // 事件来源过滤
  };
}
```

## 条件配置

### 条件表达式

```typescript
interface AutomationCondition {
  /** 条件组合逻辑 */
  logic: 'and' | 'or';

  /** 条件列表 */
  rules: ConditionRule[];

  /** 嵌套条件组（支持多层嵌套） */
  groups?: AutomationCondition[];
}

interface ConditionRule {
  /** 字段路径（支持嵌套，如 "record.amount"） */
  field: string;

  /** 比较运算符 */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
    | 'in' | 'not_in' | 'contains' | 'not_contains'
    | 'is_empty' | 'is_not_empty' | 'between' | 'changed_to' | 'changed_from';

  /** 比较值（支持变量插值 {{variable}}） */
  value?: any;

  /** 值类型 */
  valueType?: 'literal' | 'expression' | 'variable';
}
```

### 条件示例

```jsonc
// 示例：订单金额大于 10000 且状态变更为"已确认"
{
  "logic": "and",
  "rules": [
    {
      "field": "record.amount",
      "operator": "gt",
      "value": 10000,
      "valueType": "literal"
    },
    {
      "field": "record.status",
      "operator": "changed_to",
      "value": "confirmed"
    }
  ]
}

// 示例：嵌套条件 — (金额 > 5000 且客户等级 = VIP) 或 (金额 > 20000)
{
  "logic": "or",
  "rules": [
    {
      "field": "record.amount",
      "operator": "gt",
      "value": 20000,
      "valueType": "literal"
    }
  ],
  "groups": [
    {
      "logic": "and",
      "rules": [
        { "field": "record.amount", "operator": "gt", "value": 5000 },
        { "field": "record.customerLevel", "operator": "eq", "value": "VIP" }
      ]
    }
  ]
}
```

## 动作类型

| 动作类型 | 说明 | 执行方式 |
|---------|------|---------|
| 触发流程 | 启动指定流程引擎实例 | 调用流程引擎 API |
| 发送通知 | 通过消息中心发送多渠道通知 | 调用消息中心 API |
| 数据操作 | 创建/更新/删除实体记录 | 调用数据引擎 API |
| API 调用 | 调用外部 HTTP API | HTTP Client |
| Webhook | 推送事件到外部 Webhook | 调用 Webhook 服务 |

### 动作配置

```typescript
interface AutomationAction {
  /** 动作类型 */
  type: 'trigger_workflow' | 'send_notification' | 'data_operation' | 'api_call' | 'webhook';

  /** 动作名称（用于日志展示） */
  name: string;

  /** 是否异步执行（默认 false） */
  async?: boolean;

  /** 失败重试策略 */
  retryPolicy?: {
    maxRetries: number;                   // 最大重试次数
    backoffMs: number[];                  // 退避时间数组
  };

  /** 条件执行 — 动作级别条件（可选，满足时才执行此动作） */
  condition?: AutomationCondition;

  /** 触发流程配置 */
  triggerWorkflow?: {
    workflowId: string;                   // 流程定义 ID
    variables?: Record<string, any>;      // 流程变量（支持 {{event.data.xxx}} 插值）
    initiator?: string;                   // 发起人（默认系统用户）
  };

  /** 发送通知配置 */
  sendNotification?: {
    templateId?: string;                  // 消息模板 ID
    channels: ('site' | 'email' | 'sms' | 'wecom' | 'dingtalk' | 'feishu')[];
    recipients: NotificationRecipient[];  // 接收人
    title?: string;                       // 自定义标题（不使用模板时）
    content?: string;                     // 自定义内容（不使用模板时）
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    variables?: Record<string, any>;      // 模板变量
  };

  /** 数据操作配置 */
  dataOperation?: {
    entityCode: string;                   // 目标实体
    operation: 'create' | 'update' | 'delete';
    data?: Record<string, any>;           // 操作数据（支持变量插值）
    filter?: Record<string, any>;         // 更新/删除时的过滤条件
  };

  /** API 调用配置 */
  apiCall?: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;                          // 请求 URL（支持变量插值）
    headers?: Record<string, string>;     // 请求头
    body?: Record<string, any>;           // 请求体（支持变量插值）
    timeout?: number;                     // 超时时间 (ms)
    auth?: {
      type: 'bearer' | 'basic' | 'api_key';
      config: Record<string, string>;
    };
  };

  /** Webhook 配置 */
  webhook?: {
    webhookId: string;                    // 已配置的 Webhook ID
    payload?: Record<string, any>;        // 自定义载荷（支持变量插值）
  };
}

interface NotificationRecipient {
  type: 'user' | 'role' | 'department' | 'variable';
  value: string;                          // 用户ID / 角色名 / 部门ID / 变量路径
}
```

## 自动化规则定义

```typescript
interface AutomationRule {
  id: string;
  tenantId: string;
  appId: string;

  /** 规则名称 */
  name: string;

  /** 规则描述 */
  description?: string;

  /** 规则状态 */
  status: 'enabled' | 'disabled' | 'draft';

  /** 触发器 */
  trigger: AutomationTrigger;

  /** 条件（可选，为空则始终执行） */
  condition?: AutomationCondition;

  /** 动作列表（按顺序执行） */
  actions: AutomationAction[];

  /** 执行限制 */
  throttle?: {
    /** 同一规则的最小触发间隔（秒） */
    cooldownSeconds: number;
    /** 每日最大触发次数 */
    maxDailyTriggers?: number;
  };

  /** 生效时间范围 */
  effectiveTime?: {
    start?: string;                       // ISO 8601
    end?: string;                         // ISO 8601
    /** 生效时段（如仅工作时间触发） */
    timeRanges?: TimeRange[];
  };

  /** 创建信息 */
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

interface TimeRange {
  daysOfWeek: number[];                   // 0=周日, 1=周一 ... 6=周六
  startTime: string;                      // HH:mm
  endTime: string;                        // HH:mm
}
```

## 执行日志

```typescript
interface AutomationExecutionLog {
  id: string;
  tenantId: string;
  ruleId: string;
  ruleName: string;

  /** 触发事件信息 */
  event: {
    type: string;
    source: string;
    data: Record<string, any>;
    timestamp: string;
  };

  /** 条件求值结果 */
  conditionResult: {
    matched: boolean;                     // 是否满足条件
    details: {
      rule: string;                       // 条件描述
      field: string;
      operator: string;
      expected: any;
      actual: any;
      matched: boolean;
    }[];
    evaluatedAt: string;
    durationMs: number;
  };

  /** 动作执行结果 */
  actionResults: {
    actionType: string;
    actionName: string;
    status: 'success' | 'failed' | 'skipped' | 'retrying';
    result?: any;
    error?: string;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    retryCount: number;
  }[];

  /** 整体状态 */
  status: 'success' | 'partial_success' | 'failed';

  /** 执行耗时 */
  totalDurationMs: number;

  createdAt: string;
}
```

## 数据库 Schema

```sql
-- 自动化规则表
CREATE TABLE automation_rules (
  id              VARCHAR(64)   NOT NULL PRIMARY KEY,
  tenant_id       VARCHAR(64)   NOT NULL,
  app_id          VARCHAR(64)   NOT NULL,
  name            VARCHAR(128)  NOT NULL,
  description     VARCHAR(512)  NULL,
  status          ENUM('enabled', 'disabled', 'draft') NOT NULL DEFAULT 'draft',
  trigger_config  JSON          NOT NULL COMMENT '触发器配置',
  condition_config JSON         NULL COMMENT '条件配置',
  actions_config  JSON          NOT NULL COMMENT '动作配置列表',
  throttle_config JSON          NULL COMMENT '限流配置',
  effective_time  JSON          NULL COMMENT '生效时间配置',
  created_by      VARCHAR(64)   NOT NULL,
  created_at      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_by      VARCHAR(64)   NOT NULL,
  updated_at      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_tenant_app (tenant_id, app_id),
  INDEX idx_status (tenant_id, status),
  INDEX idx_trigger_type (tenant_id, (JSON_UNQUOTE(JSON_EXTRACT(trigger_config, '$.type'))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 执行日志表
CREATE TABLE automation_execution_logs (
  id              VARCHAR(64)   NOT NULL PRIMARY KEY,
  tenant_id       VARCHAR(64)   NOT NULL,
  rule_id         VARCHAR(64)   NOT NULL,
  rule_name       VARCHAR(128)  NOT NULL,
  event_type      VARCHAR(64)   NOT NULL,
  event_source    VARCHAR(64)   NOT NULL,
  event_data      JSON          NOT NULL,
  condition_result JSON          NOT NULL,
  action_results  JSON          NOT NULL,
  status          ENUM('success', 'partial_success', 'failed') NOT NULL,
  total_duration_ms INT UNSIGNED NOT NULL,
  created_at      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX idx_rule (tenant_id, rule_id, created_at),
  INDEX idx_status (tenant_id, status, created_at),
  INDEX idx_event_type (tenant_id, event_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 管理界面

### 规则列表

```
┌─────────────────────────────────────────────────────────────────────────┐
│  自动化规则                                    [+ 新建规则]               │
├─────────────────────────────────────────────────────────────────────────┤
│  🔍 搜索规则...              状态: [全部 ▾]  触发器: [全部 ▾]            │
├─────────────────────────────────────────────────────────────────────────┤
│  规则名称              触发器       条件    动作    状态    今日触发  操作  │
│  ─────────────────────────────────────────────────────────────────────  │
│  大额订单自动审批       数据变更     2 条件  2 动作  ✅ 启用    12    编辑│日志│
│  超时未处理提醒         定时触发     1 条件  1 动作  ✅ 启用     3    编辑│日志│
│  新客户欢迎通知         数据变更     1 条件  1 动作  ✅ 启用    28    编辑│日志│
│  审批通过数据同步       审批事件     1 条件  2 动作  ⏸ 禁用     0    编辑│日志│
│  库存预警               定时触发     1 条件  1 动作  📝 草稿     -    编辑│日志│
├─────────────────────────────────────────────────────────────────────────┤
│  ◀ 1 ▶                                           共 5 条   每页 20 条  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 规则编辑器

```
┌─────────────────────────────────────────────────────────────────────────┐
│  编辑自动化规则                                           [保存] [取消]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  基本信息                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  规则名称  [大额订单自动审批                            ]         │    │
│  │  描述      [当订单金额超过阈值时自动触发审批流程          ]         │    │
│  │  状态      [✅ 启用]                                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ① 触发器                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  类型  [数据变更 ▾]                                               │    │
│  │  实体  [订单 (order) ▾]                                           │    │
│  │  操作  [☑ 创建  ☑ 更新  ☐ 删除]                                   │    │
│  │  监听字段  [金额 (amount)  状态 (status)  + 添加]                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ② 条件 (满足全部)                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  [金额 (amount)]  [大于 ▾]  [10,000]                [✕]          │    │
│  │  [状态 (status)]  [变更为 ▾]  [已确认 (confirmed)]    [✕]         │    │
│  │                                                     [+ 添加条件]  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ③ 动作 (按顺序执行)                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  动作 1: [触发流程 ▾]                                             │    │
│  │    流程  [大额订单审批流程 ▾]                                      │    │
│  │    变量  orderId = {{event.data.recordId}}                       │    │
│  │           amount = {{event.data.record.amount}}                   │    │
│  │                                                                 │    │
│  │  动作 2: [发送通知 ▾]                                             │    │
│  │    渠道  [☑ 站内  ☑ 企业微信  ☐ 邮件]                              │    │
│  │    接收人  [角色: 采购经理 ▾]                                      │    │
│  │    模板  [大额订单通知 ▾]                                          │    │
│  │                                                                 │    │
│  │                                                    [+ 添加动作]   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  高级设置                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  触发冷却  [60] 秒内不重复触发                                     │    │
│  │  每日上限  [100] 次                                                │    │
│  │  生效时段  [全天 ▾]  /  [自定义: 周一至周五 09:00-18:00]           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 执行日志

```
┌─────────────────────────────────────────────────────────────────────────┐
│  执行日志 — 大额订单自动审批                时间: [最近7天 ▾]              │
├─────────────────────────────────────────────────────────────────────────┤
│  时间            触发事件               条件    动作执行    状态           │
│  ─────────────────────────────────────────────────────────────────────  │
│  06-04 14:30    order.updated          ✅ 匹配  2/2 成功   ✅ 成功       │
│  06-04 11:15    order.created          ✅ 匹配  1/2 失败   ⚠️ 部分成功   │
│  06-04 10:00    order.updated          ❌ 不匹配 -         ⏭ 跳过       │
│  06-03 16:45    order.created          ✅ 匹配  2/2 成功   ✅ 成功       │
├─────────────────────────────────────────────────────────────────────────┤
│  ◀ 1 2 3 ▶                               共 25 条   每页 20 条          │
└─────────────────────────────────────────────────────────────────────────┘

── 日志详情 ──

┌─────────────────────────────────────────────────────────────────────────┐
│  执行详情                                            [重新执行]          │
├─────────────────────────────────────────────────────────────────────────┤
│  规则        大额订单自动审批                                            │
│  执行 ID     exec_202406041430001                                       │
│  触发时间    2024-06-04 14:30:15.123                                     │
│  总耗时      1,250 ms                                                   │
│                                                                         │
│  触发事件                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  类型: entity.updated                                           │    │
│  │  实体: order                                                    │    │
│  │  记录: order_001                                                │    │
│  │  变更: { amount: 8000 → 15000, status: "pending" → "confirmed" }│    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  条件求值                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ✅ amount > 10000   实际值: 15000                               │    │
│  │  ✅ status 变更为 confirmed   实际值: confirmed                   │    │
│  │  结果: 匹配    耗时: 5 ms                                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  动作执行                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  1. 触发流程  ✅ 800ms  流程实例: inst_001                        │    │
│  │  2. 发送通知  ✅ 450ms  消息ID: msg_001, msg_002                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## 变量插值

动作配置中支持使用 `{{expression}}` 语法引用事件数据和上下文变量：

| 变量路径 | 说明 | 示例 |
|---------|------|------|
| `{{event.type}}` | 事件类型 | `entity.updated` |
| `{{event.data.entityCode}}` | 实体编码 | `order` |
| `{{event.data.recordId}}` | 记录 ID | `order_001` |
| `{{event.data.record.fieldName}}` | 记录字段值 | `15000` |
| `{{event.data.changes.fieldName}}` | 字段变更值 | `confirmed` |
| `{{event.data.operatorId}}` | 操作人 ID | `user_001` |
| `{{rule.id}}` | 规则 ID | `rule_001` |
| `{{rule.name}}` | 规则名称 | `大额订单自动审批` |
| `{{now}}` | 当前时间 | `2024-06-04T14:30:00Z` |

## 执行流程

```
事件产生
   │
   ▼
┌──────────────────┐
│ 事件匹配触发器     │  ← 检查事件类型是否匹配已启用的规则
└────────┬─────────┘
         │ 匹配到规则列表
         ▼
┌──────────────────┐
│ 限流检查          │  ← 检查冷却时间和每日上限
└────────┬─────────┘
         │ 通过
         ▼
┌──────────────────┐
│ 生效时间检查      │  ← 检查是否在生效时间范围内
└────────┬─────────┘
         │ 通过
         ▼
┌──────────────────┐
│ 条件求值          │  ← 通过运算引擎求值条件表达式
└────────┬─────────┘
         │ 满足条件
         ▼
┌──────────────────┐
│ 按顺序执行动作    │  ← 依次执行配置的动作列表
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 记录执行日志      │  ← 写入执行日志表
└──────────────────┘
```

## 与现有模块的关系

| 模块 | 关系 |
|------|------|
| **事件总线** | 自动化引擎订阅事件总线中的平台事件作为触发源 |
| **流程引擎** | 自动化规则可触发流程实例启动，流程事件也可作为自动化触发器 |
| **消息中心** | 发送通知动作通过消息中心分发，支持多渠道 |
| **运算引擎** | 条件求值通过运算引擎执行表达式计算 |
| **数据引擎** | 数据操作动作通过数据引擎读写实体记录 |
| **权限引擎** | 规则管理独立权限控制，动作执行时校验操作权限 |
| **审计日志** | 规则变更、执行记录写入审计日志 |
| **多租户** | 规则数据自动注入 `tenant_id`，事件匹配时限定租户范围 |
| **开发者扩展** | 支持自定义事件触发器，插件可注册自定义动作类型 |
