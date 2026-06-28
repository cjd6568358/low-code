/**
 * 任务相关类型定义
 */

import type { TaskStatus } from '@low-code/workflow-bpmn';

/** 任务类型 */
export type TaskType =
  | 'approval'     // 审批任务
  | 'fill_form'    // 填写表单
  | 'cc'           // 抄送
  | 'notify';      // 通知

/** 审批模式 */
export type ApprovalMode = 'single' | 'countersign' | 'orSign';

/** 驳回动作 */
export type RejectAction =
  | 'rejectToStart'      // 驳回到发起人
  | 'rejectToPrevious'   // 驳回到上一节点
  | 'rejectToNode'       // 驳回到指定节点
  | 'rejectToEnd';       // 直接结束流程

/** 任务创建参数 */
export interface CreateTaskParams {
  /** 实例 ID */
  instanceId: string;
  /** 节点 ID */
  nodeId: string;
  /** 节点名称 */
  nodeName?: string;
  /** 任务类型 */
  taskType: TaskType;
  /** 审批模式 */
  approvalMode?: ApprovalMode;
  /** 审批人 ID */
  assigneeId?: string;
  /** 审批人名称 */
  assigneeName?: string;
  /** 候选用户 */
  candidateUsers?: string[];
  /** 候选组 */
  candidateGroups?: string[];
  /** 截止时间 */
  dueDate?: string;
  /** 表单数据 */
  formData?: Record<string, unknown>;
  /** 优先级 */
  priority?: number;
}

/** 任务查询参数 */
export interface TaskQueryParams {
  /** 实例 ID */
  instanceId?: string;
  /** 审批人 ID */
  assigneeId?: string;
  /** 候选用户 */
  candidateUserId?: string;
  /** 候选组 */
  candidateGroup?: string;
  /** 任务状态 */
  status?: TaskStatus | TaskStatus[];
  /** 任务类型 */
  taskType?: TaskType;
  /** 页码 */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/** 任务列表结果 */
export interface TaskListResult {
  /** 任务列表 */
  tasks: TaskDetail[];
  /** 总数 */
  total: number;
  /** 页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
}

/** 任务详情 */
export interface TaskDetail {
  /** 任务 ID */
  id: string;
  /** 实例 ID */
  instanceId: string;
  /** 节点 ID */
  nodeId: string;
  /** 节点名称 */
  nodeName?: string;
  /** 任务类型 */
  taskType: TaskType;
  /** 审批模式 */
  approvalMode?: ApprovalMode;
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
  /** 是否超时 */
  isOverdue?: boolean;
  /** 完成时间 */
  completedAt?: string;
  /** 创建时间 */
  createdAt: string;
  /** 流程信息 */
  processInfo?: {
    workflowKey: string;
    workflowName?: string;
    sourceTable?: string;
    sourceId?: string;
    initiatorName?: string;
  };
}

/** 任务操作历史 */
export interface TaskOperationHistory {
  /** 操作 ID */
  id: string;
  /** 任务 ID */
  taskId: string;
  /** 操作类型 */
  operation: 'create' | 'claim' | 'complete' | 'reject' | 'transfer' | 'addSign' | 'cancel';
  /** 操作人 ID */
  operatorId: string;
  /** 操作人名称 */
  operatorName?: string;
  /** 操作时间 */
  operatedAt: string;
  /** 操作备注 */
  comment?: string;
  /** 操作数据 */
  data?: Record<string, unknown>;
}

/** 会签状态 */
export interface CountersignState {
  /** 总需审批数 */
  totalCount: number;
  /** 已完成数 */
  completedCount: number;
  /** 已驳回数 */
  rejectedCount: number;
  /** 审批规则 */
  rule: 'all' | 'majority' | 'any';
  /** 是否完成 */
  isCompleted: boolean;
  /** 最终结果 */
  result?: 'approved' | 'rejected';
}

/** 或签状态 */
export interface OrSignState {
  /** 是否有人审批 */
  hasApproval: boolean;
  /** 审批人 */
  approvedBy?: string;
  /** 审批时间 */
  approvedAt?: string;
}

/** 超时配置 */
export interface TimeoutConfig {
  /** 超时时长（毫秒） */
  duration: number;
  /** 超时动作 */
  action: 'autoApprove' | 'autoReject' | 'notify' | 'transfer';
  /** 超时通知人 */
  notifyUsers?: string[];
  /** 超时转办人 */
  transferTo?: string;
  /** 提前提醒时间（毫秒） */
  remindBefore?: number;
}

/** 审批人选择配置 */
export interface AssigneeSelection {
  /** 选择方式 */
  mode: 'manual' | 'expression' | 'role' | 'department' | 'initiator';
  /** 表达式 */
  expression?: string;
  /** 角色 ID */
  roleId?: string;
  /** 部门 ID */
  departmentId?: string;
  /** 是否包含发起人 */
  includeInitiator?: boolean;
  /** 排除用户 */
  excludeUsers?: string[];
}
