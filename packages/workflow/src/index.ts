/**
 * @low-code/workflow
 * 流程引擎核心包
 */

// 引擎主类
export { WorkflowEngine, WorkflowError, WorkflowErrorCode } from './engine/WorkflowEngine';

// 状态机
export { StateMachine } from './engine/StateMachine';
export type { StateMachineEvent } from './engine/StateMachine';

// 表达式求值器
export {
  ConditionExpressionEvaluator,
  SimpleConditionEvaluator,
  ExpressionParseError,
} from './engine/ExpressionEvaluator';

// 快照引擎
export { SnapshotEngine } from './snapshot/SnapshotEngine';
export type { SnapshotQueryParams, SnapshotStats } from './snapshot/SnapshotEngine';

// 恢复管理器
export { RecoveryManager } from './recovery/RecoveryManager';
export type {
  RecoveryStatus,
  RecoveryRecord,
  RecoveryStrategy,
  RecoveryConfig,
} from './recovery/RecoveryManager';

// 节点执行器
export { NodeExecutorBase } from './executors/NodeExecutorBase';
export { StartEventExecutor } from './executors/StartEventExecutor';
export { EndEventExecutor } from './executors/EndEventExecutor';
export { UserTaskExecutor } from './executors/UserTaskExecutor';
export { GatewayExecutor } from './executors/GatewayExecutor';
export { TimerExecutor } from './executors/TimerExecutor';
export { ServiceTaskExecutor } from './executors/ServiceTaskExecutor';

// 类型定义
export type {
  // 引擎配置
  WorkflowEngineConfig,
  DatabaseAdapter,
  SnapshotService,
  CaptureSnapshotParams,
  SnapshotRecord,
  SnapshotDiff,
  FieldChange,
  NotifyService,
  NotifyParams,
  ExpressionEvaluator,
  EvaluationContext,

  // 流程实例
  InstanceRecord,
  CheckpointRecord,
  TaskRecord,
  DefinitionRecord,

  // 操作参数
  StartParams,
  CompleteParams,
  RejectParams,
  TerminateParams,
  TransferParams,
  AddSignParams,
} from './types/engine';

export type {
  // 执行上下文
  ExecutionContext,
  OperatorInfo,
  ExecutionResult,
  NextNodeInfo,
  TaskCreateParams,
  SnapshotCaptureParams,
  NodeExecutor,
  NodeConfig,
  GatewayExecutionResult,
  ApprovalExecutionResult,
  ProcessState,
  StateTransition,
  ExecutionPath,
  ParallelBranchState,
} from './types/execution';

export type {
  // 任务类型
  TaskType,
  ApprovalMode,
  RejectAction,
  CreateTaskParams,
  TaskQueryParams,
  TaskListResult,
  TaskDetail,
  TaskOperationHistory,
  CountersignState,
  OrSignState,
  TimeoutConfig,
  AssigneeSelection,
} from './types/task';
