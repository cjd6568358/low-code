/**
 * 流程执行上下文类型定义
 */

import type {
  FlowNode,
  Edge,
  BpmnDocument,
  ProcessDefinition,
  ApprovalTask,
  WorkflowSnapshot,
} from '@low-code/workflow-bpmn';
import type { InstanceRecord, TaskRecord, SnapshotRecord, CheckpointRecord } from './engine';

/** 执行上下文 */
export interface ExecutionContext {
  /** 流程实例 */
  instance: InstanceRecord;
  /** 流程定义 */
  definition: ProcessDefinition;
  /** 当前节点 */
  currentNode: FlowNode;
  /** 当前快照 */
  snapshot?: SnapshotRecord;
  /** 流程变量 */
  variables: Record<string, unknown>;
  /** 操作人信息 */
  operator?: OperatorInfo;
  /** 发起人信息 */
  initiator?: OperatorInfo;
  /** 节点表单数据 */
  formData?: Record<string, unknown>;
}

/** 操作人信息 */
export interface OperatorInfo {
  id: string;
  name: string;
  roles?: string[];
  departments?: string[];
}

/** 执行结果 */
export interface ExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 下一步节点列表 */
  nextNodes?: NextNodeInfo[];
  /** 需要创建的任务 */
  tasks?: TaskCreateParams[];
  /** 需要捕获的快照 */
  snapshot?: SnapshotCaptureParams;
  /** 更新的变量 */
  variableUpdates?: Record<string, unknown>;
  /** 错误信息 */
  error?: string;
  /** 是否等待外部输入 */
  waiting?: boolean;
  /** 是否结束流程 */
  completed?: boolean;
}

/** 下一步节点信息 */
export interface NextNodeInfo {
  /** 目标节点 */
  node: FlowNode;
  /** 连线 */
  edge: Edge;
  /** 条件表达式 */
  conditionExpression?: string;
}

/** 任务创建参数 */
export interface TaskCreateParams {
  /** 节点 ID */
  nodeId: string;
  /** 节点名称 */
  nodeName?: string;
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
}

/** 快照捕获参数 */
export interface SnapshotCaptureParams {
  /** 快照类型 */
  snapshotType: 'INITIAL' | 'NODE_COMPLETE' | 'NODE_REJECT' | 'FINAL' | 'TERMINATED';
  /** 节点 ID */
  nodeId?: string;
  /** 节点名称 */
  nodeName?: string;
  /** 数据 */
  data: Record<string, unknown>;
  /** 操作人 ID */
  operatorId?: string;
  /** 操作人名称 */
  operatorName?: string;
  /** 备注 */
  comment?: string;
}

/** 节点执行器接口 */
export interface NodeExecutor {
  /** 执行节点 */
  execute(context: ExecutionContext): Promise<ExecutionResult>;
  /** 判断是否可以推进 */
  canAdvance(context: ExecutionContext): Promise<boolean>;
  /** 获取节点配置 */
  getNodeConfig(node: FlowNode): NodeConfig;
}

/** 节点配置 */
export interface NodeConfig {
  /** 节点类型 */
  type: string;
  /** 是否需要等待 */
  waitForInput: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 重试间隔（毫秒） */
  retryInterval?: number;
}

/** 网关执行结果 */
export interface GatewayExecutionResult extends ExecutionResult {
  /** 选中的分支 */
  selectedBranches: string[];
  /** 并行分支 ID 列表 */
  parallelBranches?: string[];
  /** 等待汇聚的分支数 */
  pendingBranchCount?: number;
}

/** 审批执行结果 */
export interface ApprovalExecutionResult extends ExecutionResult {
  /** 创建的任务 */
  task: TaskRecord;
  /** 审批模式 */
  approvalMode: 'single' | 'countersign' | 'orSign';
  /** 需要的审批数 */
  requiredApprovals?: number;
  /** 已完成的审批数 */
  completedApprovals?: number;
}

/** 流程状态机状态 */
export type ProcessState =
  | 'created'      // 已创建
  | 'running'      // 运行中
  | 'waiting'      // 等待输入
  | 'suspended'    // 已暂停
  | 'completed'    // 已完成
  | 'rejected'     // 已驳回
  | 'cancelled'    // 已取消
  | 'terminated'   // 已终止
  | 'failed';      // 执行失败

/** 状态转换 */
export interface StateTransition {
  /** 源状态 */
  from: ProcessState;
  /** 目标状态 */
  to: ProcessState;
  /** 触发事件 */
  event: string;
  /** 守卫条件 */
  guard?: (context: ExecutionContext) => boolean;
  /** 动作 */
  action?: (context: ExecutionContext) => Promise<void>;
}

/** 执行路径 */
export interface ExecutionPath {
  /** 路径 ID */
  id: string;
  /** 实例 ID */
  instanceId: string;
  /** 节点序列 */
  nodeIds: string[];
  /** 当前节点索引 */
  currentIndex: number;
  /** 是否为并行分支 */
  isParallel: boolean;
  /** 父路径 ID */
  parentPathId?: string;
}

/** 并行分支状态 */
export interface ParallelBranchState {
  /** 分支 ID */
  branchId: string;
  /** 网关节点 ID */
  gatewayNodeId: string;
  /** 活跃分支列表 */
  activeBranches: string[];
  /** 已完成分支列表 */
  completedBranches: string[];
  /** 等待汇聚 */
  waitingForJoin: boolean;
}
