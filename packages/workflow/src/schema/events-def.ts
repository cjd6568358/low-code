/**
 * BPMN 2.0 事件定义类型
 */

import type { BaseElement, FormalExpression } from './base';

/** 事件定义基类 */
export interface EventDefinition extends BaseElement {
  // 事件定义基类
}

/** 取消事件定义 */
export interface CancelEventDefinition extends EventDefinition {
  $type: 'bpmn:CancelEventDefinition';
}

/** 终止事件定义 */
export interface TerminateEventDefinition extends EventDefinition {
  $type: 'bpmn:TerminateEventDefinition';
}

/** 错误事件定义 */
export interface ErrorEventDefinition extends EventDefinition {
  $type: 'bpmn:ErrorEventDefinition';
  /** 错误引用 */
  errorRef?: string;
}

/** 错误元素 */
export interface Error extends BaseElement {
  $type: 'bpmn:Error';
  /** 错误码 */
  errorCode?: string;
  /** 错误名称 */
  name?: string;
  /** 结构引用 */
  structureRef?: string;
}

/** 升级事件定义 */
export interface EscalationEventDefinition extends EventDefinition {
  $type: 'bpmn:EscalationEventDefinition';
  /** 升级引用 */
  escalationRef?: string;
}

/** 升级元素 */
export interface Escalation extends BaseElement {
  $type: 'bpmn:Escalation';
  /** 升级码 */
  escalationCode?: string;
  /** 升级名称 */
  name?: string;
  /** 结构引用 */
  structureRef?: string;
}

/** 补偿事件定义 */
export interface CompensateEventDefinition extends EventDefinition {
  $type: 'bpmn:CompensateEventDefinition';
  /** 活动引用 */
  activityRef?: string;
  /** 是否等待完成 */
  waitForCompletion?: boolean;
}

/** 定时器事件定义 */
export interface TimerEventDefinition extends EventDefinition {
  $type: 'bpmn:TimerEventDefinition';
  /** 时间日期（绝对时间） */
  timeDate?: FormalExpression;
  /** 时间持续（相对时间，ISO 8601 Duration） */
  timeDuration?: FormalExpression;
  /** 时间周期（重复间隔） */
  timeCycle?: FormalExpression;
}

/** 条件事件定义 */
export interface ConditionalEventDefinition extends EventDefinition {
  $type: 'bpmn:ConditionalEventDefinition';
  /** 条件表达式 */
  condition: FormalExpression;
}

/** 信号事件定义 */
export interface SignalEventDefinition extends EventDefinition {
  $type: 'bpmn:SignalEventDefinition';
  /** 信号引用 */
  signalRef?: string;
}

/** 信号元素 */
export interface Signal extends BaseElement {
  $type: 'bpmn:Signal';
  /** 信号名称 */
  name?: string;
  /** 结构引用 */
  structureRef?: string;
}

/** 消息事件定义 */
export interface MessageEventDefinition extends EventDefinition {
  $type: 'bpmn:MessageEventDefinition';
  /** 消息引用 */
  messageRef?: string;
  /** 操作引用 */
  operationRef?: string;
}

/** 消息元素 */
export interface Message extends BaseElement {
  $type: 'bpmn:Message';
  /** 消息名称 */
  name?: string;
  /** 结构引用 */
  structureRef?: string;
}

/** 链接事件定义 */
export interface LinkEventDefinition extends EventDefinition {
  $type: 'bpmn:LinkEventDefinition';
  /** 链接名称 */
  name?: string;
  /** 目标链接引用 */
  target?: string;
  /** 源链接引用 */
  source?: string[];
}

/** 多实例事件定义（非标准，用于审批场景） */
export interface MultipleEventDefinition extends EventDefinition {
  $type: 'bpmn:MultipleEventDefinition';
  /** 是否并行 */
  parallel?: boolean;
  /** 事件定义列表 */
  eventDefinitions?: EventDefinition[];
}
