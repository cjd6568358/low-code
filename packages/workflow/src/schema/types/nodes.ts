/**
 * BPMN 节点联合类型
 */

import type { StartEvent, EndEvent, BoundaryEvent, IntermediateCatchEvent, IntermediateThrowEvent } from '../schema/events';
import type { UserTask, ServiceTask, ScriptTask, ManualTask, SendTask, ReceiveTask, BusinessRuleTask, CallActivity, SubProcess } from '../schema/tasks';
import type { ExclusiveGateway, ParallelGateway, InclusiveGateway, EventBasedGateway, ComplexGateway } from '../schema/gateways';
import type { SequenceFlow, MessageFlow } from '../schema/flows';

/** 所有流程节点类型 */
export type FlowNode =
  | StartEvent
  | EndEvent
  | BoundaryEvent
  | IntermediateCatchEvent
  | IntermediateThrowEvent
  | UserTask
  | ServiceTask
  | ScriptTask
  | ManualTask
  | SendTask
  | ReceiveTask
  | BusinessRuleTask
  | CallActivity
  | SubProcess
  | ExclusiveGateway
  | ParallelGateway
  | InclusiveGateway
  | EventBasedGateway
  | ComplexGateway;

/** 所有连线类型 */
export type Edge = SequenceFlow | MessageFlow;

/** 节点类型枚举 */
export type FlowNodeType =
  | 'bpmn:StartEvent'
  | 'bpmn:EndEvent'
  | 'bpmn:BoundaryEvent'
  | 'bpmn:IntermediateCatchEvent'
  | 'bpmn:IntermediateThrowEvent'
  | 'bpmn:UserTask'
  | 'bpmn:ServiceTask'
  | 'bpmn:ScriptTask'
  | 'bpmn:ManualTask'
  | 'bpmn:SendTask'
  | 'bpmn:ReceiveTask'
  | 'bpmn:BusinessRuleTask'
  | 'bpmn:CallActivity'
  | 'bpmn:SubProcess'
  | 'bpmn:ExclusiveGateway'
  | 'bpmn:ParallelGateway'
  | 'bpmn:InclusiveGateway'
  | 'bpmn:EventBasedGateway'
  | 'bpmn:ComplexGateway';

/** 任务节点类型 */
export type TaskNodeType =
  | 'bpmn:UserTask'
  | 'bpmn:ServiceTask'
  | 'bpmn:ScriptTask'
  | 'bpmn:ManualTask'
  | 'bpmn:SendTask'
  | 'bpmn:ReceiveTask'
  | 'bpmn:BusinessRuleTask';

/** 网关节点类型 */
export type GatewayNodeType =
  | 'bpmn:ExclusiveGateway'
  | 'bpmn:ParallelGateway'
  | 'bpmn:InclusiveGateway'
  | 'bpmn:EventBasedGateway'
  | 'bpmn:ComplexGateway';

/** 事件节点类型 */
export type EventNodeType =
  | 'bpmn:StartEvent'
  | 'bpmn:EndEvent'
  | 'bpmn:BoundaryEvent'
  | 'bpmn:IntermediateCatchEvent'
  | 'bpmn:IntermediateThrowEvent';

/** 类型守卫：是否为任务节点 */
export function isTaskNode(node: FlowNode): node is UserTask | ServiceTask | ScriptTask | ManualTask | SendTask | ReceiveTask | BusinessRuleTask {
  return node.$type.endsWith('Task');
}

/** 类型守卫：是否为用户任务（审批节点） */
export function isUserTask(node: FlowNode): node is UserTask {
  return node.$type === 'bpmn:UserTask';
}

/** 类型守卫：是否为网关节点 */
export function isGateway(node: FlowNode): node is ExclusiveGateway | ParallelGateway | InclusiveGateway | EventBasedGateway | ComplexGateway {
  return node.$type.endsWith('Gateway');
}

/** 类型守卫：是否为排他网关 */
export function isExclusiveGateway(node: FlowNode): node is ExclusiveGateway {
  return node.$type === 'bpmn:ExclusiveGateway';
}

/** 类型守卫：是否为并行网关 */
export function isParallelGateway(node: FlowNode): node is ParallelGateway {
  return node.$type === 'bpmn:ParallelGateway';
}

/** 类型守卫：是否为包含网关 */
export function isInclusiveGateway(node: FlowNode): node is InclusiveGateway {
  return node.$type === 'bpmn:InclusiveGateway';
}

/** 类型守卫：是否为事件节点 */
export function isEvent(node: FlowNode): node is StartEvent | EndEvent | BoundaryEvent | IntermediateCatchEvent | IntermediateThrowEvent {
  return node.$type.endsWith('Event');
}

/** 类型守卫：是否为开始事件 */
export function isStartEvent(node: FlowNode): node is StartEvent {
  return node.$type === 'bpmn:StartEvent';
}

/** 类型守卫：是否为结束事件 */
export function isEndEvent(node: FlowNode): node is EndEvent {
  return node.$type === 'bpmn:EndEvent';
}

/** 类型守卫：是否为边界事件 */
export function isBoundaryEvent(node: FlowNode): node is BoundaryEvent {
  return node.$type === 'bpmn:BoundaryEvent';
}

/** 类型守卫：是否为子流程 */
export function isSubProcess(node: FlowNode): node is SubProcess {
  return node.$type === 'bpmn:SubProcess';
}

/** 类型守卫：是否为调用活动 */
export function isCallActivity(node: FlowNode): node is CallActivity {
  return node.$type === 'bpmn:CallActivity';
}

/** 类型守卫：是否为连线 */
export function isSequenceFlow(edge: Edge): edge is SequenceFlow {
  return edge.$type === 'bpmn:SequenceFlow';
}

/** 类型守卫：是否为消息流 */
export function isMessageFlow(edge: Edge): edge is MessageFlow {
  return edge.$type === 'bpmn:MessageFlow';
}

/** 创建节点工厂函数参数 */
export interface CreateNodeParams {
  /** 节点 ID */
  id: string;
  /** 节点名称 */
  name?: string;
  /** 节点类型 */
  type: FlowNodeType;
  /** 入口连线 */
  incoming?: string[];
  /** 出口连线 */
  outgoing?: string[];
}

/** 创建连线工厂函数参数 */
export interface CreateEdgeParams {
  /** 连线 ID */
  id: string;
  /** 连线名称 */
  name?: string;
  /** 连线类型 */
  type: 'bpmn:SequenceFlow' | 'bpmn:MessageFlow';
  /** 源节点 */
  sourceRef: string;
  /** 目标节点 */
  targetRef: string;
  /** 条件表达式（仅 SequenceFlow） */
  conditionExpression?: string;
}
