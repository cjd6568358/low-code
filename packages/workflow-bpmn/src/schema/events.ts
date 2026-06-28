/**
 * BPMN 2.0 事件类型定义
 */

import type {
  FlowNodeBase,
  BaseElement,
  InputSet,
  OutputSet,
  DataInputAssociation,
  DataOutputAssociation,
} from './base';
import type { EventDefinition } from './events-def';

/** 事件基类 */
export interface Event extends FlowNodeBase {
  // 事件基类，继承 FlowNodeBase
}

/** 抛出事件基类 */
export interface ThrowEvent extends Event {
  /** 输入集 */
  inputSet?: InputSet;
  /** 数据输入关联 */
  dataInputAssociation?: DataInputAssociation[];
  /** 事件定义 */
  eventDefinitions?: EventDefinition[];
  /** 事件定义引用 */
  eventDefinitionRefs?: string[];
}

/** 捕获事件基类 */
export interface CatchEvent extends Event {
  /** 输出集 */
  outputSet?: OutputSet;
  /** 数据输出关联 */
  dataOutputAssociation?: DataOutputAssociation[];
  /** 事件定义 */
  eventDefinitions?: EventDefinition[];
  /** 事件定义引用 */
  eventDefinitionRefs?: string[];
  /** 是否并行多实例 */
  parallelMultiple?: boolean;
}

/** 开始事件 */
export interface StartEvent extends CatchEvent {
  $type: 'bpmn:StartEvent';
  /** 是否中断子流程 */
  isInterrupting?: boolean;
}

/** 结束事件 */
export interface EndEvent extends ThrowEvent {
  $type: 'bpmn:EndEvent';
}

/** 中间捕获事件 */
export interface IntermediateCatchEvent extends CatchEvent {
  $type: 'bpmn:IntermediateCatchEvent';
}

/** 中间抛出事件 */
export interface IntermediateThrowEvent extends ThrowEvent {
  $type: 'bpmn:IntermediateThrowEvent';
}

/** 边界事件 */
export interface BoundaryEvent extends CatchEvent {
  $type: 'bpmn:BoundaryEvent';
  /** 附加到的活动节点 */
  attachedToRef: string;
  /** 是否中断附加活动 */
  cancelActivity?: boolean;
}
