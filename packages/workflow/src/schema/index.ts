/**
 * @low-code/workflow/schema
 * BPMN 2.0 JSON Schema 类型定义
 * 原 @low-code/workflow-bpmn 包合并至此
 */

// Schema 类型
export * from './base';
export * from './events';
export * from './events-def';
export * from './tasks';
export * from './gateways';
export * from './flows';
export * from './extensions';
export * from './process';

// 业务类型（排除与 schema 重复的类型）
export type {
  BpmnDocument,
  ProcessDefinition,
  CollaborationDefinition,
  ParticipantDefinition,
  MessageFlowDefinition,
  LaneDefinition,
  ProcessInstanceStatus,
  ProcessInstance,
  TaskStatus,
  ApprovalTask,
  SnapshotType,
  WorkflowSnapshot,
  FieldChange,
  SubFormChange,
  SubFormChangeItem,
  ProcessDefinitionVersion,
  ConditionType,
  ConditionExpression,
} from './types/bpmn';

export type {
  FlowNode,
  Edge,
  FlowNodeType,
  TaskNodeType,
  GatewayNodeType,
  EventNodeType,
  CreateNodeParams,
  CreateEdgeParams,
} from './types/nodes';

export {
  isTaskNode,
  isUserTask,
  isGateway,
  isExclusiveGateway,
  isParallelGateway,
  isInclusiveGateway,
  isEvent,
  isStartEvent,
  isEndEvent,
  isBoundaryEvent,
  isSubProcess,
  isCallActivity,
  isSequenceFlow,
  isMessageFlow,
  // 数据操作任务类型守卫
  isDataOperationTask,
  isCreateTask,
  isUpdateTask,
  isQueryTask,
  isDeleteTask,
} from './types/nodes';

export type {
  ConditionOperator,
  LogicalOperator,
  ConditionExpr,
  ComparisonCondition,
  LogicalCondition,
  FunctionCondition,
  CustomCondition,
  ConditionContext,
  ConditionResult,
  ConditionParser,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './types/conditions';

export {
  ALWAYS_CONDITION,
  DEFAULT_CONDITION,
  OPERATOR_LABELS,
  LOGICAL_OPERATOR_LABELS,
} from './types/conditions';

// 工具函数
export {
  validateBpmnDocument,
  validateProcessDefinition,
  validateCycles,
  validateNestingDepth,
} from './utils/validator';

export type { ValidateOptions } from './utils/validator';

export {
  serializeBpmnDocument,
  deserializeBpmnDocument,
  normalizeBpmnDocument,
  toStandardBpmn,
  createEmptyBpmnDocument,
  cloneBpmnDocument,
  mergeBpmnDocuments,
} from './utils/serializer';

// 重新导出共享工具（原 workflow-bpmn 从 @low-code/shared 导入）
export { generateHexId } from '@low-code/shared';
