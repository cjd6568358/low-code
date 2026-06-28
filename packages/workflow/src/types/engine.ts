/**
 * 流程引擎运行时类型定义
 */

import type {
  BpmnDocument,
  ProcessDefinition,
  FlowNode,
  Edge,
  ProcessInstanceStatus,
  TaskStatus,
  SnapshotType,
} from '@low-code/workflow-bpmn';

/** 引擎配置 */
export interface WorkflowEngineConfig {
  /** 数据库连接 */
  db: DatabaseAdapter;
  /** 快照服务 */
  snapshotService: SnapshotService;
  /** 通知服务 */
  notifyService?: NotifyService;
  /** 表达式求值器 */
  expressionEvaluator?: ExpressionEvaluator;
  /** 最大并发实例数 */
  maxConcurrentInstances?: number;
  /** 检查点间隔（毫秒） */
  checkpointInterval?: number;
}

/** 数据库适配器接口 */
export interface DatabaseAdapter {
  /** 执行 SQL */
  run(sql: string, params?: unknown[]): Promise<{ changes: number; lastID: number }>;
  /** 查询单条 */
  get<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  /** 查询多条 */
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  /** 开始事务 */
  beginTransaction(): Promise<void>;
  /** 提交事务 */
  commit(): Promise<void>;
  /** 回滚事务 */
  rollback(): Promise<void>;
}

/** 快照服务接口 */
export interface SnapshotService {
  /** 捕获快照 */
  capture(params: CaptureSnapshotParams): Promise<SnapshotRecord>;
  /** 获取最新快照 */
  getLatest(instanceId: string): Promise<SnapshotRecord | undefined>;
  /** 获取快照链 */
  getChain(instanceId: string): Promise<SnapshotRecord[]>;
  /** 对比快照 */
  diff(snapshotIdA: string, snapshotIdB: string): Promise<SnapshotDiff>;
  /** 回写业务表 */
  commitToSourceTable(instanceId: string): Promise<void>;
}

/** 捕获快照参数 */
export interface CaptureSnapshotParams {
  instanceId: string;
  nodeId?: string;
  nodeName?: string;
  sourceTable: string;
  sourceId: string;
  data: Record<string, unknown>;
  snapshotType: SnapshotType;
  operatorId?: string;
  operatorName?: string;
  comment?: string;
  previousSnapshotId?: string;
  /** 变更字段（从上一快照计算得出） */
  changedFields?: Record<string, FieldChange>;
}

/** 快照记录 */
export interface SnapshotRecord {
  id: string;
  instanceId: string;
  nodeId?: string;
  nodeName?: string;
  sourceId: string;
  sourceTable: string;
  data: Record<string, unknown>;
  changedFields?: Record<string, FieldChange>;
  snapshotType: SnapshotType;
  operatorId?: string;
  operatorName?: string;
  comment?: string;
  createdAt: string;
}

/** 字段变更 */
export interface FieldChange {
  from: unknown;
  to: unknown;
}

/** 快照差异 */
export interface SnapshotDiff {
  changedFields: Record<string, FieldChange>;
  addedFields: string[];
  removedFields: string[];
  unchangedCount: number;
  changedCount: number;
}

/** 通知服务接口 */
export interface NotifyService {
  /** 发送通知 */
  send(params: NotifyParams): Promise<void>;
  /** 批量发送 */
  sendBatch(params: NotifyParams[]): Promise<void>;
}

/** 通知参数 */
export interface NotifyParams {
  /** 接收人 ID 列表 */
  receiverIds: string[];
  /** 通知类型 */
  type: 'approval' | 'reject' | 'timeout' | 'complete' | 'custom';
  /** 标题 */
  title: string;
  /** 内容 */
  content: string;
  /** 数据 */
  data?: Record<string, unknown>;
  /** 渠道 */
  channels?: ('email' | 'sms' | 'wechat' | 'dingtalk')[];
}

/** 表达式求值器接口 */
export interface ExpressionEvaluator {
  /** 求值表达式 */
  evaluate(expression: string, context: EvaluationContext): unknown;
  /** 求值布尔表达式 */
  evaluateBoolean(expression: string, context: EvaluationContext): boolean;
  /** 校验表达式语法 */
  validate(expression: string): { valid: boolean; error?: string };
}

