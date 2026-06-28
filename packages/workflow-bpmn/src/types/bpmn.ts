/**
 * BPMN 2.0 顶层类型定义
 */

import type { Definitions, Process, Collaboration } from '../schema/process';
import type { FlowNode, Edge } from './nodes';

/** BPMN 文档（简化版，用于 JSON 交换） */
export interface BpmnDocument {
  /** 文档 ID */
  id: string;
  /** 文档名称 */
  name?: string;
  /** 目标命名空间 */
  targetNamespace?: string;
  /** 流程定义列表 */
  processes: ProcessDefinition[];
  /** 协作定义（泳道） */
  collaborations?: CollaborationDefinition[];
}

/** 流程定义 */
export interface ProcessDefinition {
  /** 流程 ID */
  id: string;
  /** 流程名称 */
  name?: string;
  /** 是否可执行 */
  isExecutable?: boolean;
  /** 流程类型 */
  processType?: 'None' | 'Public' | 'Private';
  /** 节点列表 */
  nodes: FlowNode[];
  /** 连线列表 */
  edges: Edge[];
  /** 泳道列表 */
  lanes?: LaneDefinition[];
}

/** 协作定义 */
export interface CollaborationDefinition {
  /** 协作 ID */
  id: string;
  /** 协作名称 */
  name?: string;
  /** 参与者列表 */
  participants: ParticipantDefinition[];
  /** 消息流列表 */
  messageFlows?: MessageFlowDefinition[];
}

/** 参与者定义 */
export interface ParticipantDefinition {
  /** 参与者 ID */
  id: string;
  /** 参与者名称 */
  name?: string;
  /** 流程引用 */
  processRef?: string;
}

/** 消息流定义 */
export interface MessageFlowDefinition {
  /** 消息流 ID */
  id: string;
  /** 源引用 */
  sourceRef: string;
  /** 目标引用 */
  targetRef: string;
  /** 消息引用 */
  messageRef?: string;
}

/** 泳道定义 */
export interface LaneDefinition {
  /** 泳道 ID */
  id: string;
  /** 泳道名称 */
  name?: string;
  /** 节点引用 */
  flowNodeRef?: string[];
  /** 子泳道 */
  childLaneSet?: LaneDefinition[];
}

/** 流程实例状态 */
export type ProcessInstanceStatus =
  | 'pending'     // 待启动
  | 'running'     // 运行中
  | 'waiting'     // 等待输入
  | 'suspended'   // 已暂停
  | 'completed'   // 已完成
  | 'rejected'    // 已驳回
  | 'cancelled'   // 已取消
  | 'terminated'  // 已终止
  | 'failed';     // 执行失败

/** 流程实例 */
export interface ProcessInstance {
  /** 实例 ID */
  id: string;
  /** 流程定义 ID */
  processDefinitionId: string;
  /** 流程定义版本 */
  processDefinitionVersion: number;
  /** 业务键 */
  businessKey?: string;
  /** 实例状态 */
  status: ProcessInstanceStatus;
  /** 当前节点 */
  currentNodeId?: string;
  /** 变量 */
  variables: Record<string, unknown>;
  /** 发起人 ID */
  startedBy: string;
  /** 发起人名称 */
  startedByName?: string;
  /** 开始时间 */
  startedAt: string;
  /** 结束时间 */
  endedAt?: string;
  /** 父实例 ID（子流程） */
  parentInstanceId?: string;
  /** 根实例 ID */
  rootInstanceId?: string;
}

/** 任务状态 */
export type TaskStatus =
  | 'pending'      // 待处理
  | 'completed'    // 已完成
  | 'rejected'     // 已驳回
  | 'transferred'  // 已转办
  | 'cancelled'    // 已取消
  | 'timeout';     // 已超时

/** 审批任务 */
export interface ApprovalTask {
  /** 任务 ID */
  id: string;
  /** 流程实例 ID */
  instanceId: string;
  /** 节点 ID */
  nodeId: string;
  /** 节点名称 */
  nodeName?: string;
  /** 任务状态 */
  status: TaskStatus;
  /** 审批人 ID */
  assigneeId?: string;
  /** 审批人名称 */
  assigneeName?: string;
  /** 候选用户 */
  candidateUsers?: string[];
  /** 候选组 */
  candidateGroups?: string[];
  /** 表单数据 */
  formData?: Record<string, unknown>;
  /** 审批意见 */
  comment?: string;
  /** 截止时间 */
  dueDate?: string;
  /** 完成时间 */
  completedAt?: string;
  /** 创建时间 */
  createdAt: string;
}

/** 快照类型 */
export type SnapshotType =
  | 'INITIAL'        // 初始快照
  | 'NODE_COMPLETE'  // 节点完成
  | 'NODE_REJECT'    // 节点驳回
  | 'FINAL'          // 终态快照
  | 'TERMINATED';    // 终止快照

/** 流程快照 */
export interface WorkflowSnapshot {
  /** 快照 ID */
  id: string;
  /** 流程实例 ID */
  instanceId: string;
  /** 节点 ID */
  nodeId?: string;
  /** 节点名称 */
  nodeName?: string;
  /** 业务记录 ID */
  sourceId: string;
  /** 业务表名 */
  sourceTable: string;
  /** 快照数据 */
  data: Record<string, unknown>;
  /** 变更字段 */
  changedFields?: Record<string, FieldChange>;
  /** 快照类型 */
  snapshotType: SnapshotType;
  /** 操作人 ID */
  operatorId?: string;
  /** 操作人名称 */
  operatorName?: string;
  /** 操作备注 */
  comment?: string;
  /** 创建时间 */
  createdAt: string;
}

/** 字段变更 */
export interface FieldChange {
  /** 变更前 */
  from: unknown;
  /** 变更后 */
  to: unknown;
}

/** 子表单变更 */
export interface SubFormChange {
  /** 变更类型 */
  type: 'subform';
  /** 变更列表 */
  changes: SubFormChangeItem[];
}

/** 子表单变更项 */
export interface SubFormChangeItem {
  /** 操作类型 */
  action: 'add' | 'update' | 'delete';
  /** 行索引 */
  index: number;
  /** 字段名（update 时） */
  field?: string;
  /** 变更前（update/delete 时） */
  from?: unknown;
  /** 变更后（update/add 时） */
  to?: unknown;
  /** 完整行数据（add 时） */
  value?: Record<string, unknown>;
}

/** 流程定义版本 */
export interface ProcessDefinitionVersion {
  /** 版本 ID */
  id: string;
  /** 流程标识 */
  processKey: string;
  /** 版本号 */
  version: number;
  /** 版本名称 */
  name?: string;
  /** 流程定义 */
  definition: BpmnDocument;
  /** 状态 */
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  /** 创建人 */
  createdBy: string;
  /** 创建时间 */
  createdAt: string;
  /** 发布时间 */
  publishedAt?: string;
}

/** 条件表达式类型 */
export type ConditionType = 'expression' | 'always' | 'default';

/** 条件表达式 */
export interface ConditionExpression {
  /** 条件类型 */
  type: ConditionType;
  /** 表达式（type=expression 时） */
  expression?: string;
  /** 描述 */
  description?: string;
}
