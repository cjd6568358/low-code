/**
 * @low-code/workflow-bpmn
 * BPMN 2.0 JSON Schema 类型定义包
 */

// Schema 类型
export * from './schema/base';
export * from './schema/events';
export * from './schema/events-def';
export * from './schema/tasks';
export * from './schema/gateways';
export * from './schema/flows';
export * from './schema/extensions';
export * from './schema/process';

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
  generateId,
  createEmptyBpmnDocument,
  cloneBpmnDocument,
  mergeBpmnDocuments,
} from './utils/serializer';