/** 求值上下文 */
export interface EvaluationContext {
  /** 流程变量 */
  variables: Record<string, unknown>;
  /** 表单数据 */
  formData?: Record<string, unknown>;
  /** 当前节点 */
  currentNodeId?: string;
  /** 操作人 */
  operator?: {
    id: string;
    name: string;
    roles?: string[];
    departments?: string[];
  };
  /** 发起人 */
  initiator?: {
    id: string;
    name: string;
  };
}

/** 流程实例记录 */
export interface InstanceRecord {
  id: string;
  workflowDefId: string;
  workflowKey: string;
  version: number;
  sourceTable?: string;
  sourceId?: string;
  currentSnapshotId?: string;
  currentNodeId?: string;
  status: ProcessInstanceStatus;
  variables: Record<string, unknown>;
  checkpoint?: CheckpointRecord;
  startedBy: string;
  startedByName?: string;
  startedAt: string;
  completedAt?: string;
  parentInstanceId?: string;
}

/** 检查点记录 */
export interface CheckpointRecord {
  instanceId: string;
  nodeId: string;
  nodeName?: string;
  status: 'executing' | 'waiting' | 'completed';
  timestamp: string;
  context: Record<string, unknown>;
  /** 入口连线 */
  incomingEdgeId?: string;
  /** 当前执行路径 */
  executionPath: string[];
}

/** 任务记录 */
export interface TaskRecord {
  id: string;
  instanceId: string;
  nodeId: string;
  nodeName?: string;
  assigneeId?: string;
  assigneeName?: string;
  candidateUsers?: string[];
  candidateGroups?: string[];
  status: TaskStatus;
  formData?: Record<string, unknown>;
  comment?: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}

/** 流程定义记录 */
export interface DefinitionRecord {
  id: string;
  workflowKey: string;
  version: number;
  name?: string;
  schema: BpmnDocument;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdBy: string;
  createdAt: string;
  publishedAt?: string;
}

/** 启动流程参数 */
export interface StartParams {
  /** 流程定义 ID 或 Key */
  workflowId: string;
  /** 版本号（可选，默认最新发布版） */
  version?: number;
  /** 业务表名 */
  sourceTable?: string;
  /** 业务记录 ID */
  sourceId?: string;
  /** 流程变量 */
  variables?: Record<string, unknown>;
  /** 发起人 ID */
  startedBy: string;
  /** 发起人名称 */
  startedByName?: string;
  /** 业务键 */
  businessKey?: string;
}

/** 完成任务参数 */
export interface CompleteParams {
  /** 任务 ID */
  taskId: string;
  /** 操作人 ID */
  operatorId: string;
  /** 操作人名称 */
  operatorName?: string;
  /** 表单数据 */
  formData?: Record<string, unknown>;
  /** 审批意见 */
  comment?: string;
}

/** 驳回任务参数 */
export interface RejectParams {
  /** 任务 ID */
  taskId: string;
  /** 操作人 ID */
  operatorId: string;
  /** 操作人名称 */
  operatorName?: string;
  /** 驳回意见 */
  comment: string;
  /** 驳回目标节点（可选） */
  targetNodeId?: string;
}

/** 终止流程参数 */
export interface TerminateParams {
  /** 实例 ID */
  instanceId: string;
  /** 操作人 ID */
  operatorId: string;
  /** 操作人名称 */
  operatorName?: string;
  /** 终止原因 */
  reason?: string;
}

/** 转办参数 */
export interface TransferParams {
  /** 任务 ID */
  taskId: string;
  /** 转办目标人 ID */
  targetUserId: string;
  /** 转办目标人名称 */
  targetUserName?: string;
  /** 操作人 ID */
  operatorId: string;
  /** 操作人名称 */
  operatorName?: string;
  /** 转办原因 */
  reason?: string;
}

/** 加签参数 */
export interface AddSignParams {
  /** 任务 ID */
  taskId: string;
  /** 加签类型 */
  type: 'before' | 'after' | 'parallel';
  /** 加签人 ID 列表 */
  assigneeIds: string[];
  /** 加签人名称列表 */
  assigneeNames?: string[];
  /** 操作人 ID */
  operatorId: string;
  /** 操作人名称 */
  operatorName?: string;
  /** 加签原因 */
  reason?: string;
}
